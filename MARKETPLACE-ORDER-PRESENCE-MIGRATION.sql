-- YOUTENT marketplace order, presence, and cleanup migration
-- Run once in Supabase SQL Editor after the existing marketplace/escrow migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS gigs jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS profiles_freelancer_last_seen_idx
  ON public.profiles(account_type, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.checkout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id text,
  gig_title text NOT NULL DEFAULT '',
  package_id text NOT NULL,
  package_name text NOT NULL,
  package_description text NOT NULL DEFAULT '',
  package_price numeric(12,2) NOT NULL CHECK (package_price > 0),
  delivery_days integer NOT NULL CHECK (delivery_days BETWEEN 1 AND 365),
  revisions integer NOT NULL DEFAULT 0 CHECK (revisions BETWEEN 0 AND 50),
  platform_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  razorpay_order_id text UNIQUE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','processing','paid','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.checkout_orders
  ADD COLUMN IF NOT EXISTS gig_id text,
  ADD COLUMN IF NOT EXISTS gig_title text NOT NULL DEFAULT '';

ALTER TABLE public.checkout_orders
  ALTER COLUMN platform_fee SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS checkout_orders_gig_idx
  ON public.checkout_orders(gig_id);

CREATE INDEX IF NOT EXISTS checkout_orders_client_idx
  ON public.checkout_orders(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS checkout_orders_freelancer_idx
  ON public.checkout_orders(freelancer_id, created_at DESC);

ALTER TABLE public.checkout_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkout_orders_select_own ON public.checkout_orders;
CREATE POLICY checkout_orders_select_own
  ON public.checkout_orders
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

-- Keep this legacy request system available for old projects. New gig orders
-- use checkout_orders and do not create project_requests.
