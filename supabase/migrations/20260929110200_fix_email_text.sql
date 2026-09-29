-- email_text turned '{{' into '{ {' in one left-to-right pass, so '{{{site_url}}' became
-- '{ {{site_url}}' and a whole placeholder survived: a customer could still put a link to
-- somewhere else into the coach's late alert. Now every '{' that is followed by another
-- '{' gets a space after it, so no '{{' is left at all. The same signature, so the
-- callers and the missing grant (internal, TECH_SPEC §6) stay as they were.

-- email_text: free text in an email (names, locations, reasons, messages, the business
-- name) never carries the {{site_url}} placeholder that mail-queue fills in.
create or replace function public.email_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(p_text, '\{(?=\{)', '{ ', 'g')
$$;
