-- Allow the scheduler to temporarily claim a trend while an article is being generated.
-- This prevents overlapping cron/manual runs from processing the same trend twice.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.trend_queue'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.trend_queue DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.trend_queue
  ADD CONSTRAINT trend_queue_status_check
  CHECK (status IN ('queued','drafted','processing','published','ignored'));

CREATE INDEX IF NOT EXISTS trend_queue_processing_idx
  ON public.trend_queue(status, trend_score DESC, scanned_at DESC);
