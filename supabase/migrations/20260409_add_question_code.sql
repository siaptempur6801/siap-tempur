create sequence if not exists question_code_seq start 1;

create or replace function generate_question_code()
returns text
language plpgsql
as $$
begin
  return 'Q-' || lpad(nextval('question_code_seq')::text, 6, '0');
end;
$$;

alter table questions add column if not exists question_code text;
alter table questions alter column question_code set default generate_question_code();

update questions
set question_code = generate_question_code()
where question_code is null;

alter table questions alter column question_code set not null;

create unique index if not exists questions_question_code_key on questions(question_code);
