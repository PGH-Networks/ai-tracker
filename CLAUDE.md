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

### Project Field Options

| Field | Options |
|-------|---------|
| **Type** | Automation, Chatbot / Assistant, Analytics & Reporting, Document Processing, Content Generation, Data Analysis, Workflow Integration, Training & Enablement, Software Development, Other |
| **Department** | Help Desk, Operations, Finance, Sales & Marketing |
| **AI Tool** | Claude, Hatz, Co-Pilot, N8N, Other |
| **Use Case** | Internal, Client-Facing, Both, External / Public |
| **Status** | `done` (Complete), `doing` (In Progress), `next` (Planned) |
| **Champion** | Bill, Chad, Chris, Derek, Dylan, Geno, Greg, Howard, Isaac, Jeremy, Jessica, Josh D, Josh W, Lauren, Mark, Matt Shaginaw, Sean, Tony |

### Frontend State

```js
let projects = [];
let roadmap = { soon: [], mid: [], later: [] };
let currentView = 'table'; // or 'kanban'
let sortCol, sortDir;
```

Key functions: `renderAll()` → `renderTable()` / `renderKanban()` / `renderRoadmap()`. Filters computed in `getFiltered()`. Stats in `updateStats()`. `statusIcon(s)` returns an `<img>` tag for the appropriate SVG status icon.

## Branding

PGH Networks brand colors: navy `#02264F`, green `#68F98F`. The header uses a diagonal gradient between these. All interactive accents (focus rings, active buttons, sort indicators, form saves) use `--primary: #02264F` — there is no purple in the design.

**Typography:** [Syne](https://fonts.google.com/specimen/Syne) (600–800 weight) for headings (`h1, h2, h3`); [DM Sans](https://fonts.google.com/specimen/DM+Sans) for body text and stat numbers. Loaded via Google Fonts in `<head>`. Stat numbers use DM Sans specifically to avoid the flattened numeral appearance of Syne.

### CSS Variables

| Variable | Value | Used for |
|----------|-------|----------|
| `--primary` | `#02264F` | Buttons, focus, active states |
| `--primary-dark` | `#175184` | Hover darken |
| `--done-color` | `#68F98F` | Complete status |
| `--doing-color` | `#02264F` | In Progress status |
| `--next-color` | `#f59e0b` | Planned status |
| `--info` | `#175184` | Avg Complete stat |

### Status Icons

SVG icons live in `public/icons/` and are used in stat cards, table status badges, and kanban column headers:

| File | Status |
|------|--------|
| `icon-done.svg` | Complete |
| `icon-in-progress.svg` | In Progress |
| `icon-planned.svg` | Planned |

CSS classes: `.status-icon` (32px, stat cards), `.status-badge-icon` (14px, table badges), `.kanban-status-icon` (22px, kanban headers).

### UI Layout

Three visually distinct bands at the top of the page:

1. **Header** (`#02264F` solid navy) — Logo, title, Export JSON, Import buttons. Syne font title, `32px` vertical padding.
2. **AI Site Links** (`#68F98F` PGH green) — Collapsible shared link dashboard. Navy text/cards on green background; cards flip to navy-on-white on hover. See [AI Site Links](#tools-hub) section below.
3. **Stats bar** (white) — 5 cards in a single row, each with a colored left-border accent matching its status color.

- **Controls bar** — Horizontal filter row (Search, Status, Department, AI Tool, Use) with labels stacked above inputs (`flex-direction: column`). `+ Add Project` (navy) and Table/Kanban toggle are right-aligned via `.view-toggle`.
- **Empty state** — Includes a live `+ Add Project` button so users can act without scrolling back to the controls bar.
- **Roadmap header** — Plain text heading (no emoji), Syne font.

## AI Site Links

A shared, persistent link dashboard stored in PostgreSQL — every visitor sees the same links in real time.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tools` | All tool links |
| POST | `/api/tools` | Create `{ label, url }` |
| PUT | `/api/tools/:id` | Update label/URL |
| DELETE | `/api/tools/:id` | Remove link |

### Database Table

**tool_links** — `id SERIAL PK`, `label TEXT`, `url TEXT`, `sort_order INT`, `created_at TIMESTAMPTZ`

### Frontend

- State: `let tools = []` — fetched in `loadData()` alongside projects and roadmap
- `renderHub()` — builds card grid, auto-fetches favicons via `https://www.google.com/s2/favicons?domain=<origin>&sz=32`
- `saveTool()` — POST or PUT with duplicate-submit guard (`saving` flag)
- `deleteTool(id)` — DELETE with confirm prompt
- `toggleHub()` — collapses/expands the hub body
- URLs auto-prefixed with `https://` if scheme is missing

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`): builds a Docker image in Azure Container Registry (`aitrackeracr`) and deploys to Azure Container App (`aitracker-app`). Live at **https://aitracker.pghnetworks.com**.

Requires `AZURE_CREDENTIALS` GitHub secret (service principal JSON).
