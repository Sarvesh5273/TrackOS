# TeamTrack AI

AI-Powered Contribution Tracker for Student Startups and Hackathon Teams

## Quick Start

```bash
# 1. Clone and install
npx create-next-app@latest teamtrack-ai --typescript --tailwind --eslint --app --src-dir

cd teamtrack-ai

# 2. Install dependencies
npm install @prisma/client prisma @octokit/rest next-auth zod bcryptjs
npm install -D @types/bcryptjs

# 3. Setup database
npx prisma init
# Copy schema.prisma from /lib/schema.prisma
npx prisma migrate dev --name init
npx prisma db seed

# 4. Setup auth
# Copy .env.example to .env.local and fill in values

# 5. Run
npm run dev
```

## Project Structure

```
├── app/
│   ├── api/           # API routes (workspaces, evidence, reports, auth)
│   ├── (dashboard)/   # Dashboard layout
│   └── ...
├── components/
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── db.ts          # Prisma client
│   ├── auth.ts        # NextAuth config
│   ├── scoring/
│   │   └── engine.ts  # Core scoring algorithm (SRS 9.3)
│   └── integrations/
│       └── github.ts  # GitHub sync service
├── types/
│   └── index.ts       # TypeScript types matching SRS
├── prisma/
│   ├── schema.prisma  # Database schema (SRS 7.1)
│   └── seed.ts        # Demo data
└── public/
```

## Key Features Implemented

### Week 1: Foundation + Evidence
- [x] Auth (NextAuth.js, GitHub OAuth)
- [x] Workspace CRUD with lifecycle states
- [x] Membership + invitations
- [x] GitHub integration (commits, PRs, issues, reviews)
- [x] Evidence normalization + identity mapping
- [x] Manual evidence submission
- [x] CSV import
- [x] Rule-based scoring engine (SRS 9.3)

### Week 2: Reports + Review
- [x] Provisional report generation
- [x] Explainability (evidence→score trace)
- [x] Confidence calculation (High/Med/Low)
- [x] Review window + disputes
- [x] PDF export
- [x] Shareable links

### Week 3: Harden
- [x] RBAC enforcement
- [x] Audit logging
- [x] Security hardening
- [x] Seed data + E2E tests

## Scoring Algorithm

See `lib/scoring/engine.ts` for the full implementation of SRS Section 9.3:

```
V_{m,e,c} = B_e × I_e × A_{m,e} × Q_e × D_e
S_m = 100 × Σ_c(W_c × N_{m,c}) / Σ_jΣ_c(W_c × N_{j,c})
```

Where:
- **B_e**: Base weight for evidence type
- **I_e**: Impact/significance factor
- **A_{m,e}**: Attribution share + confidence
- **Q_e**: Verification quality factor
- **D_e**: Duplication/spam control
- **W_c**: Category weight
- **N_{m,c}**: Normalized category value

## Demo Data

Run `npx prisma db seed` to create a realistic 5-person hackathon team:

| Member | Role | Evidence Pattern |
|--------|------|-----------------|
| Alice | Team Lead + Full-stack | 45 commits, mixed impact |
| Bob | Frontend | 20 commits + 1 major PR |
| Carol | Designer | Minimal GitHub, heavy manual evidence |
| Dave | QA | Low volume, critical bug discovery |
| Eve | Coordinator/Pitch | Almost no code, manual coordination |

Plus: 30 bot commits (dependabot) to test spam detection.

## SRS Compliance

This implementation targets the MVP requirements from the SRS:
- SF-01 through SF-09 (Must requirements)
- NFR-SEC-01 through NFR-SEC-12 (Security)
- NFR-FAIR-01 through NFR-FAIR-08 (Fairness)
- BR-01 through BR-14 (Business Rules)

Post-MVP items (Figma/Notion adapters, advanced AI, email notifications) are documented but not implemented.
