# AI Project Tracker

A lightweight, single-file web application for tracking AI implementation projects across your organization. No installation, no build tools, no dependencies — just open `ai-project-tracker.html` in a browser and go.

---

## Overview

AI Project Tracker provides a centralized dashboard for monitoring the status, progress, and roadmap of AI initiatives. It supports both a table view and a Kanban board, advanced filtering and search, and a three-horizon roadmap planner — all persisted locally in your browser.

---

## Getting Started

1. Open `ai-project-tracker.html` in any modern browser (Chrome, Firefox, Safari, Edge).
2. Click **+ Add Project** to create your first project.
3. Data is saved automatically to your browser's `localStorage` — no server required.

To share data across machines, use the **Export** button to download a JSON backup and **Import** to load it elsewhere.

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
- **Import**: Loads a previously exported `.json` file, replacing current data.

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

## Data Persistence

All data is stored in browser `localStorage` under the key `aiTrackerData`. Data is saved automatically after every create, edit, delete, or roadmap operation.

**Limitations:**
- Data is browser- and device-specific. Clearing browser data will erase projects.
- No real-time sync or multi-user collaboration.
- Use Export/Import to back up or transfer data.

---

## Data Format

Exported files contain a JSON object with two top-level keys:

```json
{
  "projects": [
    {
      "id": "unique-id",
      "name": "Project name",
      "type": "Automation",
      "dept": "Operations",
      "desc": "What this project does",
      "tool": "Claude",
      "use": "Internal",
      "status": "doing",
      "pct": 40,
      "notes": "Milestones, blockers, next steps",
      "createdAt": "2026-04-14T12:00:00.000Z"
    }
  ],
  "roadmap": {
    "soon": ["Item planned for 0–3 months"],
    "mid": ["Item planned for 3–9 months"],
    "later": ["Item planned for 9+ months"]
  }
}
```

**Status values:** `"next"` (Planned), `"doing"` (In Progress), `"done"` (Complete)

---

## Technical Details

| Aspect | Detail |
|--------|--------|
| Implementation | Single HTML file (~107 KB) |
| Languages | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Dependencies | None |
| Storage | Browser `localStorage` |
| Build tools | None required |
| Browser support | Any modern browser with ES6+ and localStorage |

---

## Browser Requirements

- ES6+ JavaScript (classes, arrow functions, template literals, destructuring)
- `localStorage` API
- CSS Grid and Flexbox
- File API (for import/export)

Any browser released after 2017 will work without issue.

---

## Security Note

The application uses an `esc()` utility to HTML-escape all user-provided content before rendering, preventing XSS from stored project data. All data stays local — nothing is sent to a server.
