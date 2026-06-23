# PGH Collab — Client AI Collaboration Platform

Multi-view (Admin / Internal / Client) workspace for managing PGH Networks' AI
consulting engagements: clients → projects/goals/initiatives → notes, meeting
records, roadmaps, estimates, proposals, and (later) real-time whiteboards.

Lives alongside the existing **AI Tracker** app in this repo; this is a
standalone Next.js app under `collab-platform/`.

## Stack

- **Next.js 15 (App Router) + TypeScript** — RBAC enforced server-side in RSCs.
- **Postgres + Prisma** — schema is the RBAC + ingestion contract.
- **Auth.js v5** — Microsoft Entra ID (staff) + Nodemailer magic link (clients).

## Local setup

```bash
cd collab-platform
cp .env.example .env.local        # fill in DATABASE_URL + AUTH_SECRET
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev                       # http://localhost:3000
```

For local magic-link testing run Mailpit:

```bash
docker run -p 1025:1025 -p 8025:8025 axllent/mailpit   # inbox at :8025
```

## RBAC model

| Role | Sees |
|---|---|
| **ADMIN** | Everything + user management + settings |
| **INTERNAL** | All clients/projects/notes/estimates/financials |
| **CLIENT** | Only their own client(s); only `CLIENT_VISIBLE` content; **no** cost/margin data |

All access flows through [`src/lib/rbac.ts`](src/lib/rbac.ts). The same
`canAccessBoard()` used by the API will gate the WebSocket layer in Phase 4, so a
client can never receive realtime updates for a board they can't access.

## Pluggable Fireflies ingestion

`MeetingRecord` carries `source` (`MANUAL` | `API`), `provider`, and
`externalId`. Manual paste (Phase 1) and the future Fireflies API sync (Phase 5)
write the **same** row; API sync upserts on `(provider, externalId)`. No
schema/UI/search change is needed to add the adapter later.

## Phases

1. **Foundation (done):** auth, schema, RBAC, clients/projects, role views.
2. **Knowledge & capture (done):** notes (rich text + visibility gate), Fireflies
   `MeetingRecord` manual entry + searchable archive, quick links. Ingestion
   adapter interface in `src/lib/ingestion/` (manual now, Fireflies API stubbed).
3. **Planning & financials (done):** roadmap with Gantt-style timeline + budgets
   (internal-only lines hidden from clients), internal cost/effort calculator
   (cost + margin, staff-only), and client-facing proposals generated from an
   estimate — sell-side only, shareable at `/p/<token>`.
4. Real-time whiteboard (Yjs self-host vs Liveblocks — TBD).
5. Fireflies API ingestion adapter.

## Deployment — LIVE (independent of AI Tracker)

Provisioned in the **AI Playground** subscription (`eastus2`), fully separate
from AI Tracker:

| Resource | Name |
|---|---|
| Resource group | `rg-collab-platform` |
| Container registry | `pghcollabacr` (image `collab`) |
| Postgres Flexible Server | `pgh-collab-db` / db `pgh_collab` |
| Container Apps env | `collab-env` |
| Container App | `collab-app` (ingress 3000) |

`DATABASE_URL` and `AUTH_SECRET` are stored as Container App **secrets** (not in
GitHub). The container runs `prisma migrate deploy` on start. `AUTH_DISABLED=true`
is set until auth is re-enabled — **the app is currently open on the public
internet with no login**.

### Redeploy after changes

```bash
./scripts/redeploy.sh   # builds in ACR + rolls a new revision (uses your az login)
```

### CI auto-deploy (not yet enabled)

`.github/workflows/deploy-collab.yml` is **manual-only** (`workflow_dispatch`).
Auto-deploy on push needs an Azure admin to create a service principal with
Contributor on `rg-collab-platform` + AcrPull on `pghcollabacr`, stored as the
GitHub secret `COLLAB_AZURE_CREDENTIALS` (the existing `AZURE_CREDENTIALS` is
scoped to a different subscription). Until then, use `redeploy.sh`.

> `scripts/provision-azure.sh` documents a from-scratch rebuild; the live env
> above was provisioned with these same steps.

## Flagged third-party / paid

- **Microsoft Entra ID** app registration (free; needs tenant admin).
- **SMTP** for magic links (Mailpit locally; M365/SendGrid in prod).
- **Whiteboard transport** (Phase 4): self-hosted Yjs = infra only; **Liveblocks = paid per-MAU**.
- **Fireflies API** (Phase 5): paid plan + API key.
