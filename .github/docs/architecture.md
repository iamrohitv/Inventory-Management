# Architecture

## Overview

The system is a **two-tier application**:

- **Backend** — FastAPI (Python) exposing a REST API under `/api/v1`, backed by MongoDB via the async Motor driver. A background agent (APScheduler) monitors inventory, generates alerts, and runs daily jobs.
- **Frontend** — Single-page application built with React 18 + Vite + Tailwind CSS. It talks to the backend exclusively through the REST API; in development the Vite server proxies `/api` to the backend.

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│        Frontend              │       │         Backend              │
│   React 18 + Vite + Tailwind │ ────► │   FastAPI (uvicorn)          │
│   Pages: Dashboard, Products │ /api  │   ┌──────────────────────┐   │
│   Alerts, Logs               │       │   │ Services             │   │
│   src/api → fetch /api/v1    │       │   │  product / alert /   │   │
│                              │       │   │  dashboard            │   │
└──────────────────────────────┘       │   ├──────────────────────┤   │
                                       │   │ Models + Schemas     │   │
                                       │   │ (Pydantic)           │   │
                                       │   ├──────────────────────┤   │
                                       │   │ Background Agent     │   │
                                       │   │ (APScheduler)        │   │
                                       │   └──────────┬───────────┘   │
                                       └──────────────┼───────────────┘
                                                      ▼
                                               ┌──────────────┐
                                               │   MongoDB    │
                                               │ (Motor, async│
                                               └──────────────┘
```

## Repository Layout

```
backend/
  app/
    api/routes/     # HTTP endpoints: products, inventory, alerts, dashboard, agent
    api/deps.py     # Dependency injection for services
    models/         # Mongo/Pydantic documents (product, alert, inventory_log)
    schemas/        # API request/response models (Page, ProductResponse, …)
    services/       # Business logic (product, alert, dashboard)
    agents/         # Background inventory agent
    core/           # config, database, exceptions
  tests/            # pytest suite (runs on in-memory MongoDB)
frontend/
  src/
    pages/          # Dashboard, Products, Alerts, Logs
    components/     # Reusable UI (Layout, Modal, Pagination, …)
    context/        # Toast notifications
    hooks/          # useTheme
    api/            # REST client + endpoint wrappers
```

## Key Design Decisions

- **Separate DB models vs API schemas.** `*InDB` models keep the Mongo field alias `_id`; response schemas expose it as `id`. FastAPI serializes response models by alias, so keeping aliases off the response layer is what makes the API return `id`.
- **Computed stock status in the database.** Availability (`current - reserved`) and stock-status filters are expressed as Mongo `$expr` queries so filtering + pagination counts stay correct.
- **Alert refresh on every mutation.** Products and stock changes re-evaluate open alerts, keeping the alerts collection consistent.
- **In-memory DB for tests.** `mongomock-motor` lets the suite run without a live MongoDB; `tests/conftest.py` overrides the service dependencies with test doubles bound to the mock database.
- **Vite dev proxy.** No CORS friction in development — `/api` requests are forwarded to `http://localhost:8000`.

---

# Change Log

Chronological record of what changed and why, tagged by area (**Frontend** / **Backend** / **Docs / Tooling**).

## 2026-08-06 — Initializing Project (`653c18b`)

- **Backend / Frontend** — Initial scaffolding: a FastAPI backend (`app/api`, `app/services`, `app/models`) and a static HTML + vanilla JS frontend, plus a startup script (`scripts/start.py`).
- **Why** — Establish the project skeleton and get a runnable inventory application.

## 2026-08-09 — Reframing things (`0b22f0a`)

- **Tooling** — Moved the project out of the nested `ecommerce-inventory/` directory to the repository root.
- **Why** — Flatten the repo layout so `backend/`, `frontend/`, and `scripts/` sit at the top level.

## 2026-08-09 — Modifying gitignore file (`4aa0d87`)

- **Tooling** — Extended `.gitignore` (ignore `environment/` and `query` artifacts).
- **Why** — Keep local/generated files out of version control.

## 2026-08-11 — Redesign dashboard and add theme toggle (`b39102e`)

- **Frontend** — Reworked the single-page dashboard UI and added a light/dark theme toggle in `frontend/index.html` / `frontend/js/app.js`.
- **Why** — Improve the look and feel of the dashboard and support dark mode.

## 2026-08-12 — Rebuild inventory system: React frontend + layered backend (`0933647`)

This is the major architectural rewrite.

### Frontend
- Replaced the static HTML/vanilla-JS app with **React 18 + Vite + Tailwind CSS**.
- Added routing (`react-router-dom`) with four pages: **Dashboard**, **Products**, **Alerts**, **Logs**.
- Built a reusable component set: `Layout` (sidebar nav), `Modal`, `ConfirmDialog`, `Pagination`, `StatCard`, `StatusBadge`, `StockBar`, `Spinner`, `EmptyState`, `Icon`.
- Added a typed REST client (`src/api/`) and a toast notification context.
- Added product CRUD forms, stock adjust/reserve/release actions, search/filter/sort/pagination, alert dismissal, and a paginated log viewer.
- **Why** — The old single-file JS app was hard to extend; a componentized React app gives structure, maintainability, and a modern UI.

### Backend
- Reorganized into clear layers: `api/routes`, `models`, `schemas`, `services`, plus `core/exceptions`.
- Added typed request/response schemas and a generic `Page` pagination envelope.
- Added a `DashboardService` with a MongoDB aggregation pipeline for stock counts, inventory value, and category breakdown.
- **Why** — Separate concerns and make the API contract explicit.

### Bug fixes (why the rebuild was needed)
- **`id` vs `_id` serialization** — FastAPI serializes response models by alias, so `id` was being returned as `_id`. Split DB models from response schemas so the API consistently returns `id`.
- **Route ordering** — `/products/sku/{sku}` was shadowed by `/products/{product_id}`. Moved the static route above the parameterized one.
- **`quantity=0` accepted** — Pydantic v2 silently ignores the deprecated `Field(ne=0)`. Replaced with an explicit validator.
- **Dashboard value always 0** — the aggregation's `$project` dropped `current_stock` before `$multiply`. Removed the intermediate stage.
- **Stock-status pagination** — filtering happened after pagination in Python, producing wrong totals. Moved it into a Mongo `$expr` query.
- **Alerts not created on product create** — `create_product` now triggers alert refresh.

### Testing & tooling
- Added a pytest suite (25 tests) covering products, inventory, alerts, and dashboard.
- Tests run against **mongomock-motor** (in-memory MongoDB), so CI/dev need no local MongoDB.
- Updated `README.md`, `.gitignore`, `.env.example`, and `scripts/start.py` (frontend now launched via `npm run dev`).
- **Why** — Prove correctness after the rewrite and lower the barrier to contributing.

---

## Planned / Next

- Docker Compose for backend + frontend + MongoDB.
- Email notifications (config exists; SMTP wiring is present but untested end-to-end).
- CSV export of inventory.
- User authentication / roles.
