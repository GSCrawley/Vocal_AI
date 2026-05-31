from supabase import create_client, Client
from app.config import settings
import httpx

_client: Client = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client

def download_file(url: str) -> bytes:
    """Download audio from a Supabase signed URL."""
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