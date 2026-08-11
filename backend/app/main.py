from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.exceptions import register_exception_handlers
from app.agents.inventory_agent import inventory_agent
from app.api.routes import products, inventory, alerts, dashboard, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await inventory_agent.start()
    yield
    await inventory_agent.stop()
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

api_prefix = "/api/v1"
app.include_router(products.router, prefix=api_prefix)
app.include_router(inventory.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(agent.router, prefix=api_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
