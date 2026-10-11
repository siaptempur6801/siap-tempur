-- Enable RLS
ALTER TABLE tryouts ENABLE ROW LEVEL SECURITY;

ALTER TABLE tryout_questions ENABLE ROW LEVEL SECURITY;

-- Policies for Tryouts
-- Anyone (authenticated) can view active tryouts
CREATE POLICY "Authenticated read tryouts" ON tryouts
  FOR SELECT TO authenticated
  USING (TRUE);

-- Only service role can manage (insert/update/delete) - Implicit by lack of policy, but good to know.
-- Policies for Tryout Questions
CREATE POLICY "Authenticated read tryout questions" ON tryout_questions
  FOR SELECT TO authenticated
  USING (TRUE);
