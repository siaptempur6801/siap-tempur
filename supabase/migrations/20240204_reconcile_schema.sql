
-- Final Reconciliation Migration (2024-02-04)

-- 1. Create Transaction Status Enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'settlement', 'expire', 'cancel', 'deny');
    END IF;
END $$;

-- 2. Add missing columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tryout_quota int DEFAULT 0,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Create transactions table if not exists
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id text UNIQUE NOT NULL,
  amount int NOT NULL,
  status transaction_status DEFAULT 'pending',
  package_name text NOT NULL,
  snap_token text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create policy for transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" ON transactions 
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Ensure materials table has RLS and policies (from consolidation)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'materials' AND policyname = 'Authenticated read materials'
    ) THEN
        CREATE POLICY "Authenticated read materials" ON materials 
        FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
