# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies (express, pg)
npm start          # Start server on port 3000 (node server.js)
```

Requires `DATABASE_URL` env var pointing to a PostgreSQL instance. Copy `.env.example` to `.env` and fill in credentials.

## Architecture

**AI Project Tracker** — A full-stack web app for PGH Networks to track AI implementation projects across the organization.

- **`server.js`** — Express backend. Initializes the PostgreSQL DB on startup (`initDb()`), serves REST API endpoints, and falls back to `public/index.html` for all other routes.
- **`public/index.html`** — The entire frontend: HTML structure, CSS (including all component styles), and ~600 lines of vanilla JS. There is no build step — it's served as-is.
- **`schema.sql`** — Reference schema (tables are auto-created by `server.js` on startup via `CREATE TABLE IF NOT EXISTS`).

### Data Flow

All data is fetched from the API on page load (`loadData()`). Filtering, sorting, and view-switching are entirely client-side. Writes go back to the API immediately on user action.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | All projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/roadmap` | All roadmap items grouped by bucket |
| PUT | `/api/roadmap` | Replace all roadmap items `{soon, mid, later}` |

### Database Tables

**projects** — `id TEXT PK`, `name`, `type`, `dept`, `description`, `tool`, `use_case`, `status` (`next`/`doing`/`done`), `pct` (0–100), `notes`, `champion`, `created_at`

**roadmap_items** — `id SERIAL PK`, `bucket` (`soon`/`mid`/`later`), `text`, `sort_order`, `created_at`

### Frontend State

```js
let projects = [];
let roadmap = { soon: [], mid: [], later: [] };
let currentView = 'table'; // or 'kanban'
let sortCol, sortDir;
```

Key functions: `renderAll()` → `renderTable()` / `renderKanban()` / `renderRoadmap()`. Filters computed in `getFiltered()`. Stats in `updateStats()`. `statusIcon(s)` returns an `<img>` tag for the appropriate SVG status icon.

## Branding

PGH Networks brand colors: navy `#02264F`, green `#68F98F`. The header uses a diagonal gradient between these. Status colors, progress bars, and kanban dots follow the same palette.

### Status Icons

SVG icons live in `public/icons/` and are used in stat cards, table status badges, and kanban column headers:

| File | Status |
|------|--------|
| `icon-done.svg` | Complete |
| `icon-in-progress.svg` | In Progress |
| `icon-planned.svg` | Planned |

CSS classes: `.status-icon` (32px, stat cards), `.status-badge-icon` (14px, table badges), `.kanban-status-icon` (22px, kanban headers).

### UI Layout

- **Header** — Logo, title, Export JSON, Import buttons only.
- **Controls bar** — Horizontal filter row (Search, Status, Department, AI Tool, Use) with labels stacked above inputs. `+ Add Project` button and Table/Kanban view toggle are right-aligned via `.view-toggle`.
- **Stats bar** — 5 cards in a single row: Total, Complete, In Progress, Planned, Avg Complete.

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`): builds a Docker image in Azure Container Registry (`aitrackeracr`) and deploys to Azure Container App (`aitracker-app`). Live at **https://aitracker.pghnetworks.com**.

Requires `AZURE_CREDENTIALS` GitHub secret (service principal JSON).
