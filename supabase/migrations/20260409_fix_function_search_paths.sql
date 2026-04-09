-- Fix mutable search_path warnings for security-definer and helper functions.

do $$
begin
  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'generate_question_code'
      and oidvectortypes(proargtypes) = ''
  ) then
    alter function public.generate_question_code()
      set search_path = public;
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'next_question_code_by_type'
      and oidvectortypes(proargtypes) = 'question_type'
  ) then
    alter function public.next_question_code_by_type(public.question_type)
      set search_path = public;
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'assign_question_code_by_type'
      and oidvectortypes(proargtypes) = ''
  ) then
    alter function public.assign_question_code_by_type()
      set search_path = public;
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'claim_voucher'
      and oidvectortypes(proargtypes) = 'uuid, text'
  ) then
    alter function public.claim_voucher(uuid, text)
      set search_path = public;
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'claim_voucher'
      and oidvectortypes(proargtypes) = 'uuid, text, text'
  ) then
    alter function public.claim_voucher(uuid, text, text)
      set search_path = public;
  end if;
end $$;
