-- TeamTrack AI — Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable RLS
alter table if exists workspaces enable row level security;
alter table if exists memberships enable row level security;
alter table if exists integrations enable row level security;
alter table if exists evidence_items enable row level security;
alter table if exists manual_evidence enable row level security;
alter table if exists reports enable row level security;
alter table if exists disputes enable row level security;
alter table if exists audit_events enable row level security;
alter table if exists notifications enable row level security;

-- ============================================
-- Workspaces
-- ============================================
create table workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  project_type text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  timezone text default 'UTC',
  categories jsonb not null default '[
    {"id": "development", "name": "Development", "weight": 0.30},
    {"id": "design", "name": "Design", "weight": 0.20},
    {"id": "documentation_research", "name": "Documentation & Research", "weight": 0.15},
    {"id": "quality_testing", "name": "Quality & Testing", "weight": 0.15},
    {"id": "coordination_review", "name": "Coordination & Review", "weight": 0.10},
    {"id": "presentation_delivery", "name": "Presentation & Delivery", "weight": 0.10}
  ]'::jsonb,
  review_window_hours int default 48,
  evidence_policy text,
  status text default 'draft' check (status in ('draft', 'active', 'frozen', 'under_review', 'published', 'archived')),
  policy_version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Memberships
-- ============================================
create table memberships (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('leader', 'member', 'reviewer')),
  declared_contribution_roles text[] default '{}',
  invitation_state text default 'accepted' check (invitation_state in ('pending', 'accepted', 'rejected', 'expired')),
  invitation_token text unique,
  invitation_expires_at timestamptz,
  consent_given_at timestamptz,
  consent_version int,
  joined_at timestamptz default now(),
  left_at timestamptz,
  removal_reason text,
  unique(workspace_id, user_id)
);

-- ============================================
-- Integrations
-- ============================================
create table integrations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  provider text not null,
  requested_scopes text[] default '{}',
  granted_scopes text[] default '{}',
  selected_resources jsonb,
  status text default 'pending' check (status in ('pending', 'active', 'error', 'revoked')),
  error_message text,
  credential_ref text,
  connected_by uuid references auth.users(id),
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  sync_cursor text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Evidence Items
-- ============================================
create table evidence_items (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  source text not null check (source in ('github_commit', 'github_pr', 'github_issue', 'github_review', 'github_comment', 'manual', 'csv_import')),
  source_id text not null,
  source_url text,
  event_type text not null,
  actor_id uuid references auth.users(id),
  actor_username text,
  actor_email text,
  attribution_confidence float default 1.0,
  mapping_status text default 'mapped' check (mapping_status in ('mapped', 'ambiguous', 'unmapped')),
  timestamp timestamptz not null,
  summary text,
  description text,
  category text check (category in ('development', 'design', 'documentation_research', 'quality_testing', 'coordination_review', 'presentation_delivery')),
  classification_confidence float,
  work_type text check (work_type in ('created', 'review', 'coordination', 'presentation', 'original', 'collaboration')),
  is_duplicate boolean default false,
  is_bot_generated boolean default false,
  is_excluded boolean default false,
  exclusion_reason text,
  metadata jsonb,
  is_sensitive boolean default false,
  sensitive_summary text,
  verification_state text default 'provider_verified' check (verification_state in ('provider_verified', 'manual_submitted', 'collaborator_confirmed', 'disputed', 'corrected')),
  base_weight float default 1.0,
  impact_factor float default 1.0,
  quality_factor float default 1.0,
  duplication_factor float default 1.0,
  calculated_value float default 0,
  sync_version text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, source, source_id, sync_version)
);

create index idx_evidence_workspace on evidence_items(workspace_id);
create index idx_evidence_timestamp on evidence_items(workspace_id, timestamp);
create index idx_evidence_category on evidence_items(workspace_id, category);
create index idx_evidence_actor on evidence_items(workspace_id, actor_id);

-- ============================================
-- Manual Evidence
-- ============================================
create table manual_evidence (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  submitted_by uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null,
  start_date timestamptz not null,
  end_date timestamptz,
  category text not null check (category in ('development', 'design', 'documentation_research', 'quality_testing', 'coordination_review', 'presentation_delivery')),
  effort_band text check (effort_band in ('SMALL', 'MEDIUM', 'LARGE', 'EXTENSIVE')),
  work_type text not null check (work_type in ('original', 'collaboration', 'review', 'coordination', 'presentation')),
  collaborator_ids uuid[] default '{}',
  artifact_url text,
  artifact_file_key text,
  confirmations jsonb,
  review_status text default 'pending' check (review_status in ('pending', 'approved', 'clarification_requested')),
  clarification_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Reports
-- ============================================
create table reports (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  version int not null,
  status text default 'provisional' check (status in ('provisional', 'published')),
  member_results jsonb not null default '[]'::jsonb,
  overall_confidence text check (overall_confidence in ('HIGH', 'MEDIUM', 'LOW')),
  coverage_score float default 0,
  limitations text,
  scoring_logic jsonb,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  previous_version_id uuid references reports(id),
  team_agreed_allocation jsonb,
  created_at timestamptz default now(),
  unique(workspace_id, version)
);

-- ============================================
-- Disputes
-- ============================================
create table disputes (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('evidence', 'score', 'attribution', 'category')),
  target_id text,
  reason text not null,
  requested_change text not null,
  state text default 'open' check (state in ('open', 'under_discussion', 'resolved', 'rejected', 'unresolved_at_publication')),
  responses jsonb,
  resolution text,
  resolution_rationale text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  visible_in_published_report boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Audit Events
-- ============================================
create table audit_events (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references auth.users(id) not null,
  workspace_id uuid references workspaces(id) on delete set null,
  action text not null,
  object_type text not null,
  object_id text,
  previous_value jsonb,
  new_value jsonb,
  correlation_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_audit_workspace on audit_events(workspace_id, created_at);
create index idx_audit_actor on audit_events(actor_id, created_at);

-- ============================================
-- Notifications
-- ============================================
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('invitation', 'policy_change', 'sync_failure', 'evidence_question', 'report_available', 'dispute_raised', 'dispute_resolved', 'report_published')),
  title text not null,
  message text not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  object_type text,
  object_id text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on notifications(user_id, is_read, created_at);

-- ============================================
-- RLS Policies
-- ============================================

-- Workspaces: members can view, leaders can update
create policy "Members can view their workspaces"
  on workspaces for select
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = workspaces.id and m.user_id = auth.uid()
  ));

create policy "Leaders can create workspaces"
  on workspaces for insert
  with check (true);

create policy "Leaders can update their workspaces"
  on workspaces for update
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = workspaces.id and m.user_id = auth.uid() and m.role = 'leader'
  ));

-- Memberships: view own, leaders can manage
create policy "Users can view workspace memberships"
  on memberships for select
  using (user_id = auth.uid() or exists (
    select 1 from memberships m 
    where m.workspace_id = memberships.workspace_id and m.user_id = auth.uid()
  ));

-- Evidence: workspace members can view
create policy "Members can view workspace evidence"
  on evidence_items for select
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = evidence_items.workspace_id and m.user_id = auth.uid()
  ));

-- Manual evidence: workspace members can view, submitters can update
create policy "Members can view manual evidence"
  on manual_evidence for select
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = manual_evidence.workspace_id and m.user_id = auth.uid()
  ));

-- Reports: workspace members can view
create policy "Members can view reports"
  on reports for select
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = reports.workspace_id and m.user_id = auth.uid()
  ));

-- Disputes: workspace members can view
create policy "Members can view disputes"
  on disputes for select
  using (exists (
    select 1 from memberships m 
    where m.workspace_id = disputes.workspace_id and m.user_id = auth.uid()
  ));

-- Notifications: users can view own
create policy "Users can view own notifications"
  on notifications for select
  using (user_id = auth.uid());

-- ============================================
-- Functions
-- ============================================

-- Update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at_column();
create trigger evidence_items_updated_at before update on evidence_items
  for each row execute function update_updated_at_column();
create trigger manual_evidence_updated_at before update on manual_evidence
  for each row execute function update_updated_at_column();
create trigger disputes_updated_at before update on disputes
  for each row execute function update_updated_at_column();
