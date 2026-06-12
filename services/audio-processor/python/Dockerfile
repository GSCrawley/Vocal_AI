FROM python:3.11-slim

# System deps for librosa, soundfile, parselmouth
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .

# Upgrade build tools first
RUN pip install --no-cache-dir -U pip "setuptools<70" wheel

# Install requirements with no build isolation
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Pre-warm model caches during build (avoids cold-start timeout)
RUN python -c "import whisper; whisper.load_model('tiny')"
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY . .

# Default: FastAPI process
# Override CMD in render.yaml for worker process
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
