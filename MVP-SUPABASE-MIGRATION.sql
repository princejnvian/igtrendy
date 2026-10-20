-- YOUTENT MVP database migration
-- Run once in Supabase SQL Editor after the existing marketplace schema.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS project_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) NOT NULL DEFAULT 0;

UPDATE public.payments
SET project_amount = COALESCE(project_amount, amount),
    platform_fee = COALESCE(platform_fee, 0)
WHERE project_amount IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN project_amount SET DEFAULT 0;

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
