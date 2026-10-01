# TrackOS (TeamTrack AI)

A lightweight task board for student and small teams. Plan work in **To do → In progress → Done**, assign teammates, and see a credit report backed by completed tasks and optional GitHub activity. Task splits need agreement; weekly updates make it easy to keep the team informed.

## Local setup

1. Install dependencies: `npm install`
2. Create a Supabase project and set the following in `.env.local`:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   The service-role key is **server-only**. Never expose it in client code or commit `.env.local`.

3. In the Supabase SQL editor, apply these files **in order** for a new database:

   - `supabase/schema.sql`
   - `supabase/invite_policies.sql`
   - `supabase/migrations/20260910_add_project_brief.sql`
   - `supabase/migrations/20260930_task_board.sql`
   - `supabase/migrations/20260930_lock_down_rls.sql` **last**

   For an existing project with the base schema and invites already installed, only apply migrations you haven't run. Do **not** re-run `invite_policies.sql` after the RLS lockdown: its old policies would reopen direct access to pending invitations. The app accesses project data through authorized Next.js API routes; anonymous/authenticated direct table access is denied by RLS.

4. Enable GitHub sign-in in Supabase Auth (configure its callback URL), then run `npm run dev`.

## Inviting people on another device

An invite beginning with `http://localhost:3000` works **only on the computer running the app** (including another browser or incognito window). To share links with remote teammates:

1. Deploy this Next.js app to a public HTTPS URL (for example, with [Vercel's Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)). If deploying from Git, commit and push the current code first; a deployment of the old commit won't include these changes.
2. In the host's **production** environment variables, set `NEXT_PUBLIC_APP_URL=https://your-domain.example`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key server-only. Redeploy after setting variables.
3. In Supabase Auth → URL Configuration, set **Site URL** to the same production URL and add `https://your-domain.example/auth/callback` to **Redirect URLs**. Keep `http://localhost:3000/auth/callback` allowed for local testing. See [Supabase's redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).
4. Sign in at the deployed URL, open **Team → Invite**, and copy the new public link. Previously pending invites can also be copied again from the Team tab; their token stays valid until used or expired.

Do not publish an invite containing `localhost` to WhatsApp: it will point your teammate back to their own computer.

Optional server settings:

- `GEMINI_API_KEY`: enables AI task suggestions and optional digest/report summaries. Without it, the board and reports still work.
- `GEMINI_MODEL`: override the configured model in `lib/ai.ts`.
- `GITHUB_WEBHOOK_SECRET`: required if using GitHub webhooks; configure the same secret on the repository webhook. Manual sync works without webhooks.
- `GITHUB_TOKEN`: optional server token for GitHub API access. Alternatively, leaders can connect their repository with a token.
- `REPORT_SIGNING_SECRET`: recommended for sealing published reports. If absent, a key is derived from the service-role key; changing either secret will make older signatures unverifiable.

**Security:** Before RLS was enabled, the public anon key could read database tables, including saved GitHub credentials. Rotate any GitHub token that was stored before applying `20260930_lock_down_rls.sql`.

## Workflow

1. Create a project and invite teammates.
2. Add tasks with an assignee and optional size, category and due date. Move them across the board. Shared tasks are split equally unless the assignees agree to another split (or the leader sets one).
3. Connect GitHub if desired. Mention a task key such as `APP-12` in commits or PRs; synced work by an assignee can back up a completed task. A merged PR with `closes APP-12` can move it to Done.
4. Copy a weekly update, then generate a provisional contribution report. Teammates can raise review issues; the leader publishes a versioned public report after reviewing it.

Reports are **estimates, not grades or a substitute for discussion**. Work that cannot be attributed to a teammate counts for no one. Self-reported tasks have a lower verification weight than eligible GitHub-backed or teammate-confirmed tasks. The public report shows task titles, names, shares and unresolved issues; GitHub details are shown only for explicitly public repositories and non-sensitive items.

## Checks

```bash
npm test       # core task-credit and public-data rules
npm run lint   # Next.js lint
npm run build  # production compilation and route checks
```

Core code: `components/workspace/` (board and tabs), `app/api/workspaces/[id]/` (authorized routes), `lib/scoring/engine.ts` (credit calculation), `lib/reports/` (report snapshots and seal), and `supabase/migrations/` (database changes).
