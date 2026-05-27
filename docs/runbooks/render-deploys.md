# Render Deployments & Secrets Management

## Overview
This runbook covers the required environment variables for the VOICE services and how to recover from deployment failures related to missing secrets.

Our infrastructure is defined in `render.yaml`. Non-secret configuration is stored in the `voice-shared-env` Environment Group, which is checked into version control via the `render.yaml` file. Secrets are declared in the `voice-secrets` Environment Group and must be manually populated in the Render Dashboard.

## Required Secrets by Service

### `voice-api` (Node.js Fastify)
Requires the following secrets from `voice-secrets`:
* `SUPABASE_URL` - Supabase project URL
* `SUPABASE_ANON_KEY` - Supabase anonymous key
* `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin tasks
* `DATABASE_URL` - Direct Postgres connection URL
* `REDIS_URL` - Injected via Render from the `voice-redis` service
* `INTERNAL_SERVICE_TOKEN` - Shared secret for inter-service communication
* `OPENAI_API_KEY` - OpenAI API Key
* `DEEPGRAM_API_KEY` - Deepgram API Key
* `ELEVENLABS_API_KEY` - ElevenLabs API Key

### `voice-audio-processor` (Python FastAPI)
Requires the following secrets from `voice-secrets`:
* `SUPABASE_URL` - Supabase project URL
* `SUPABASE_ANON_KEY` - Supabase anonymous key
* `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (or ANON key if missing)
* `REDIS_URL` - Injected via Render from the `voice-redis` service
* `INTERNAL_SERVICE_TOKEN` - Shared secret for validating requests from the API

It also requires the following from the shared env:
* `SUPABASE_STORAGE_BUCKET_AUDIO` - The name of the Supabase bucket where audio files are stored (defaults to `user-audio`).

## Recovering from a Missing-Secret Failure

If a service deployment fails immediately upon boot, check the logs. A failure like:
```
[FATAL] Missing or invalid required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY
```
indicates that the corresponding environment variables are missing.

1. **Log in to the Render Dashboard:** Navigate to https://dashboard.render.com
2. **Access the Environment Group:** Go to the Environment Groups section and select `voice-secrets`.
3. **Populate the missing secrets:** Enter the required values.
   * If a value needs to be automatically generated, ensure the "Generate" feature in Render is utilized.
   * Do not put actual secret values in `render.yaml` or any checked-in file.
4. **Trigger a manual redeploy:** Go to the specific service (e.g. `voice-api` or `voice-audio-processor`) and click "Manual Deploy" -> "Deploy latest commit".

## Service Networking
The `voice-api` communicates with `voice-audio-processor` over HTTP.
The internal URL is constructed dynamically via the `AUDIO_PROCESSOR_URL` environment variable if provided. Otherwise, it defaults to `http://voice-audio-processor:8000` assuming standard internal Render service networking names.
Requests from `voice-api` to `voice-audio-processor` include the `X-Internal-Token` header, matching the `INTERNAL_SERVICE_TOKEN` secret to prevent unauthorized access.
