-- Event Payment System
-- Adds price/is_paid to events + separate event_payments table.
-- Event payments do NOT consume tryout tokens.

-- 1. Extend tryout_events
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tryout_events.price IS 'Harga tiket dalam Rupiah. 0 = gratis.';
COMMENT ON COLUMN public.tryout_events.is_paid IS 'True jika event berbayar. price > 0 tidak cukup — admin harus eksplisit set ini.';

-- 2. Dedicated event_payments table
CREATE TABLE IF NOT EXISTS public.event_payments (
  id          uuid         DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid         REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id    uuid         REFERENCES public.tryout_events(id) ON DELETE CASCADE NOT NULL,
  order_id    text         UNIQUE NOT NULL,
  amount      integer      NOT NULL CHECK (amount > 0),
  status      text         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'capture', 'settlement', 'expire', 'cancel', 'deny')),
  snap_token  text,
  created_at  timestamptz  DEFAULT timezone('utc', now()) NOT NULL,
  updated_at  timestamptz  DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(user_id, event_id)
);

COMMENT ON TABLE public.event_payments IS 'Tracks individual event ticket purchases via Midtrans. Separate from generic transactions table.';

-- 3. Indexes
CREATE INDEX IF NOT EXISTS event_payments_order_idx      ON public.event_payments(order_id);
CREATE INDEX IF NOT EXISTS event_payments_user_event_idx ON public.event_payments(user_id, event_id);
CREATE INDEX IF NOT EXISTS event_payments_status_idx     ON public.event_payments(status);

-- 4. RLS
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own event payments" ON public.event_payments;
CREATE POLICY "Users read own event payments"
  ON public.event_payments FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No INSERT/UPDATE by users — only service_role (server actions) can write.

-- 5. Auto-register function called after successful payment
--    Registers the user as a participant if not already registered.
CREATE OR REPLACE FUNCTION public.register_event_after_payment(
  p_user_id  uuid,
  p_event_id uuid,
  p_order_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Mark payment as settled
  UPDATE public.event_payments
  SET status = 'settlement', updated_at = now()
  WHERE order_id = p_order_id;

  -- Idempotent insert into participants
  INSERT INTO public.tryout_event_participants (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'registered')
  ON CONFLICT (event_id, user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_event_after_payment(uuid, uuid, text) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.register_event_after_payment(uuid, uuid, text) TO service_role;
