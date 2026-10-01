-- Lock down direct table access.
--
-- Before this migration, RLS was OFF on every table, so anyone holding the
-- public anon key (it ships in the browser bundle) could read and write all
-- data, including GitHub tokens in integrations.credential_ref.
--
-- The app now reads and writes only through Next.js API routes that check
-- membership in code and use the service role key (which bypasses RLS).
-- Browsers use Supabase only for sign-in. So: RLS on, no policies = deny all
-- direct access for anon/authenticated users.
--
-- Run once in the Supabase SQL editor (safe to re-run).
-- After running, rotate any GitHub token saved in a project integration.

alter table if exists workspaces enable row level security;
alter table if exists memberships enable row level security;
alter table if exists integrations enable row level security;
alter table if exists evidence_items enable row level security;
alter table if exists manual_evidence enable row level security;
alter table if exists reports enable row level security;
alter table if exists disputes enable row level security;
alter table if exists audit_events enable row level security;
alter table if exists notifications enable row level security;
alter table if exists tasks enable row level security;

-- Drop every existing policy on these tables. Some were recursive
-- (memberships) or let anonymous visitors list all pending invite tokens.
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'workspaces', 'memberships', 'integrations', 'evidence_items',
        'manual_evidence', 'reports', 'disputes', 'audit_events',
        'notifications', 'tasks'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- get_invite_by_token (SECURITY DEFINER) keeps working for the public invite page.
