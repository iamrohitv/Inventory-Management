from fastapi import APIRouter
from app.agents.inventory_agent import inventory_agent

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/status")
async def get_agent_status():
    return await inventory_agent.get_agent_status()


@router.post("/check")
async def force_agent_check():
    await inventory_agent.force_check()
    return {"message": "Inventory check triggered", "success": True}
