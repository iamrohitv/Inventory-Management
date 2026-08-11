# E-Commerce Inventory Manager

A complete inventory management system with automated stock monitoring, built with FastAPI, MongoDB, and React.

## Documentation

| File | Purpose |
|------|---------|
| [`feature.md`](feature.md) | Every feature in the system |
| [`architecture.md`](architecture.md) | Architecture overview and dated change log |
| [`../assets/`](../assets/) | Screenshots, diagrams, and images (empty for now) |

## Features

- **Product Management**: Full CRUD for products with SKU, pricing, categories, suppliers, and locations
- **Real-time Inventory Tracking**: Stock levels, reservations, adjustments, audit logs
- **Automated Stock Monitoring**: Background agent checks inventory on a schedule
  - Low stock alerts (reorder point based)
  - Critical stock alerts (configurable threshold)
  - Out of stock detection
  - Reorder recommendations
- **Dashboard**: Stock status summary, category breakdown, live product table
- **Alerts Panel**: Filter, acknowledge, and track inventory alerts
- **Inventory Logs**: Complete paginated audit trail of all stock changes

## Tech Stack

- **Backend**: FastAPI (Python 3.10+), Motor (async MongoDB)
- **Database**: MongoDB
- **Scheduler**: APScheduler for the monitoring agent
- **Frontend**: React 18 + Vite + Tailwind CSS, React Router, REST API client

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running on localhost:27017

### Installation

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # optional

# Frontend
cd ../frontend
npm install
```

### Running

**Option 1: Automated startup script** (requires both installed)
```bash
cd scripts
python start.py
```

**Option 2: Manual startup**

Terminal 1 - Backend:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Access Points

- **Frontend Dashboard**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Testing

Backend tests run against an in-memory MongoDB (no server needed):

```bash
cd backend
python -m pytest
```

## API Endpoints

### Products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products` - List products (with filters)
- `GET /api/v1/products/{id}` - Get product
- `GET /api/v1/products/sku/{sku}` - Get by SKU
- `PATCH /api/v1/products/{id}` - Update product
- `POST /api/v1/products/seed` - Seed 100 products

### Inventory
- `POST /api/v1/inventory/adjust` - Adjust stock
- `POST /api/v1/inventory/reserve` - Reserve stock
- `POST /api/v1/inventory/release` - Release reservation
- `GET /api/v1/inventory/logs` - Get inventory logs

### Alerts
- `GET /api/v1/alerts` - Get alerts
- `PATCH /api/v1/alerts/{id}/acknowledge` - Dismiss alert

### Dashboard & Agent
- `GET /api/v1/dashboard/stats` - Dashboard statistics
- `GET /api/v1/agent/status` - Agent status
- `POST /api/v1/agent/check` - Force inventory check

## AI Agent Configuration

The monitoring agent runs automatically every 5 minutes (configurable via `AGENT_CHECK_INTERVAL_MINUTES`). It:

1. Scans all products
2. Creates alerts for:
   - **Out of Stock**: 0 available
   - **Critical Stock**: ≤ 3 available
   - **Low Stock**: ≤ reorder_point
   - **Reorder Needed**: Within `REORDER_NEARBY_MARGIN` of reorder_point
3. Sends email notifications (if SMTP configured)
4. Generates daily summary at midnight
5. Cleans up old acknowledged alerts (30 days)

### Thresholds
- `CRITICAL_STOCK_THRESHOLD`: 3
- `REORDER_NEARBY_MARGIN`: 5

## Product Seeding

Run `POST /api/v1/products/seed?count=100` to create 100 products:
- SKUs: `itemxxx001` through `itemxxx100`
- Categories: electronics, clothing, home (rotating)
- Random stock levels (0-99)
- Prices: $10-$500
- Suppliers: 5 different suppliers
- Locations: 3 warehouses

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `ecommerce_inventory` | Database name |
| `AGENT_CHECK_INTERVAL_MINUTES` | `5` | Agent check frequency |
| `CRITICAL_STOCK_THRESHOLD` | `3` | Critical stock level |
| `REORDER_NEARBY_MARGIN` | `5` | "Reorder soon" alert margin |
| `SMTP_HOST` | - | SMTP server for emails |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `ALERT_EMAIL` | - | Recipient for alerts |

## Project Structure

```
inventory-management/
├── backend/
│   ├── app/
│   │   ├── api/           # REST endpoints + dependencies
│   │   ├── models/        # Pydantic/MongoDB models
│   │   ├── schemas/       # API request/response schemas
│   │   ├── services/      # Business logic
│   │   ├── agents/        # Background monitoring agent
│   │   └── core/          # Config, database, exceptions
│   ├── tests/             # pytest suite (in-memory MongoDB)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Dashboard, Products, Alerts, Logs
│   │   ├── context/       # Toast notifications
│   │   ├── api.js         # REST API client
│   │   ├── App.jsx        # Router
│   │   └── main.jsx       # Entry point
│   └── package.json
├── scripts/
│   └── start.py           # Startup script
└── README.md
```

## Development

### Adding New Alert Types
1. Update `AlertType` in `app/models/alert.py`
2. Add handling in `InventoryAgent._create_alert()`
3. Update the alerts UI in `frontend/src/pages/Alerts.jsx`

### Customizing Agent Logic
Modify `InventoryAgent.check_inventory()` in `agents/inventory_agent.py`

### Adding API Endpoints
1. Add route in `app/api/routes/`
2. Add service method in `app/services/`
3. Add a method in `frontend/src/api.js` and use it from the pages

## License

MIT