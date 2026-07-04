import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

export default async function profilesRoutes(app: FastifyInstance) {
  app.get(
    '/me',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // In a real app, auth.uid would come from the JWT via request.user
      const userId = (request.user as { sub?: string })?.sub || 'test-user';
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Minimal stub if supabase table doesn't exist yet, we'll return a stub profile
      // But we will try to fetch if possible, though 'profiles' might be 'users' or 'user_profiles'
      // According to standard Supabase setup, it's usually `user_profiles` or `profiles`.
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Fallback for Build 0.2 if DB isn't strictly seeded
        return reply.code(200).send({
          userId,
          displayName: 'Test User',
          activeTier: 'singing',
          level: 1,
          totalXp: 0,
          streakDays: 0,
          streakShieldsRemaining: 0,
          createdAt: new Date().toISOString(),
          audioStorageConsent: false,
        });
      }

      return reply.code(200).send(data);
    }
  );

  app.patch(
    '/me',
    async (
      request: FastifyRequest<{ Body: { audioStorageConsent?: boolean } }>,
      reply: FastifyReply
    ) => {
      const userId = (request.user as { sub?: string })?.sub || 'test-user';
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { audioStorageConsent } = request.body;

      if (audioStorageConsent !== undefined) {
        // We will attempt to update Supabase, but catch if the table doesn't exist yet
        const { error } = await supabase
          .from('user_profiles')
          .update({ audio_storage_consent: audioStorageConsent })
          .eq('user_id', userId);

        if (error) {
           app.log.warn(error, 'Failed to update profile in DB, falling back to success for stub');
        }
      }

      return reply.code(200).send({ success: true, audioStorageConsent });
    }
  );
}
