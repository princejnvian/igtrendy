-- YOUTENT marketplace v3: escrow ledger, wallets, revisions and reviews.
-- Run after the existing YOUTENT marketplace SQL.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'funded',
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_escrow_status_check
    CHECK (escrow_status IN ('pending','funded','released','refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('credit','debit','hold','release','refund','withdrawal')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_revisions_project_idx ON public.project_revisions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_freelancer_idx ON public.reviews(freelancer_id, created_at DESC);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_select_own ON public.wallets;
CREATE POLICY wallets_select_own ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS wallet_transactions_select_own ON public.wallet_transactions;
CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS revisions_select_project_member ON public.project_revisions;
CREATE POLICY revisions_select_project_member ON public.project_revisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.freelancer_id = auth.uid()))
);
DROP POLICY IF EXISTS revisions_insert_client ON public.project_revisions;
CREATE POLICY revisions_insert_client ON public.project_revisions FOR INSERT TO authenticated WITH CHECK (
  requested_by = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid())
);
DROP POLICY IF EXISTS reviews_select_public ON public.reviews;
CREATE POLICY reviews_select_public ON public.reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reviews_insert_client ON public.reviews;
CREATE POLICY reviews_insert_client ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid() AND p.freelancer_id = reviews.freelancer_id AND p.status = 'completed')
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_payment_type_unique ON public.wallet_transactions(payment_id, type) WHERE payment_id IS NOT NULL AND type IN ('hold','release');

CREATE OR REPLACE FUNCTION public.hold_project_payment(p_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.payments%ROWTYPE; v_amount numeric(12,2);
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF p.status <> 'paid' THEN RAISE EXCEPTION 'Payment is not captured'; END IF;
  v_amount := COALESCE(p.project_amount, p.amount - COALESCE(p.platform_fee, 0));
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Invalid project payment amount'; END IF;
  INSERT INTO public.wallets(user_id) VALUES (p.freelancer_id) ON CONFLICT (user_id) DO NOTHING;
  IF p.escrow_status <> 'funded' THEN
    UPDATE public.wallets SET pending_balance = pending_balance + v_amount, updated_at = now() WHERE user_id = p.freelancer_id;
    INSERT INTO public.wallet_transactions(user_id, project_id, payment_id, type, amount, description) VALUES (p.freelancer_id, p.project_id, p.id, 'hold', v_amount, 'Project payment held until client accepts delivery') ON CONFLICT (payment_id, type) DO NOTHING;
    UPDATE public.payments SET escrow_status = 'funded', updated_at = now() WHERE id = p.id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.hold_project_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hold_project_payment(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.release_project_payment(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.payments%ROWTYPE; v_project public.projects%ROWTYPE; v_amount numeric(12,2);
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_project.client_id THEN RAISE EXCEPTION 'Only the project client can release payment'; END IF;
  IF v_project.status <> 'active' THEN RAISE EXCEPTION 'Project is not active'; END IF;
  SELECT * INTO p FROM public.payments WHERE project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF p.status <> 'paid' THEN RAISE EXCEPTION 'Payment is not captured'; END IF;
  IF p.escrow_status = 'released' THEN RETURN; END IF;
  IF p.escrow_status <> 'funded' THEN RAISE EXCEPTION 'Payment is not held in escrow'; END IF;
  v_amount := COALESCE(p.project_amount, p.amount - COALESCE(p.platform_fee, 0));
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Invalid project payment amount'; END IF;
  INSERT INTO public.wallets(user_id) VALUES (p.freelancer_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET available_balance = available_balance + v_amount, pending_balance = GREATEST(pending_balance - v_amount, 0), updated_at = now() WHERE user_id = p.freelancer_id;
  INSERT INTO public.wallet_transactions(user_id, project_id, payment_id, type, amount, description) VALUES (p.freelancer_id, p.project_id, p.id, 'release', v_amount, 'Project payment released after client approval') ON CONFLICT (payment_id, type) DO NOTHING;
  UPDATE public.payments SET escrow_status = 'released', released_at = now(), updated_at = now() WHERE id = p.id;
  UPDATE public.projects SET status = 'completed', updated_at = now() WHERE id = p.project_id;
END; $$;
REVOKE ALL ON FUNCTION public.release_project_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_project_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_freelancer_rating(p_user_id uuid)
RETURNS TABLE(rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*) FROM public.reviews WHERE freelancer_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.get_freelancer_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_freelancer_rating(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.creator_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_messages_pair_idx ON public.creator_messages(sender_id, creator_id, created_at DESC);
ALTER TABLE public.creator_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_messages_select_pair ON public.creator_messages;
CREATE POLICY creator_messages_select_pair ON public.creator_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR creator_id = auth.uid());
DROP POLICY IF EXISTS creator_messages_insert_sender ON public.creator_messages;
CREATE POLICY creator_messages_insert_sender ON public.creator_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
