create sequence if not exists questions_twk_code_seq start 1;
create sequence if not exists questions_tiu_code_seq start 1;
create sequence if not exists questions_tkp_code_seq start 1;

create or replace function next_question_code_by_type(question_type_input question_type)
returns text
language plpgsql
as $$
declare
  code_prefix text;
  next_number bigint;
begin
  case question_type_input
    when 'TWK' then
      code_prefix := 'TWK';
      next_number := nextval('questions_twk_code_seq');
    when 'TIU' then
      code_prefix := 'TIU';
      next_number := nextval('questions_tiu_code_seq');
    when 'TKP' then
      code_prefix := 'TKP';
      next_number := nextval('questions_tkp_code_seq');
    else
      raise exception 'Unsupported question type: %', question_type_input;
  end case;

  return code_prefix || '-' || lpad(next_number::text, 6, '0');
end;
$$;

create or replace function assign_question_code_by_type()
returns trigger
language plpgsql
as $$
begin
  if new.question_code is null or btrim(new.question_code) = '' then
    new.question_code := next_question_code_by_type(new.type);
  end if;

  return new;
end;
$$;

alter table questions alter column question_code drop default;

drop trigger if exists questions_assign_question_code on questions;

create trigger questions_assign_question_code
before insert on questions
for each row
execute function assign_question_code_by_type();

with ranked_questions as (
  select
    id,
    type,
    row_number() over (partition by type order by created_at, id) as sequence_number
  from questions
)
update questions as q
set question_code = case ranked_questions.type
  when 'TWK' then 'TWK-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  when 'TIU' then 'TIU-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  when 'TKP' then 'TKP-' || lpad(ranked_questions.sequence_number::text, 6, '0')
end
from ranked_questions
where q.id = ranked_questions.id;

select setval(
  'questions_twk_code_seq',
  greatest((select count(*) from questions where type = 'TWK') + 1, 1),
  false
);

select setval(
  'questions_tiu_code_seq',
  greatest((select count(*) from questions where type = 'TIU') + 1, 1),
  false
);

select setval(
  'questions_tkp_code_seq',
  greatest((select count(*) from questions where type = 'TKP') + 1, 1),
  false
);
