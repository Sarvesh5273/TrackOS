-- TeamTrack task board
-- Run once in the Supabase SQL editor (safe to re-run).

-- Shared trigger helper (already exists if schema.sql was applied)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- 1. Project key used in task references (e.g. PAY-12)
-- ============================================
alter table workspaces add column if not exists task_key text;

update workspaces
set task_key = upper(substr(regexp_replace(name, '[^a-zA-Z]', '', 'g'), 1, 3))
where task_key is null;

update workspaces
set task_key = 'TT'
where task_key is null or task_key !~ '^[A-Z][A-Z0-9]{1,5}$';

alter table workspaces alter column task_key set default 'TT';
alter table workspaces alter column task_key set not null;

alter table workspaces drop constraint if exists workspaces_task_key_format;
alter table workspaces add constraint workspaces_task_key_format
  check (task_key ~ '^[A-Z][A-Z0-9]{1,5}$');

-- ============================================
-- 2. Tasks
-- ============================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  number integer not null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 5000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  category text not null default 'development' check (category in (
    'development', 'design', 'documentation_research',
    'quality_testing', 'coordination_review', 'presentation_delivery'
  )),
  size text not null default 'M' check (size in ('S', 'M', 'L')),
  assignee_ids uuid[] not null default '{}',
  -- null = equal split between assignees, otherwise {"<user_id>": percent} summing to 100
  split jsonb,
  -- pending custom split: {"proposedBy", "split", "approvals": [user_id], "createdAt"}
  split_proposal jsonb,
  -- teammates (not assignees) who confirmed a done task
  confirmed_by uuid[] not null default '{}',
  due_date date,
  link text check (link is null or char_length(link) <= 500),
  position double precision not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number)
);

create index if not exists idx_tasks_workspace_status on tasks(workspace_id, status, position);

-- Per-project task numbers (1, 2, 3 ...) assigned atomically
create or replace function assign_task_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('tasks:' || new.workspace_id::text));
    select coalesce(max(number), 0) + 1 into new.number
    from tasks
    where workspace_id = new.workspace_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_assign_number on tasks;
create trigger tasks_assign_number before insert on tasks
  for each row execute function assign_task_number();

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

-- The app only accesses tasks through server routes (service role).
alter table tasks enable row level security;
