from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Infrastructure
    redis_url: str                          # from render.yaml REDIS_URL
    supabase_url: str
    supabase_service_role_key: str          # Service role — never the anon key
    supabase_storage_bucket_audio: str = "user-audio"
    supabase_storage_bucket_karaoke: str = "karaoke-assets"
    internal_service_token: str             # Shared secret with voice-api

    # Feature flags (mirror render.yaml)
    feature_karaoke_mode: bool = False

    # Model config
    demucs_model: str = "htdemucs"         # "htdemucs_ft" for higher quality on GPU
    whisper_model: str = "tiny"             # tiny=39MB; "base" for better accuracy
    crepe_model: str = "tiny"               # tiny=6MB; "full" for higher accuracy
    use_crepe: bool = False                 # pYIN by default; CREPE opt-in per job

    # Quality gates
    min_voiced_frame_ratio: float = 0.3    # Abort scoring if < 30% frames are voiced
    max_rms_db_clipping: float = -0.5      # Above this = clipping
    min_rms_db_signal: float = -50.0       # Below this = too quiet

    # Processing
    sample_rate: int = 44100
    hop_length: int = 512                   # ~11.6ms at 44100Hz
    frame_length: int = 2048
    pyin_fmin: float = 65.0                # C2 — below comfortable bass range
    pyin_fmax: float = 1047.0             # C6 — above comfortable soprano range

settings = Settings()