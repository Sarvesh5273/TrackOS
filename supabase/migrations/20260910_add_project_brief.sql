-- Add project_brief column to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS project_brief TEXT;
