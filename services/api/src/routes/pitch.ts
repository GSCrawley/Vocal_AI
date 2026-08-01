import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyMultipart from '@fastify/multipart';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<{
    toBuffer: () => Promise<Buffer>;
    mimetype: string;
    filename?: string;
  } | null>;
};

export default async function pitchRoutes(app: FastifyInstance) {
  app.register(fastifyMultipart);

  app.post('/extract', async (request: FastifyRequest, reply: FastifyReply) => {
    const multipartRequest = request as MultipartRequest;
    const userId = (request.user as { sub?: string })?.sub;
    if (!userId) {
      app.log.warn('No user id in JWT, proceeding for pitch extraction proxy');
    }

    const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
    if (!INTERNAL_TOKEN) {
      app.log.error('INTERNAL_SERVICE_TOKEN is not configured');
      return reply.code(500).send({ error: 'Internal server configuration error' });
    }
    const AUDIO_PROCESSOR_URL = process.env.AUDIO_PROCESSOR_URL || 'http://localhost:8000';

    try {
      const data = await multipartRequest.file();
      if (!data) {
        return reply.code(400).send({ error: 'No audio file provided' });
      }

      const buffer = await data.toBuffer();

      // Reconstruct multipart/form-data for the Python service using FormData
      const formData = new FormData();
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
      }
      const blob = new Blob([arrayBuffer], { type: data.mimetype });
      formData.append('file', blob, data.filename || 'recording.m4a');

      const response = await fetch(`${AUDIO_PROCESSOR_URL}/pitch/extract`, {
        method: 'POST',
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        app.log.error(`Audio processor failed: ${err}`);
        return reply.code(500).send({ error: 'Failed to extract pitch on audio-processor' });
      }

      const result = await response.json();
      return reply.code(200).send(result);
    } catch (err) {
      app.log.error(err, 'Failed to proxy pitch extraction request');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
