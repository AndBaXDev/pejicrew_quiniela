-- ══════════════════════════════════════════════════════════
-- AGREGAR ESTA SECCIÓN AL FINAL DE supabase_setup.sql
-- ══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 9. PUSH SUBSCRIPTIONS (Web Push Notifications)
-- Almacena las suscripciones de usuarios para notificaciones.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
subscription JSONB NOT NULL, -- { endpoint, keys: { auth, p256dh } }
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicados por endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
ON public.push_subscriptions(user_id, (subscription->>'endpoint'));

-- RLS: push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_insert_own"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
