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

**One-time Azure setup:**

```bash
# Database (its own Flexible Server)
az postgres flexible-server create -g rg-aitracker -n pgh-collab-db \
  --location eastus --admin-user pghadmin --admin-password '<PW>' \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --public-access 0.0.0.0
az postgres flexible-server db create -g rg-aitracker -s pgh-collab-db -d pgh_collab

# Container App (its own app, ingress on 3000)
az containerapp create -g rg-aitracker -n collab-app \
  --environment <your-container-app-env> \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 3000 --ingress external \
  --registry-server aitrackeracr.azurecr.io
```

**Required GitHub secrets:** `AZURE_CREDENTIALS` (existing), `COLLAB_DATABASE_URL`,
`COLLAB_AUTH_SECRET`. The workflow injects `DATABASE_URL`/`AUTH_SECRET` as Container
App secrets and runs `prisma migrate deploy` on container start. `AUTH_DISABLED=true`
is set until we re-enable auth.

## Flagged third-party / paid

- **Microsoft Entra ID** app registration (free; needs tenant admin).
- **SMTP** for magic links (Mailpit locally; M365/SendGrid in prod).
- **Whiteboard transport** (Phase 4): self-hosted Yjs = infra only; **Liveblocks = paid per-MAU**.
- **Fireflies API** (Phase 5): paid plan + API key.
