-- Enable RLS
alter table tryouts enable row level security;
alter table tryout_questions enable row level security;

-- Policies for Tryouts
-- Anyone (authenticated) can view active tryouts
create policy "Authenticated read tryouts" on tryouts
  for select to authenticated using (true);

-- Only service role can manage (insert/update/delete) - Implicit by lack of policy, but good to know.

-- Policies for Tryout Questions
create policy "Authenticated read tryout questions" on tryout_questions
  for select to authenticated using (true);
