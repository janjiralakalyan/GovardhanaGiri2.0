"""
GovardhanaGiri 2.0: AI Multi-Agent Incident Commander & IAP Copilot Engine
===========================================================================
Tri-Agent Orchestration Architecture:
  1. Worker Agent 1 (Groq API - openai/gpt-oss-20b):
     Hydrological & Hazard Telemetry Analyst. Evaluates rainfall rate, soil moisture saturation,
     slope stability, stream stage overtopping, and critical time-to-impact.
  
  2. Worker Agent 2 (Groq API - openai/gpt-oss-20b):
     Logistics & Resource Strategist (NDMA & SPHERE Humanitarian Standards).
     Calculates exact requirements for food packets, potable drinking water, rescue boats (IRBs),
     life jackets, medical triage kits, road closures, and shelter allocations.
  
  3. Commander Agent (Cohere API - command-r7b-12-2024 / c4ai-aya-expanse-32b):
     Supreme Incident Commander. Synthesizes hazard assessment + logistics strategy into an
     official NDMA Form 201/204 Incident Action Plan (IAP) and creates authentic
     Multi-Lingual Emergency Broadcasts (English, Telugu - తెలుగు, Hindi - हिन्दी).
"""

import os
import sys
import math
import time
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
import httpx

from backend.mock_telemetry import get_station_by_id, get_all_stations
from backend.predictor import ai_bridge

logger = logging.getLogger("copilot_engine")
logging.basicConfig(level=logging.INFO)

# API Keys
GROQ_API_KEY_WORKER1 = os.environ.get("GROQ_API_KEY_WORKER1", os.environ.get("GROQ_API_KEY", ""))
GROQ_API_KEY_WORKER2 = os.environ.get("GROQ_API_KEY_WORKER2", "")
GROQ_API_KEY = GROQ_API_KEY_WORKER1  # Legacy fallback reference
COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
COHERE_API_URL = "https://api.cohere.com/v2/chat"

# Models
GROQ_MODEL = "openai/gpt-oss-20b"
COHERE_MODEL = "command-r7b-12-2024"


def calculate_ndma_resource_matrix(station: Dict[str, Any], risk_level: str) -> Dict[str, Any]:
    """
    Computes baseline NDMA / SPHERE humanitarian resource formulas based on population & risk tier.
    """
    pop = station.get("population", 5000)
    risk_multipliers = {
        "Critical": 1.0,    # 100% of affected riparian pop needs urgent mobilization
        "High": 0.65,
        "Moderate": 0.30,
        "Low": 0.10
    }
    mult = risk_multipliers.get(risk_level, 0.5)
    target_pop = max(100, int(pop * mult))

    # Standard SPHERE / NDMA calculations (48-hour operational cycle)
    food_packets_48h = target_pop * 3 * 2  # 3 meals/day for 2 days
    water_liters_48h = target_pop * 4 * 2  # 4 Liters/day per person
    water_tankers_10k = math.ceil(water_liters_48h / 10000)
    
    # Inflatable Rescue Boats (1 IRB per 40 vulnerable individuals in riparian zone)
    rescue_boats = max(2, math.ceil((target_pop * 0.20) / 40))
    life_jackets = int(target_pop * 0.40) + (rescue_boats * 4)
    medical_triage_tents = max(1, math.ceil(target_pop / 1200))
    ors_chlorine_units = target_pop * 8
    sdrf_personnel = max(12, rescue_boats * 4 + 8)

    # Shelter allocation
    shelters = station.get("shelters", [])
    shelter_plan = []
    remaining_pop = target_pop
    for idx, s in enumerate(shelters):
        cap = s.get("capacity", 1000)
        allocated = min(remaining_pop, cap)
        remaining_pop -= allocated
        occupancy_pct = round((allocated / cap) * 100, 1) if cap > 0 else 0
        shelter_plan.append({
            "name": s.get("name", f"Shelter #{idx+1}"),
            "type": s.get("type", "Designated Safe Shelter"),
            "distance_km": s.get("distance_km", 2.0),
            "elevation_m": s.get("elevation_m", 100),
            "capacity": cap,
            "allocated_evacuees": allocated,
            "occupancy_rate_pct": occupancy_pct,
            "contact": s.get("contact", "+91-94906-88000")
        })

    return {
        "target_vulnerable_population": target_pop,
        "total_station_population": pop,
        "operational_window_hours": 48,
        "supplies": {
            "food_packets_48h": food_packets_48h,
            "water_liters_48h": water_liters_48h,
            "water_tankers_10k_L": water_tankers_10k,
            "sdrf_inflatable_rescue_boats": rescue_boats,
            "life_jackets_distributed": life_jackets,
            "medical_triage_tents": medical_triage_tents,
            "ors_chlorine_sachets": ors_chlorine_units,
            "sdrf_ndrf_personnel": sdrf_personnel
        },
        "shelter_allocations": shelter_plan
    }


async def call_groq_agent(prompt: str, system_msg: str, temperature: float = 0.2, timeout_s: float = 18.0, api_key: Optional[str] = None) -> Optional[str]:
    """Invokes Worker Agent via Groq Cloud API."""
    key = api_key or GROQ_API_KEY_WORKER1
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": 1000
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                logger.warning(f"Groq API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Error calling Groq agent: {e}")
    return None


async def call_cohere_commander(prompt: str, system_msg: str, temperature: float = 0.3, timeout_s: float = 25.0) -> Optional[str]:
    """Invokes Supreme Commander Agent via Cohere API."""
    headers = {
        "Authorization": f"Bearer {COHERE_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": COHERE_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            resp = await client.post(COHERE_API_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", [])
                if content and isinstance(content, list):
                    return content[0].get("text", "").strip()
            else:
                logger.warning(f"Cohere API returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Error calling Cohere commander: {e}")
    return None


def generate_fallback_deliberation(station: Dict[str, Any], pred: Dict[str, Any], resources: Dict[str, Any]) -> Dict[str, Any]:
    """
    Expert hydrological fallback generator ensures zero-downtime, fully complete IAP even if offline.
    """
    stn_name = station["village_area"]
    mandal = station["mandal"]
    dist = station["district"]
    risk = pred.get("risk_level", "Moderate")
    lead_time = pred.get("lead_time_hours", 3.5)
    water_lvl = station["telemetry"].get("Water_Level", 4.0)
    danger = station.get("danger_water_level", 5.0)
    rain_1h = station["telemetry"].get("Rainfall_1h", 25.0)
    soil_sat = station["telemetry"].get("Soil_Saturation", 75.0)
    supplies = resources["supplies"]

    w1_text = (
        f"**1. Hydrological & Overtopping Severity:** Current river stage is {water_lvl}m (Danger: {danger}m). "
        f"Intense rainfall ({rain_1h} mm/h) coupled with high antecedent soil saturation ({soil_sat}%) indicates rapid surface runoff.\n"
        f"**2. Geomorphic & Slope Failure Threat:** Saturated embankment soils exhibit diminished shear resistance with elevated pore-water pressures along riparian slopes.\n"
        f"**3. Critical Time-to-Impact:** Estimated actionable safe evacuation window is **{lead_time} hours** before crest stage submergence."
    )

    w2_text = (
        f"**NDMA Disaster Logistics Plan ({stn_name}):**\n"
        f"• **Food Rations:** {supplies['food_packets_48h']:,} dry ration packets (48h operational reserve)\n"
        f"• **Potable Drinking Water:** {supplies['water_liters_48h']:,} Liters ({supplies['water_tankers_10k_L']} heavy tankers @ 10,000L capacity)\n"
        f"• **Rescue Fleet:** {supplies['sdrf_inflatable_rescue_boats']} motorized SDRF Inflatable Rescue Boats (IRBs) + {supplies['life_jackets_distributed']:,} certified life jackets\n"
        f"• **Medical Units:** {supplies['medical_triage_tents']} emergency medical triage stations with {supplies['ors_chlorine_sachets']:,} ORS & chlorine water purification sachets\n"
        f"• **First Responders:** {supplies['sdrf_ndrf_personnel']} active SDRF/NDRF search and rescue personnel mobilized."
    )

    telugu_msg = (
        f"🚨 అత్యవసర హెచ్చరిక ({stn_name}, {mandal} మండలం): "
        f"నదీ ప్రవాహం ప్రమాద స్థాయికి చేరుకుంటున్నందున సమీప లోతట్టు ప్రాంత ప్రజలు వెంటనే సురక్షిత పునరావాస కేంద్రాలకు చేరుకోవలసిందిగా విజ్ఞప్తి. "
        f"రక్షక దళాలు ({supplies['sdrf_inflatable_rescue_boats']} రెస్క్యూ బోట్లు) సిద్ధంగా ఉన్నాయి. హెల్ప్‌లైన్: 1077 / 112."
    )

    hindi_msg = (
        f"🚨 आपातकालीन चेतावनी ({stn_name}, {mandal}): "
        f"नदी का जलस्तर खतरे के निशान के करीब पहुंच चुका है। निचले इलाकों के सभी नागरिक तत्काल निकटतम राहत शिविरों में स्थानांतरित हों। "
        f"SDRF/NDRF बचाव दल एवं {supplies['sdrf_inflatable_rescue_boats']} नावें तैनात हैं। आपातकालीन हेल्पलाइन: 1077 / 112."
    )

    english_msg = (
        f"🚨 URGENT EVACUATION DIRECTIVE ({stn_name}, {dist}): "
        f"River gauge has surged with high catchment runoff. All residents in low-lying riparian zones must evacuate immediately to designated relief centers. "
        f"{supplies['sdrf_inflatable_rescue_boats']} SDRF rescue boats deployed. Lead time remaining: {lead_time} hrs. Emergency Helpline: 1077 / 112."
    )

    commander_text = (
        f"### 🛡️ OPERATIONAL COMMAND DIRECTIVE: OPERATION JAL-RAKSHA ({stn_name.upper()})\n\n"
        f"**Threat Severity:** {risk.upper()} ALERT | **Evacuation Window:** {lead_time} Hours\n\n"
        f"**1. Immediate Executive Orders:**\n"
        f"- Mobilize {supplies['sdrf_ndrf_personnel']} SDRF/NDRF personnel and deploy {supplies['sdrf_inflatable_rescue_boats']} motorized rescue craft to riparian ghat points.\n"
        f"- Barricade vulnerable causeways and low-lying bridge approaches immediately.\n"
        f"- Activate primary safe shelters: {resources['shelter_allocations'][0]['name'] if resources['shelter_allocations'] else 'Designated High Ground Camp'}.\n\n"
        f"**2. Multi-Lingual Public Broadcasts:**\n\n"
        f"**[ENGLISH BROADCAST]**\n{english_msg}\n\n"
        f"**[TELUGU BROADCAST (తెలుగు అత్యవసర ప్రకటన)]**\n{telugu_msg}\n\n"
        f"**[HINDI BROADCAST (हिन्दी आपातकालीन उद्घोषणा)]**\n{hindi_msg}"
    )

    return {
        "worker_1_hazard": w1_text,
        "worker_2_logistics": w2_text,
        "commander_synthesis": commander_text,
        "broadcasts": {
            "english": english_msg,
            "telugu": telugu_msg,
            "hindi": hindi_msg
        }
    }


async def generate_incident_action_plan(station_id: str, custom_telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Executes the 3-Agent Collaborative Pipeline:
      Worker 1 (Groq) -> Hazard Assessment
      Worker 2 (Groq) -> Logistics Calculation & Shelter Strategy
      Commander (Cohere) -> Supreme NDMA IAP Synthesis & Multi-Lingual Broadcasts
    """
    station = get_station_by_id(station_id)
    if not station:
        stations = get_all_stations()
        station = stations[0] if stations else None
    
    if not station:
        raise ValueError(f"Station not found: {station_id}")

    # Use live telemetry or custom simulation overrides
    active_telemetry = dict(station["telemetry"])
    if custom_telemetry:
        active_telemetry.update(custom_telemetry)

    # Compute AI hazard prediction
    prediction = ai_bridge.predict_station_telemetry(active_telemetry)
    risk_level = prediction.get("risk_level", "Moderate")
    lead_time = prediction.get("lead_time_hours", 3.0)

    # Compute NDMA mathematical resource matrix
    resource_matrix = calculate_ndma_resource_matrix(station, risk_level)
    supplies = resource_matrix["supplies"]

    # --- Agent 1: Groq Hazard Analyst Prompt ---
    w1_system = "You are Worker Agent 1: Senior Hydrological & Hazard Telemetry Analyst for Telangana Disaster Management Authority."
    w1_prompt = f"""Analyze the real-time hydro-meteorological telemetry for the following monitored hotspot:
Hotspot: {station['village_area']}, Mandal: {station['mandal']}, District: {station['district']}
Population: {station['population']:,} | River: {station['river_name']}
Current Water Stage: {active_telemetry.get('Water_Level')} m (Danger Mark: {station.get('danger_water_level')} m)
Rainfall (1h): {active_telemetry.get('Rainfall_1h')} mm | Rainfall (6h): {active_telemetry.get('Rainfall_6h')} mm | Intensity: {active_telemetry.get('Rainfall_Intensity')} mm/h
Soil Saturation: {active_telemetry.get('Soil_Saturation')}% | Soil Moisture: {active_telemetry.get('Soil_Moisture')}%
Slope: {station.get('slope')}° | Elevation: {station.get('elevation')}m | Flow Accumulation: {station.get('flow_accumulation')}
AI Predicted Risk Tier: {risk_level} | Estimated Evacuation Lead Time: {lead_time} hrs

Provide a rigorous technical evaluation in 3 structured points:
1. Stream Inundation & Overtopping Severity
2. Geomorphic Slope Stability & Soil Saturation Breach Threat
3. Critical Time-to-Impact & Peak Surge Arrival Window"""

    # --- Step 1: Run Worker Agent 1 ---
    t0 = time.time()
    w1_response = await call_groq_agent(w1_prompt, w1_system, temperature=0.2, api_key=GROQ_API_KEY_WORKER1)
    w1_latency = round(time.time() - t0, 2)

    if not w1_response:
        fallback = generate_fallback_deliberation(station, prediction, resource_matrix)
        w1_response = fallback["worker_1_hazard"]

    # --- Agent 2: Groq Logistics & Relief Strategist Prompt ---
    w2_system = "You are Worker Agent 2: Disaster Logistics & Resource Allocation Strategist conforming to NDMA & SPHERE Humanitarian standards."
    w2_prompt = f"""Station: {station['village_area']}, Mandal: {station['mandal']}, District: {station['district']}
Target Population at Risk: {resource_matrix['target_vulnerable_population']:,} of total {station['population']:,}
Hazard Level: {risk_level} | Lead Time: {lead_time} hrs

Hazard Assessment from Worker Agent 1:
{w1_response}

Pre-Calculated Baseline Logistics Targets:
- Food Packets (3 meals x 48h): {supplies['food_packets_48h']:,}
- Clean Drinking Water: {supplies['water_liters_48h']:,} L ({supplies['water_tankers_10k_L']} tankers)
- SDRF Inflatable Rescue Boats (IRBs): {supplies['sdrf_inflatable_rescue_boats']} craft
- Life Jackets: {supplies['life_jackets_distributed']:,}
- Emergency Medical Triage: {supplies['medical_triage_tents']} tents, {supplies['ors_chlorine_sachets']:,} ORS/chlorine kits
- SDRF/NDRF Personnel: {supplies['sdrf_ndrf_personnel']} officers

Task: Validate these logistical requirements, specify priority evacuation sectors, road closure checkpoints, and distribution strategy in clean markdown with bullet points."""

    # --- Step 2: Run Worker Agent 2 ---
    t0 = time.time()
    w2_response = await call_groq_agent(w2_prompt, w2_system, temperature=0.2, api_key=GROQ_API_KEY_WORKER2)
    w2_latency = round(time.time() - t0, 2)

    if not w2_response:
        fallback = generate_fallback_deliberation(station, prediction, resource_matrix)
        w2_response = fallback["worker_2_logistics"]

    # --- Agent 3: Supreme Commander Agent (Cohere) Prompt ---
    commander_system = (
        "You are the Supreme Disaster Incident Commander for GovardhanaGiri Emergency Operations Center (EOC). "
        "You synthesize inputs from specialized worker agents and issue authoritative NDMA-compliant Incident Action Plans "
        "and clear multi-lingual public emergency broadcasts (English, Telugu - తెలుగు, Hindi - हिन्दी)."
    )

    commander_prompt = f"""Synthesize the final Incident Action Plan (IAP) for:
Location: {station['village_area']}, Mandal: {station['mandal']}, District: {station['district']}, Telangana
Risk Tier: {risk_level} (Lead Time: {lead_time} hours) | Riparian Population: {station['population']:,}

[WORKER AGENT 1 - HAZARD & TELEMETRY EVALUATION]:
{w1_response}

[WORKER AGENT 2 - LOGISTICS & RESOURCE ALLOCATION]:
{w2_response}

Generate the complete Incident Action Plan conforming to the following structure:
1. EXECUTIVE COMMAND DIRECTIVE (Operation Name, Code Red/Orange Activation, High-Level Directives)
2. STRATEGIC DEPLOYMENT MATRIX (Summary of boats, personnel, shelters, and road closures)
3. MULTI-LINGUAL EMERGENCY BROADCAST ALERTS:
   ### [ENGLISH BROADCAST]
   (Clear, concise public emergency advisory with helpline 1077/112 and shelter instruction)
   ### [TELUGU BROADCAST]
   (Authentic Telugu announcement: తెలుగులో అత్యవసర హెచ్చరిక మరియు పునరావాస కేంద్రాల సమాచారం)
   ### [HINDI BROADCAST]
   (Natural Hindi emergency broadcast: हिन्दी में आपातकालीन सूचना एवं सुरक्षित स्थान निर्देश)"""

    # --- Step 3: Run Commander Agent (Cohere) ---
    t0 = time.time()
    commander_response = await call_cohere_commander(commander_prompt, commander_system, temperature=0.3)
    commander_latency = round(time.time() - t0, 2)

    # Extract or prepare multi-lingual broadcasts
    fallback = generate_fallback_deliberation(station, prediction, resource_matrix)
    if not commander_response:
        commander_response = fallback["commander_synthesis"]

    # Parse multi-lingual broadcasts from text if possible, else use robust defaults
    broadcast_en = fallback["broadcasts"]["english"]
    broadcast_te = fallback["broadcasts"]["telugu"]
    broadcast_hi = fallback["broadcasts"]["hindi"]

    if "[ENGLISH BROADCAST]" in commander_response:
        parts = commander_response.split("[ENGLISH BROADCAST]")
        if len(parts) > 1:
            rest = parts[1]
            if "[TELUGU BROADCAST]" in rest:
                en_sec, rest2 = rest.split("[TELUGU BROADCAST]")
                broadcast_en = en_sec.strip(" \n#:-")
                if "[HINDI BROADCAST]" in rest2:
                    te_sec, hi_sec = rest2.split("[HINDI BROADCAST]")
                    broadcast_te = te_sec.strip(" \n#:-")
                    broadcast_hi = hi_sec.strip(" \n#:-")

    return {
        "status": "SUCCESS",
        "station_id": station["id"],
        "station_name": station["village_area"],
        "mandal": station["mandal"],
        "district": station["district"],
        "population": station["population"],
        "risk_level": risk_level,
        "lead_time_hours": lead_time,
        "flood_predicted": prediction.get("flood_predicted", False),
        "resource_matrix": resource_matrix,
        "deliberation": {
            "worker_1_hazard": {
                "agent_name": "Worker Agent 1 (Groq: Hazard & Telemetry)",
                "model": GROQ_MODEL,
                "latency_sec": w1_latency,
                "analysis": w1_response
            },
            "worker_2_logistics": {
                "agent_name": "Worker Agent 2 (Groq: Logistics & NDMA Strategy)",
                "model": GROQ_MODEL,
                "latency_sec": w2_latency,
                "analysis": w2_response
            },
            "commander_synthesis": {
                "agent_name": "Supreme Commander (Cohere: Incident Command)",
                "model": COHERE_MODEL,
                "latency_sec": commander_latency,
                "full_iap": commander_response
            }
        },
        "broadcasts": {
            "english": broadcast_en,
            "telugu": broadcast_te,
            "hindi": broadcast_hi
        },
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S IST")
    }


async def answer_commander_query(query: str, station_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Interactive Copilot conversational query endpoint.
    Answers commander queries with hyper-local context using the multi-agent system.
    """
    # Load all stations for statewide or localized context
    stations = get_all_stations()
    current_stn = None
    if station_id:
        current_stn = get_station_by_id(station_id)
    if not current_stn and stations:
        current_stn = stations[0]

    stn_context = json.dumps([{
        "id": s["id"],
        "name": s["village_area"],
        "mandal": s["mandal"],
        "district": s["district"],
        "pop": s["population"],
        "water_lvl": s["telemetry"].get("Water_Level"),
        "danger_lvl": s.get("danger_water_level"),
        "rain_1h": s["telemetry"].get("Rainfall_1h"),
        "rain_intensity": s["telemetry"].get("Rainfall_Intensity"),
        "soil_sat": s["telemetry"].get("Soil_Saturation")
    } for s in stations], indent=1)

    # 1. Groq Rapid Fact/Telemetry Extraction
    w1_system = "You are the Telemetry & Hydrological Intelligence Agent for GovardhanaGiri Emergency Operations."
    w1_prompt = f"""Monitored Telangana Stations Data:\n{stn_context}\n\nCommander Query: {query}\n\nExtract relevant station facts, water levels, rainfall, or hazard metrics concisely."""
    
    t0 = time.time()
    w1_analysis = await call_groq_agent(w1_prompt, w1_system, temperature=0.1, timeout_s=12.0, api_key=GROQ_API_KEY_WORKER1)
    
    # 2. Cohere Supreme Commander Final Answer
    commander_system = (
        "You are the Supreme Incident Commander Copilot for GovardhanaGiri 2.0 (Telangana Early Warning EOC). "
        "Provide direct, authoritative, actionable operational advice conforming to NDMA guidelines. "
        "Highlight exact numbers, specific shelters, road choke points, and emergency protocols clearly in markdown."
    )
    commander_prompt = f"""Commander Query: {query}\n\nTelemetry Context:\n{w1_analysis or stn_context}\n\nDeliver the operational response to the commander:"""

    commander_answer = await call_cohere_commander(commander_prompt, commander_system, temperature=0.2, timeout_s=20.0)

    if not commander_answer:
        # Fallback intelligent rule
        commander_answer = (
            f"**Operational Advisory for {current_stn['village_area']}:**\n"
            f"Based on live telemetry (Water Level: {current_stn['telemetry']['Water_Level']}m vs Danger: {current_stn['danger_water_level']}m, "
            f"Rainfall: {current_stn['telemetry']['Rainfall_1h']} mm/h), immediate priority is securing low-lying riparian wards.\n"
            f"- **Primary High-Ground Shelter:** {current_stn['shelters'][0]['name']} (Capacity: {current_stn['shelters'][0]['capacity']})\n"
            f"- **Action Order:** Dispatch SDRF inflatable rescue boats and establish traffic barricades along bridge approaches."
        )

    return {
        "query": query,
        "station_id": current_stn["id"] if current_stn else None,
        "answer": commander_answer,
        "worker_telemetry_insights": w1_analysis or "Real-time state telemetry ingested.",
        "responder": "Supreme Incident Commander (Cohere Multi-Agent System)",
        "timestamp": time.strftime("%H:%M:%S IST")
    }
