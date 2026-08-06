# E-Commerce Inventory Manager

A complete inventory management system with AI-powered stock monitoring, built with FastAPI, MongoDB, and Tailwind CSS.

## Features

- **Product Management**: 100 products (itemxxx1 - itemxxx100) with full CRUD
- **Real-time Inventory Tracking**: Stock levels, reservations, adjustments
- **AI Inventory Agent**: Automated monitoring every 5 minutes
  - Low stock alerts (configurable threshold)
  - Critical stock alerts (< 3 units)
  - Out of stock detection
  - Reorder recommendations
  - Email notifications (optional)
- **Dashboard**: Real-time stats, product table, alerts panel
- **Inventory Logs**: Complete audit trail of all stock changes
- **CSV Export**: Download inventory data

## Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **Database**: MongoDB (async with Motor)
- **Scheduler**: APScheduler for AI agent
- **Frontend**: HTML, Vanilla JS, Tailwind CSS (CDN)
- **Architecture**: REST API + Background Agent

## Quick Start

### Prerequisites

- Python 3.10+
- MongoDB running on localhost:27017
- pip packages: `pip install -r backend/requirements.txt`

### Installation

```bash
# Clone/navigate to project
cd ecommerce-inventory

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Configure environment (optional)
cp .env.example .env  # Edit with your settings
```

### Running

**Option 1: Automated startup script**
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
python -m http.server 3000
```

### Access Points

- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

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

The agent runs automatically every 5 minutes (configurable via `AGENT_CHECK_INTERVAL_MINUTES`). It:

1. Scans all products
2. Creates alerts for:
   - **Out of Stock**: 0 available
   - **Critical Stock**: ≤ 3 available
   - **Low Stock**: ≤ reorder_point
   - **Reorder Needed**: Within 5 of reorder_point
3. Sends email notifications (if SMTP configured)
4. Generates daily summary at midnight
5. Cleans up old acknowledged alerts (30 days)

### Thresholds
- `LOW_STOCK_THRESHOLD`: 10 (default reorder point)
- `CRITICAL_STOCK_THRESHOLD`: 3

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
| `LOW_STOCK_THRESHOLD` | `10` | Default reorder point |
| `CRITICAL_STOCK_THRESHOLD` | `3` | Critical stock level |
| `SMTP_HOST` | - | SMTP server for emails |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `ALERT_EMAIL` | - | Recipient for alerts |

## Project Structure

```
ecommerce-inventory/
├── backend/
│   ├── app/
│   │   ├── api/           # REST endpoints
│   │   ├── models/        # Pydantic models
│   │   ├── services/      # Business logic
│   │   ├── agents/        # AI inventory agent
│   │   └── core/          # Config, database
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── index.html         # Dashboard UI
│   ├── js/app.js          # Frontend logic
│   └── css/               # (Tailwind via CDN)
├── scripts/
│   └── start.py           # Startup script
└── README.md
```

## Development

### Adding New Alert Types
1. Update `AlertBase.alert_type` pattern in `models/inventory.py`
2. Add handling in `InventoryAgent._create_alert()`
3. Add icon in `frontend/js/app.js` `getAlertIcon()`

### Customizing Agent Logic
Modify `InventoryAgent.check_inventory()` in `agents/inventory_agent.py`

### Adding API Endpoints
1. Add route in `api/inventory.py`
2. Add service method in `services/inventory_service.py`
3. Update frontend in `js/app.js`

## License

MIT