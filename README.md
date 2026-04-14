# AI Project Tracker

A web application for tracking AI implementation projects across your organization. Deployed as a containerized Node.js app on Azure with PostgreSQL for persistent storage.

**Live:** [https://aitracker.pghnetworks.com](https://aitracker.pghnetworks.com)

---

## Overview

AI Project Tracker provides a centralized dashboard for monitoring the status, progress, and roadmap of AI initiatives. It supports both a table view and a Kanban board, advanced filtering and search, and a three-horizon roadmap planner — all backed by a PostgreSQL database.

---

## Architecture

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | Node.js + Express |
| Database | Azure Database for PostgreSQL Flexible Server |
| Hosting | Azure Container App |
| Container Registry | Azure Container Registry |
| CI/CD | GitHub Actions |
| Domain | aitracker.pghnetworks.com (Cloudflare DNS) |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- PostgreSQL (local or remote)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/PGH-Networks/ai-tracker.git
   cd ai-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set the database connection string:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/aitracker"
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

The server automatically creates the required database tables on startup.

---

## Deployment

The app is deployed to Azure Container Apps via GitHub Actions. Every push to `main` triggers:

1. **Build** — Docker image is built in Azure Container Registry
2. **Deploy** — Container App is updated with the new image

### Azure Resources

| Resource | Name |
|----------|------|
| Resource Group | `rg-aitracker` |
| Container Registry | `aitrackeracr` |
| PostgreSQL Server | `aitracker-db` |
| Container App Environment | `aitracker-env` |
| Container App | `aitracker-app` |

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON for Azure login |

---

## Features

### Dashboard Statistics
- Total project count
- Count by status (Complete, In Progress, Planned)
- Average completion percentage across all projects

### Project Table View
- Sortable columns: Name, Type, Department, Tool, Use Case, Status, Completion
- Expandable description rows
- Inline status badges and progress bars
- Edit and delete controls per row

### Kanban Board View
- Three columns: **Planned / Next**, **In Progress**, **Complete**
- Card layout showing department, tool, use case, completion, and notes

### Filtering & Search
- Filter by Status, Department, AI Tool, and Use Case
- Full-text search across: name, type, department, tool, use case, description, notes
- All filters combine with AND logic

### Roadmap Planning
Three time-horizon buckets for future initiatives:
| Bucket | Timeframe |
|--------|-----------|
| Soon | 0–3 months |
| Mid-term | 3–9 months |
| Future Vision | 9+ months |

Add and remove roadmap items independently from tracked projects.

### Import / Export
- **Export**: Downloads all projects and roadmap data as a timestamped `.json` file.
- **Import**: Loads a previously exported `.json` file into the database.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `GET` | `/api/roadmap` | Get roadmap items by bucket |
| `PUT` | `/api/roadmap` | Replace all roadmap items |

---

## Project Fields

| Field | Description | Options |
|-------|-------------|---------|
| Name | Project name | Free text (required) |
| Type | Category of AI work | See [Project Types](#project-types) |
| Department | Owning department | Help Desk, Operations, Finance, Sales & Marketing |
| AI Tool | Primary tool in use | Claude, Hatz, Co-Pilot, N8N, Other |
| Use Case | Audience / deployment scope | Internal, Client-Facing, Both, External / Public |
| Status | Current lifecycle stage | Planned, In Progress, Complete |
| Completion % | Numeric progress (0–100) | Integer |
| Description | What the project does | Free text |
| Notes | Milestones, blockers, next steps | Free text |

### Project Types
- Automation
- Chatbot / Assistant
- Analytics & Reporting
- Document Processing
- Content Generation
- Data Analysis
- Workflow Integration
- Training & Enablement
- Other

---

## Database Schema

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  dept TEXT,
  description TEXT,
  tool TEXT,
  use_case TEXT,
  status TEXT DEFAULT 'next',
  pct INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roadmap (
  id SERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

**Status values:** `"next"` (Planned), `"doing"` (In Progress), `"done"` (Complete)

---

## Docker

Build and run locally:

```bash
docker build -t aitracker .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://user:pass@host:5432/aitracker" aitracker
```
