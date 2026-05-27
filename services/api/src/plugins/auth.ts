import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { createClient, User } from '@supabase/supabase-js';
import { getConfig } from '../config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const config = getConfig();

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  fastify.decorateRequest('user', null);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    request.user = null;

    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Unauthorized: Missing or invalid token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        const status = (error as { status?: number }).status;
        if (!status || status >= 500) {
          request.log.error(error);
          reply.code(503).send({ error: 'Authentication service unavailable' });
          return;
        }

        reply.code(401).send({ error: 'Unauthorized: Invalid token' });
        return;
      }

      if (!user) {
        reply.code(401).send({ error: 'Unauthorized: Invalid token' });
        return;
      }

      request.user = user;
    } catch (err) {
      request.log.error(err);
      reply.code(503).send({ error: 'Authentication service unavailable' });
      return;
    }
  });
});
