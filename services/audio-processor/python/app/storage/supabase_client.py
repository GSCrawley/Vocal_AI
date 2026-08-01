from supabase import create_client, Client
from app.config import settings
import httpx
import urllib.parse
import ipaddress
import socket

_client: Client = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _client


def validate_url_safe(url: str) -> None:
    """
    Validates that a URL is safe to download from.
    Prevents SSRF by checking against private, loopback, and link-local IP addresses.
    Expects audio_url to be a Supabase Storage URL.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must use http or https scheme")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must contain a hostname")

    # 1. Enforce a host allow-list: must match the Supabase URL host
    supabase_parsed = urllib.parse.urlparse(settings.supabase_url)
    allowed_host = supabase_parsed.hostname
    if hostname != allowed_host:
        raise ValueError(
            f"URL hostname '{hostname}' is not allowed. Must match Supabase host '{allowed_host}'."
        )

    # 2. Resolve ALL addresses and reject if ANY is forbidden
    try:
        # Resolve all IPv4 and IPv6 addresses
        addr_infos = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise ValueError(f"Could not resolve hostname: {hostname}")

    for info in addr_infos:
        # info structure: (family, type, proto, canonname, sockaddr)
        ip_addr = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_addr)
        except ValueError:
            raise ValueError(f"Invalid IP address resolved from hostname: {hostname}")

        # Check for private, loopback, link-local, multicast, reserved
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or str(ip) == "0.0.0.0"
            or str(ip) == "255.255.255.255"
            # Explicit check for AWS metadata endpoint just in case
            or str(ip) == "169.254.169.254"
        ):
            raise ValueError(f"URL resolves to a forbidden IP address: {ip}")


def download_file(url: str) -> bytes:
    """Download audio from a Supabase signed URL."""
    validate_url_safe(url)
    response = httpx.get(url, timeout=60.0)
    response.raise_for_status()
    return response.content


def upload_file(
    data: bytes,
    bucket: str,
    path: str,
    content_type: str = "audio/wav",
    ttl_hours: int = None,
) -> str:
    """
    Upload bytes to Supabase Storage.
    Returns a signed URL valid for 7 days (604800 seconds).

    ttl_hours: if set, adds x-upsert metadata for retention cron.
    """
    client = get_client()
    client.storage.from_(bucket).upload(
        path=path,
        file=data,
        file_options={
            "content-type": content_type,
            "upsert": "true",
            **({"x-metadata-ttl-hours": str(ttl_hours)} if ttl_hours else {}),
        },
    )
    # Generate a signed URL
    signed = client.storage.from_(bucket).create_signed_url(path, 604800)
    return signed["signedURL"]
