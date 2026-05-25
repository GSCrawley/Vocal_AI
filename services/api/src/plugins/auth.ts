import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { createClient, User } from '@supabase/supabase-js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const missingSupabaseConfig = !supabaseUrl || !supabaseAnonKey;
  const missingConfigMessage =
    'Missing required SUPABASE_URL or SUPABASE_ANON_KEY environment variable for auth initialization.';

  if (missingSupabaseConfig) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(missingConfigMessage);
    }
    fastify.log.warn(missingConfigMessage);
  }

  const supabase =
    !missingSupabaseConfig && supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null;

  fastify.decorateRequest('user', null);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    request.user = null;

    try {
      if (!supabase) {
        reply.code(503).send({ error: 'Authentication service unavailable' });
        return;
      }

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
