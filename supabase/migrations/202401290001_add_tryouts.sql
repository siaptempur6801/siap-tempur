-- Tryouts Table
CREATE TABLE tryouts (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration_minutes int NOT NULL,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Link Sessions to Tryouts (Optional, if session is linked to a specific tryout event)
ALTER TABLE test_sessions
  ADD COLUMN tryout_id uuid REFERENCES tryouts (id);

-- Questions in a Tryout (Many-to-Many)
CREATE TABLE tryout_questions (
  tryout_id uuid REFERENCES tryouts (id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions (id) ON DELETE CASCADE NOT NULL,
  order_index int NOT NULL,
  PRIMARY KEY (tryout_id, question_id)
);
