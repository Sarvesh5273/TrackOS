-- ============================================
-- TeamTrack AI — Shareable Invite Link support
-- Run these statements in the Supabase SQL Editor.
-- ============================================

-- 1. Allow pending invites to exist without a user yet.
--    The memberships.user_id column is NOT NULL by default; relax it so a
--    pending invite row can hold NULL until someone accepts.
alter table memberships alter column user_id drop not null;

-- 2. Anyone (including not-yet-authenticated visitors) can read pending
--    invite rows by token. The random UUID token is the secret.
create policy "Anyone can read pending invites by token"
  on memberships for select
  using (invitation_state = 'pending');

-- 3. Workspace leaders can create invite rows (user_id NULL, invitation_state pending).
create policy "Leaders can create memberships"
  on memberships for insert
  with check (exists (
    select 1 from memberships m
    where m.workspace_id = memberships.workspace_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
  ));

-- 4. Any authenticated user holding a valid (pending) invite token can accept it.
--    USING allows updating pending invites; WITH CHECK binds the row to the
--    accepting user so a token can only ever claim a seat for themselves.
create policy "Users can accept pending invites"
  on memberships for update
  using (invitation_state = 'pending')
  with check (invitation_state = 'accepted' and user_id = auth.uid());

-- 5. Workspace leaders can delete (revoke) memberships / pending invites.
create policy "Leaders can delete memberships"
  on memberships for delete
  using (exists (
    select 1 from memberships m
    where m.workspace_id = memberships.workspace_id
      and m.user_id = auth.uid()
      and m.role = 'leader'
  ));

-- 6. Security definer helper so the /api/invite/[token] endpoint can return
--    workspace name + inviter details for anonymous visitors without tripping
--    RLS on workspaces/auth.users.
create or replace function public.get_invite_by_token(p_token text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'workspace_id', w.id,
    'workspace_name', w.name,
    'role', m.role,
    'expires_at', m.invitation_expires_at,
    'inviter_name', u.raw_user_meta_data->>'name',
    'inviter_email', u.email
  )
  from memberships m
  join workspaces w on w.id = m.workspace_id
  join memberships lm on lm.workspace_id = m.workspace_id and lm.role = 'leader'
  join auth.users u on u.id = lm.user_id
  where m.invitation_token = p_token
    and m.invitation_state = 'pending'
    and m.invitation_expires_at > now()
    and m.user_id is null
  limit 1
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated, service_role;
