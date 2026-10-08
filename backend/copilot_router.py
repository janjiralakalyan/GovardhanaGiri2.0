"""
GovardhanaGiri 2.0: AI Multi-Agent Incident Commander Router
============================================================
Exposes REST endpoints for:
- 3-Agent Collaborative IAP Generation (Groq Hazard Worker + Groq Logistics Worker + Cohere Commander)
- Interactive Commander Conversational Queries & Advisory
- Pre-packaged Smart Emergency Quick-Prompts
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from backend.copilot_engine import (
    generate_incident_action_plan,
    answer_commander_query
)
from backend.mock_telemetry import get_all_stations, get_station_by_id

router = APIRouter(prefix="/api/copilot", tags=["AI Incident Commander Copilot"])


class IAPRequest(BaseModel):
    station_id: str
    custom_telemetry: Optional[Dict[str, Any]] = None


class QueryRequest(BaseModel):
    query: str
    station_id: Optional[str] = None


@router.post("/generate-iap")
async def api_generate_iap(req: IAPRequest):
    """
    Triggers the 3-Agent Collaborative Deliberation:
    Worker 1 (Groq) -> Hazard Assessment
    Worker 2 (Groq) -> Logistics Calculation & Shelter Strategy
    Commander (Cohere) -> Supreme NDMA IAP Synthesis & Multi-Lingual Broadcasts
    """
    try:
        iap = await generate_incident_action_plan(req.station_id, req.custom_telemetry)
        return iap
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate IAP: {str(e)}")


@router.post("/query")
async def api_query_copilot(req: QueryRequest):
    """
    Interactive conversational query endpoint for Incident Commanders & EOC Operators.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        ans = await answer_commander_query(req.query, req.station_id)
        return ans
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot query failed: {str(e)}")


@router.get("/quick-prompts")
def get_quick_prompts():
    """
    Returns curated operational quick-prompts for instant commander queries.
    """
    return {
        "prompts": [
            {
                "title": "🌊 Bhadrachalam Submergence Wards",
                "query": "Which low-lying wards in Bhadrachalam face immediate submergence, and what are the priority evacuation routes?",
                "station_id": "TEL-STN-01"
            },
            {
                "title": "🚧 Kerameri Ghat Road Closures",
                "query": "Recommend specific road closure checkpoints and detour transit corridors for Kerameri Ghat Range due to steep runoff risk.",
                "station_id": "TEL-STN-05"
            },
            {
                "title": "⚡ Medaram Cloudburst Resource Surge",
                "query": "If a 100mm/h cloudburst strikes Jampanna Vagu in Medaram, calculate required rescue boats, clean water tankers, and shelter allocations.",
                "station_id": "TEL-STN-03"
            },
            {
                "title": "🏙️ Musi River Urban Corridor Protocol",
                "query": "What is the emergency containment protocol for Puranapool and Bahadurpura low-lying colonies along the Musi river?",
                "station_id": "TEL-STN-10"
            },
            {
                "title": "📦 Munneru Basin Relief Logistics",
                "query": "Estimate the 48-hour food ration and potable water requirement for Prakash Nagar Munneru embankment population.",
                "station_id": "TEL-STN-08"
            }
        ]
    }
