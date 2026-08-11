# Features

Every feature of the Inventory Management System, grouped by area. Feature status: ✅ implemented.

## 1. Product Management

- ✅ **Create products** — SKU, name, description, category, price, cost, reorder point, reorder quantity, supplier, location, and initial stock.
- ✅ **List products** — paginated listing (default 20 per page, max 100).
- ✅ **Get product by ID** — `GET /api/v1/products/{id}`.
- ✅ **Get product by SKU** — `GET /api/v1/products/sku/{sku}`.
- ✅ **Update products** — PATCH partial update of any editable field.
- ✅ **Delete products** — removes product, its alerts, and its inventory logs.
- ✅ **Duplicate SKU protection** — creating/updating to an existing SKU returns `409 Conflict`.
- ✅ **Validation** — required fields, price ≥ 0, non-negative stock, `422` on invalid input.
- ✅ **Search** — case-insensitive text search across SKU and name.
- ✅ **Filters** — by category, supplier, location, and computed stock status.
- ✅ **Sorting** — by SKU, name, category, price, stock, availability, created date (asc/desc).
- ✅ **Seed data** — `POST /api/v1/products/seed?count=N` inserts up to 1000 demo products.
- ✅ **Distinct categories** — `GET /api/v1/products/categories`.

## 2. Inventory Tracking

- ✅ **Adjust stock** — add or subtract quantity with a reason and optional reference; rejects zero and insufficient stock.
- ✅ **Reserve stock** — hold quantity for orders (tracked separately from current stock).
- ✅ **Release stock** — free previously reserved quantity; rejects releasing more than reserved.
- ✅ **Available stock** — computed as `current_stock - reserved_stock` on every product.
- ✅ **Stock status** — computed per product: `in_stock`, `low_stock`, `critical`, `out_of_stock`.
- ✅ **Inventory logs** — paginated audit trail of every change with previous/new stock, quantity, type, reason, and reference.
- ✅ **Log filtering** — by change type (`in`, `out`, `adjustment`, `reserve`, `release`) and by product.

## 3. Alerts

- ✅ **Automatic alert generation** — created whenever a product crosses a threshold:
  - `out_of_stock` — 0 units available.
  - `critical_stock` — available ≤ critical threshold (default 3).
  - `low_stock` — available ≤ reorder point (above critical).
  - `reorder_needed` — available within `REORDER_NEARBY_MARGIN` (default 5) of the reorder point.
- ✅ **Alert refresh** — re-evaluated on product create, update, and stock changes; old open alerts auto-acknowledged.
- ✅ **List alerts** — paginated, sorted newest first.
- ✅ **Filter alerts** — by type and unread-only.
- ✅ **Acknowledge / dismiss** — marks alert read with the acknowledging user and timestamp.
- ✅ **Auto-cleanup** — acknowledged alerts older than 30 days are deleted by the background agent.

## 4. Dashboard

- ✅ **Statistics** — total products, low stock count, critical stock count, out-of-stock count.
- ✅ **Total inventory value** — summed `current_stock × price` across all products.
- ✅ **Alert totals** — total and unread alerts.
- ✅ **Category breakdown** — top 10 categories by product count.

## 5. Background Agent (StockPilot)

- ✅ **Scheduled inventory checks** — runs every `AGENT_CHECK_INTERVAL_MINUTES` (default 5).
- ✅ **Startup check** — runs once on application startup.
- ✅ **Daily summary** — printed at 24-hour intervals (total products, stock counts, value, alerts).
- ✅ **Alert cleanup job** — daily purge of acknowledged alerts older than 30 days.
- ✅ **Agent status endpoint** — running state, interval, next run, job list.
- ✅ **Manual check trigger** — `POST /api/v1/agent/check`.

## 6. API & Platform

- ✅ **REST API under `/api/v1`** — products, inventory, alerts, dashboard, agent.
- ✅ **Interactive docs** — auto-generated Swagger UI at `/docs`.
- ✅ **Health check** — `GET /health`.
- ✅ **CORS** — configurable allowed origins (defaults include the Vite dev server).
- ✅ **Structured error handling** — `404`, `409`, `400`, `422` with consistent `{ "detail": ... }` payloads.
- ✅ **Pagination** — consistent `Page` envelope (`items`, `total`, `page`, `page_size`, `pages`) across lists.

## 7. Frontend (React + Vite + Tailwind)

- ✅ **Dashboard page** — stat cards, category breakdown, recent products, live inventory view.
- ✅ **Products page** — search, filters, sorting, pagination, create/edit/delete forms, adjust/reserve/release actions.
- ✅ **Alerts page** — filter by type, unread toggle, dismiss action, pagination.
- ✅ **Logs page** — full audit trail with type filtering and product filter, pagination.
- ✅ **Layout & navigation** — sidebar navigation across all pages.
- ✅ **Dark mode** — theme toggle persisted to localStorage.
- ✅ **Toast notifications** — success/error feedback for all actions.
- ✅ **Modals & confirmations** — form dialogs and destructive-action confirmation.
- ✅ **Responsive design** — Tailwind utilities, tables with horizontal scroll on small screens.

## 8. Developer Experience

- ✅ **Tests** — 25 pytest tests covering products, inventory, alerts, and dashboard.
- ✅ **In-memory database testing** — tests run on `mongomock-motor`, no local MongoDB required.
- ✅ **Vite dev proxy** — `/api` forwarded to the FastAPI backend during development.
- ✅ **Startup script** — `scripts/start.py` launches backend + frontend together.
- ✅ **Configurable via environment** — MongoDB URL, database name, thresholds, SMTP, CORS.
