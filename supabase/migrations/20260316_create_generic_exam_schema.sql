-- ==============================================================================
-- GENERIC TESTING DATABASE SCHEMA
-- ==============================================================================
-- This script creates a parallel generic testing architecture to support
-- various exam types (TOEFL, BUMN, etc.) without modifying or breaking 
-- the existing production CPNS schema (questions, test_sessions, tryouts).
-- ==============================================================================

-- 1. Create Generic Exam Types & Categories
CREATE TABLE generic_tests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL, -- e.g., 'TOEFL', 'BUMN', 'UTBK'
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Create Generic Questions
CREATE TABLE generic_questions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_id uuid REFERENCES generic_tests(id) on delete cascade NOT NULL,
  content text NOT NULL,
  image_url text,
  section_name text NOT NULL, -- e.g., 'Listening', 'Reading', 'Verbal', 'Numeric'
  type text NOT NULL, -- Flexibly specify the question type format
  explanation text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Generic Options
CREATE TABLE generic_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id uuid REFERENCES generic_questions(id) on delete cascade NOT NULL,
  content text NOT NULL,
  is_correct boolean DEFAULT false,
  score_value int DEFAULT 0, -- Some testing might give partial points 1-5 like TKP
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Generic Test Sessions
CREATE TABLE generic_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) on delete cascade NOT NULL,
  test_id uuid REFERENCES generic_tests(id) NOT NULL,
  status session_status DEFAULT 'in_progress',
  start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time timestamp with time zone,
  
  -- Flexible Scoring Columns
  total_score int DEFAULT 0,
  scores_breakdown jsonb DEFAULT '{}'::jsonb, -- e.g., {"Listening": 50, "Reading": 60}
  is_passed boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Generic Answers
CREATE TABLE generic_answers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id uuid REFERENCES generic_sessions(id) on delete cascade NOT NULL,
  question_id uuid REFERENCES generic_questions(id) NOT NULL,
  option_id uuid REFERENCES generic_options(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  unique(session_id, question_id)
);

-- 6. Enable RLS and Policies for the New Tables
ALTER TABLE generic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE generic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generic_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE generic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generic_answers ENABLE ROW LEVEL SECURITY;

-- 7. Basic RLS Policies
CREATE POLICY "Public read generic_tests" ON generic_tests FOR SELECT USING (true);
CREATE POLICY "Public read generic_questions" ON generic_questions FOR SELECT USING (true);
CREATE POLICY "Public read generic_options" ON generic_options FOR SELECT USING (true);
CREATE POLICY "Users can view own generic_sessions" ON generic_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generic_sessions" ON generic_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own generic_sessions" ON generic_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own generic_answers" ON generic_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM generic_sessions 
    WHERE generic_sessions.id = generic_answers.session_id 
    AND generic_sessions.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own generic_answers" ON generic_answers FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM generic_sessions 
    WHERE generic_sessions.id = generic_answers.session_id 
    AND generic_sessions.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own generic_answers" ON generic_answers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM generic_sessions 
    WHERE generic_sessions.id = generic_answers.session_id 
    AND generic_sessions.user_id = auth.uid()
  )
);
