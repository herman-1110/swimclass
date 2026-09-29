-- The link pattern in email_html allowed only letters and slashes after {{site_url}}, so
-- the new /my-classes link (…_update_email_links.sql) was linked only up to "/my". Paths
-- may contain hyphens too. The same signature and body otherwise, so the missing grant
-- (internal, TECH_SPEC §6) stays as it was.

-- email_html: an email's text as simple HTML, with the templates' {{site_url}} links
-- clickable (the bare site or a path like /my-classes).
create or replace function public.email_html(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg(
    '<p>' || regexp_replace(
      replace(public.html_escape(t.part), E'\n', '<br>'),
      '\{\{site_url\}\}(/[a-z/-]*)?', '<a href="\&">\&</a>', 'g'
    ) || '</p>',
    E'\n' order by t.n
  )
  from regexp_split_to_table(p_text, E'\n\n') with ordinality as t (part, n)
$$;
