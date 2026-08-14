# TeamTrack AI — 1-Day Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- A GitHub account (for OAuth)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Note your **Service Role Key** (Settings → API → service_role key)

## Step 2: Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this repo
3. Run the entire SQL script
4. This creates all tables, indexes, RLS policies, and triggers

## Step 3: Configure GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - Application name: `TeamTrack AI`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Note the **Client ID** and generate a **Client Secret**

## Step 4: Enable GitHub Provider in Supabase

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **GitHub** and enable it
3. Paste your GitHub Client ID and Client Secret
4. Save

## Step 5: Set Environment Variables

Copy `.env.local` and fill in your values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 6: Install & Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000

## Step 7: Project Structure (Place Files)

```
teamtrack-ai/
├── app/
│   ├── api/
│   │   ├── workspaces/
│   │   │   ├── route.ts                    ← api-workspaces-v2.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts              ← api-workspace-detail.ts
│   │   │       ├── sync/
│   │   │       │   └── route.ts          ← api-sync.ts
│   │   │       └── reports/
│   │   │           └── generate/
│   │   │               └── route.ts      ← api-report-generate-v2.ts
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts              ← auth-callback.ts
│   ├── dashboard/
│   │   └── page.tsx                      ← dashboard-page.tsx
│   ├── login/
│   │   └── page.tsx                      ← login-page.tsx
│   ├── workspaces/
│   │   ├── new/
│   │   │   └── page.tsx                  ← new-workspace-page.tsx
│   │   └── [id]/
│   │       ├── page.tsx                  ← workspace-detail-page.tsx
│   │       └── reports/
│   │           └── [reportId]/
│   │               └── page.tsx            ← report-page.tsx
│   ├── layout.tsx                        ← layout.tsx
│   └── globals.css                       ← globals.css
├── components/
│   └── ui/                               # shadcn components (install as needed)
├── lib/
│   ├── utils.ts                          ← utils.ts
│   ├── supabase/
│   │   ├── client.ts                     ← supabase-client.ts
│   │   ├── server.ts                     ← supabase-server.ts
│   │   └── middleware.ts                 ← supabase-middleware.ts
│   ├── scoring/
│   │   └── engine.ts                     ← engine.ts
│   └── integrations/
│       └── github.ts                     ← github.ts
├── types/
│   └── index.ts                          ← types-index.ts
├── middleware.ts                         ← middleware.ts
├── next.config.mjs                       ← next.config.mjs
├── tailwind.config.ts                    ← tailwind.config.ts
├── tsconfig.json                         ← tsconfig.json
├── package.json                          ← package.json
├── .env.local                            ← .env.local
└── supabase/
    └── schema.sql                        ← schema.sql
```

## Step 8: Seed Demo Data (Optional)

After the app is running and you've created a workspace:

1. Go to Supabase SQL Editor
2. Run the seed queries (or create a seed script)
3. The seed creates a 5-person hackathon team with realistic evidence patterns

## Common Issues

### "Failed to fetch" errors
- Make sure your Supabase URL and Anon Key are correct in `.env.local`
- Check that RLS policies are enabled and correct

### GitHub OAuth not working
- Verify the callback URL in GitHub OAuth app matches your Supabase auth callback
- Make sure GitHub provider is enabled in Supabase Auth settings
- Check that `provider_token` is requested in the OAuth scope

### Database errors
- Run `schema.sql` completely — don't skip any sections
- Make sure the `auth.users` table exists (created automatically by Supabase Auth)

## What Works Out of the Box

✅ GitHub OAuth login
✅ Create workspace with categories
✅ Workspace lifecycle (Draft → Active → Frozen → Review)
✅ GitHub evidence sync (commits, PRs, issues, reviews)
✅ Auto-identity mapping by GitHub username
✅ Manual evidence submission (via API)
✅ Rule-based scoring with explainability
✅ Provisional report with confidence levels
✅ Evidence timeline with bot detection
✅ Category breakdown visualization
✅ PDF export button (UI only — needs react-pdf wiring)
✅ RLS security policies
✅ Audit logging

## What's Stubbed / Needs Your Touch

⚠️ **Manual evidence form page** — UI not built, API exists
⚠️ **PDF export** — Button exists, needs react-pdf implementation
⚠️ **Dispute workflow** — UI exists, API needs full implementation
⚠️ **Email notifications** — Not implemented (in-app only)
⚠️ **CSV import** — API stubbed, needs UI
⚠️ **Share links** — Not implemented
⚠️ **Admin dashboard** — Not implemented

## Next Steps After Day 1

1. **Day 2**: Wire up manual evidence form, test scoring with real data
2. **Day 3**: Implement dispute workflow, add PDF export
3. **Day 4**: Polish UI, add CSV import, test edge cases
4. **Day 5**: Deploy to Vercel, run pilot with real team

## Need Help?

- Check Supabase logs in Dashboard → Logs
- Check browser console for frontend errors
- Use Supabase Table Editor to inspect data directly
