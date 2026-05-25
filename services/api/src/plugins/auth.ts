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
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'dummy_key';

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
     fastify.log.warn('Missing required SUPABASE_URL or SUPABASE_ANON_KEY environment variable. Using dummy values for auth initialization.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Unauthorized: Missing or invalid token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        request.log.error(error);
        reply.code(401).send({ error: 'Unauthorized: Invalid token' });
        return;
      }

      request.user = user;
    } catch (err) {
      request.log.error(err);
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
  });
});
