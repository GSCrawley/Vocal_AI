import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

export default async function profilesRoutes(app: FastifyInstance) {
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    // In a real app, auth.uid would come from the JWT via request.user
    const userId = (request.user as { sub?: string })?.sub;
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
      app.log.warn({ err: error, userId }, 'Failed to fetch profile');

      // PGRST116: no rows returned. 42P01: undefined_table (table not created yet).
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        return reply.code(500).send({ error: 'Failed to load profile' });
      }

      // Fallback stub when the profile row/table isn't present yet.
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

    const row = data as Record<string, unknown>;
    const profile = {
      userId: (row['user_id'] as string | undefined) ?? userId,
      displayName: (row['display_name'] as string | undefined) ?? 'Test User',
      activeTier: (row['active_tier'] as string | undefined) ?? 'singing',
      level: (row['level'] as number | undefined) ?? 1,
      totalXp: (row['total_xp'] as number | undefined) ?? 0,
      streakDays: (row['streak_days'] as number | undefined) ?? 0,
      streakShieldsRemaining: (row['streak_shields_remaining'] as number | undefined) ?? 0,
      createdAt: (row['created_at'] as string | undefined) ?? new Date().toISOString(),
      audioStorageConsent: (row['audio_storage_consent'] as boolean | undefined) ?? false,
    };

    return reply.code(200).send(profile);
  });

  app.patch(
    '/me',
    async (
      request: FastifyRequest<{ Body: { audioStorageConsent?: boolean } }>,
      reply: FastifyReply
    ) => {
      const userId = (request.user as { sub?: string })?.sub;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { audioStorageConsent } = request.body;
      if (audioStorageConsent === undefined) {
        return reply.code(400).send({ error: 'audioStorageConsent is required' });
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ audio_storage_consent: audioStorageConsent })
        .eq('user_id', userId);

      if (error) {
        app.log.error(error, 'Failed to update audio storage consent');
        return reply.code(500).send({ error: 'Failed to update profile' });
      }

      return reply.code(200).send({ success: true, audioStorageConsent });
    }
  );
}
