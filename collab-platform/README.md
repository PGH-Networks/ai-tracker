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
3. Planning & financials: roadmap, budget, internal calculator, client proposal.
4. Real-time whiteboard (Yjs self-host vs Liveblocks — TBD).
5. Fireflies API ingestion adapter.

## Deployment (independent of AI Tracker)

This app has its own pipeline (`.github/workflows/deploy-collab.yml`), triggered
only by changes under `collab-platform/**`. It builds the `collab` image in the
shared ACR and deploys to its own Container App with its own database.

**One-time Azure setup:** run [`scripts/provision-azure.sh`](scripts/provision-azure.sh)
in [Azure Cloud Shell](https://shell.azure.com). It creates the Postgres Flexible
Server + database, the `collab-app` Container App (ingress on 3000), wires ACR pull
via managed identity, and sets `DATABASE_URL` / `AUTH_SECRET` as Container App
secrets (generated in-shell — they never touch GitHub). Idempotent; safe to re-run.

**Only GitHub secret needed:** `AZURE_CREDENTIALS` (already present for AI Tracker).
The Container App secrets persist across deploys, and the container runs
`prisma migrate deploy` on start. `AUTH_DISABLED=true` is set until auth is re-enabled.

## Flagged third-party / paid

- **Microsoft Entra ID** app registration (free; needs tenant admin).
- **SMTP** for magic links (Mailpit locally; M365/SendGrid in prod).
- **Whiteboard transport** (Phase 4): self-hosted Yjs = infra only; **Liveblocks = paid per-MAU**.
- **Fireflies API** (Phase 5): paid plan + API key.
