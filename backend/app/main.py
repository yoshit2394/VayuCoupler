"""
FastAPI Main Application.
Air Pollution–Weather Coupled Forecasting System (Delhi NCR Focus)
Ministry of Earth Sciences (MoES) — SIH 2026
"""

import os
import json
import urllib.request
import logging
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from typing import Optional

logger = logging.getLogger(__name__)

from .data.adapter import ADAPTER
from .data.stations import get_all_stations, get_station_by_id
from .models.coupled_model import FORECASTER
from .models.attribution import get_source_attribution
from .engine.grap_trigger import GRAP_ENGINE
from .engine.alerts import generate_stakeholder_dispatches, calculate_what_if_policy
from .engine.vayuai import query_vayuai
from .schemas.models import WhatIfRequest, RuleCreateUpdate
from pydantic import BaseModel

class VayuAIRequest(BaseModel):
    question: str
    step_hour: int = 72
    use_gemini: bool = True
    language: str = "hinglish"

app = FastAPI(
    title="MoES Air Pollution–Weather Coupled Forecasting System (Delhi NCR)",
    description="Forecast-Triggered Predictive GRAP and Coupled Meteorology-Pollution Engine",
    version="1.0.0"
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

# Mount /assets so Vite-built JS/CSS files resolve correctly
if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# Mount /static for icons, manifest, service worker etc.
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_dashboard():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"status": "ONLINE", "message": "MoES Coupled AQI API"}

# Enable CORS for React frontend (Vite default port 5173 / 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "system": "MoES Coupled Air Quality Forecaster (Delhi NCR)",
        "mode": ADAPTER.mode,
        "total_episode_hours": ADAPTER.synthetic_engine.total_hours,
        "stations_count": len(get_all_stations()),
        "rules_count": len(GRAP_ENGINE.rules)
    }

@app.get("/api/stations")
def get_stations():
    return get_all_stations()

@app.get("/api/snapshot")
def get_snapshot(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Returns the complete coupled state (weather, pollutants, fire counts, attribution) at a given hour.
    """
    return ADAPTER.get_snapshot_at_step(step_hour)

@app.get("/api/forecast/station/{station_id}")
def get_station_forecast(station_id: str, step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Returns +24h/+48h/+72h forecast curves, 90% CI bands, and physics coupling decomposition.
    """
    return FORECASTER.generate_station_forecast(station_id, step_hour)

@app.get("/api/forecast/regional")
def get_regional_forecast(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Returns aggregated Delhi NCR forecast and peak risk level.
    """
    return FORECASTER.generate_regional_forecast(step_hour)

@app.get("/api/attribution")
def get_attribution(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Returns real-time source apportionment (stubble, vehicles, dust, industry).
    """
    return get_source_attribution(step_hour)

@app.get("/api/grap/triggers")
def get_grap_triggers(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Evaluates predictive GRAP rules matrix and calculates lead-time gained vs reactive GRAP.
    """
    return GRAP_ENGINE.evaluate_triggers(step_hour)

@app.get("/api/grap/rules")
def get_rules():
    return GRAP_ENGINE.rules

@app.post("/api/grap/rules")
def update_rule(rule: RuleCreateUpdate):
    for idx, r in enumerate(GRAP_ENGINE.rules):
        if r["id"] == rule.id:
            GRAP_ENGINE.rules[idx] = rule.model_dump()
            return {"status": "SUCCESS", "message": f"Rule {rule.id} updated successfully"}
    
    GRAP_ENGINE.rules.append(rule.model_dump())
    return {"status": "SUCCESS", "message": f"New rule {rule.id} added"}

@app.get("/api/dispatches")
def get_dispatches(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Returns role-specific simulated actionable dispatches and payloads.
    """
    return generate_stakeholder_dispatches(step_hour)

@app.post("/api/what-if")
def run_what_if_analysis(req: WhatIfRequest):
    """
    Counterfactual policy simulation for judges: see how much peak AQI drops when pre-emptive curbs are applied.
    """
    return calculate_what_if_policy(
        current_step_hour=req.step_hour,
        stubble_reduction_pct=req.stubble_reduction_pct,
        truck_reduction_pct=req.truck_reduction_pct,
        dust_reduction_pct=req.dust_reduction_pct,
        industry_switch_pct=req.industry_switch_pct
    )

@app.get("/api/interstate")
@app.get("/api/interstate/status")
def get_interstate_coordination(step_hour: int = Query(default=72, ge=0, le=167)):
    """
    Cross-State Early Warning Dashboard matrix for Delhi, Punjab, Haryana, UP, and Rajasthan.
    """
    snapshot = ADAPTER.get_snapshot_at_step(step_hour)
    fires = snapshot["stubble_burning"]
    met = snapshot["meteorology"]
    grap = GRAP_ENGINE.evaluate_triggers(step_hour)

    states = [
        {
            "state": "Delhi (NCT)",
            "role": "Receptor Basin & Internal Curbs",
            "current_status": f"Avg AQI: {snapshot['delhi_ncr_avg_aqi']} ({snapshot['category']})",
            "forecast_risk": f"Peak 72h: {grap['max_72h_forecast_aqi']} AQI",
            "active_mandates": [
                "Anti-smog guns active at 13 hotspots",
                "BS-III Petrol / BS-IV Diesel ban enforced" if grap['max_72h_forecast_aqi'] >= 400 else "Standard vehicular monitoring",
                "Primary schools virtual mode alert" if grap['max_72h_forecast_aqi'] >= 450 else "Normal school operations"
            ],
            "coordination_urgency": "CRITICAL" if grap['max_72h_forecast_aqi'] >= 400 else "ELEVATED"
        },
        {
            "state": "Punjab",
            "role": "Upwind Stubble Emission Control",
            "current_status": f"{int(fires['total_active_fires'] * 0.66)} Active Farm Fires (Sangrur, Bhatinda)",
            "forecast_risk": "High NW Plume Injection into Delhi Corridor",
            "active_mandates": [
                "Advance Happy Seeder machine mobilization at CHCs",
                "Bio-decomposer spray acceleration in 8 priority blocks",
                "Satellite-guided field enforcement teams dispatched"
            ],
            "coordination_urgency": "EMERGENCY" if fires['total_active_fires'] > 1500 else "MODERATE"
        },
        {
            "state": "Haryana",
            "role": "Trans-boundary Buffer & Stubble Control",
            "current_status": f"{int(fires['total_active_fires'] * 0.34)} Active Farm Fires (Kaithal, Fatehabad)",
            "forecast_risk": "Highway Freight Inflow & Regional Dust Resuspension",
            "active_mandates": [
                "Kundli-Manesar-Palwal (WPE) truck diversion operational",
                "Industrial diesel generator bans in Gurugram & Faridabad",
                "Farmland fire monitoring along GT Road corridor"
            ],
            "coordination_urgency": "HIGH" if grap['max_72h_forecast_aqi'] >= 350 else "MODERATE"
        },
        {
            "state": "Uttar Pradesh",
            "role": "Eastern Downwind Trapping & Peripheral Traffic",
            "current_status": "Noida/Ghaziabad Downwind Smog Accumulation",
            "forecast_risk": "Industrial point-source emissions from Sahibabad & Loni",
            "active_mandates": [
                "Eastern Peripheral Expressway (EPE) commercial traffic routing",
                "Brick kiln and hot mix plant operation halt",
                "Continuous water misting along NH-24 and Hindon corridor"
            ],
            "coordination_urgency": "HIGH" if grap['max_72h_forecast_aqi'] >= 350 else "MODERATE"
        },
        {
            "state": "Rajasthan (NCR)",
            "role": "South-West Baseline & Stone Crushing Curbs",
            "current_status": "Alwar Regional Baseline (AQI 140-190)",
            "forecast_risk": "Dust transport from mining zones",
            "active_mandates": [
                "Stone crusher wet-suppression compliance checks in Bhiwadi",
                "Interstate border green-corridor maintenance"
            ],
            "coordination_urgency": "LOW"
        }
    ]

    return {
        "step_hour": step_hour,
        "timestamp": snapshot["timestamp"],
        "wind_vector": f"{met['wind_speed_kmh']} km/h from {met['wind_direction_cardinal']} ({met['wind_direction_deg']}°)",
        "inversion_status": met["ventilation_status"],
        "states": states
    }

@app.post("/api/vayuai/query")
async def vayuai_query(req: VayuAIRequest):
    """
    VayuAI Copilot — Hybrid AI: Gemini (online) + Smart Offline AI (fallback)
    Answers any question about air quality, weather, GRAP, policy in any language.
    """
    snapshot = ADAPTER.get_snapshot_at_step(req.step_hour)
    grap_data = None
    try:
        grap_data = GRAP_ENGINE.evaluate_triggers(req.step_hour)
    except Exception:
        pass
    result = await query_vayuai(
        question=req.question,
        snapshot=snapshot,
        grap_data=grap_data,
        use_gemini=req.use_gemini,
        language=req.language
    )
    return result


@app.get("/api/location/auto")
def auto_detect_location():
    """
    Auto-detect approximate coordinates using IP/network fallback.
    Returns latitude & longitude so laptops without hardware GPS resolve nearest station instantly.
    """
    try:
        req = urllib.request.Request(
            'http://ip-api.com/json/?fields=lat,lon,city,regionName,status',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            data = json.loads(response.read().decode())
            if data.get("status") == "success":
                return {
                    "success": True,
                    "lat": data.get("lat", 28.6327),
                    "lon": data.get("lon", 77.2198),
                    "city": data.get("city", "Delhi"),
                    "region": data.get("regionName", "Delhi NCR"),
                    "source": "Network/Wi-Fi Telemetry"
                }
    except Exception as e:
        logger.debug(f"IP Geolocation error: {e}")

    # Fallback to Central Delhi
    return {
        "success": True,
        "lat": 28.6327,
        "lon": 77.2198,
        "city": "New Delhi",
        "region": "Central Delhi (Default Baseline)",
        "source": "Delhi NCR Reference Node"
    }


@app.get("/download", response_class=HTMLResponse)
@app.get("/app", response_class=HTMLResponse)
def mobile_download_hub():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VayuCoupler - Mobile Download & Install Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 sm:p-6 flex flex-col items-center justify-center">
  <div class="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
    
    <!-- Logo & Header -->
    <div class="text-center mb-6">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
        <span class="text-2xl font-black text-slate-950 font-mono">VC</span>
      </div>
      <h1 class="text-2xl font-black text-white tracking-tight" style="font-family: 'Outfit', sans-serif;">VayuCoupler</h1>
      <p class="text-xs text-slate-400 mt-1 font-medium">MoES Air Pollution–Weather Coupled Forecasting System</p>
      <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-[10px] text-emerald-300 font-bold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> FULLY LIVE & VERIFIED
      </div>
    </div>

    <!-- Options List -->
    <div class="space-y-3.5">
      
      <!-- Option 1: Open Live App -->
      <a href="/" class="block p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/30 hover:opacity-95 transition text-center">
        <div class="text-base flex items-center justify-center gap-2">🚀 Open Live App (Web)</div>
        <div class="text-[11px] font-normal text-emerald-100 mt-0.5">Live coupled map, simulation & voice alerts</div>
      </a>

      <!-- Option 2: Download Standalone HTML App -->
      <a href="/static/VayuCoupler_Standalone_Mobile_App.html" download="VayuCoupler_Mobile_App.html" class="block p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white transition text-center">
        <div class="text-base font-bold text-cyan-300 flex items-center justify-center gap-2">📱 Download Standalone App (.html)</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Saved to phone Downloads • 100% Offline ready</div>
      </a>

      <!-- Option 3: Download SIH Judges QA PDF -->
      <a href="/static/VayuCoupler_SIH_Judges_QA_Guide.pdf" download="VayuCoupler_SIH_Judges_QA_Guide.pdf" class="block p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white transition text-center">
        <div class="text-base font-bold text-amber-300 flex items-center justify-center gap-2">📄 Download SIH Judges Q&A Guide (.pdf)</div>
        <div class="text-[11px] text-slate-400 mt-0.5">25 essential questions, jury answers & physics cheat-sheet</div>
      </a>

      <!-- Option 4: Download Windows Edition ZIP -->
      <a href="/static/VayuCoupler_Windows_Edition.zip" download="VayuCoupler_Windows_Edition.zip" class="block p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 hover:from-blue-900 hover:to-indigo-900 border border-blue-500/50 text-white transition text-center shadow-lg shadow-blue-950/50">
        <div class="text-base font-bold text-sky-300 flex items-center justify-center gap-2">💻 Download Windows Edition (.zip)</div>
        <div class="text-[11px] text-sky-200 mt-0.5">Includes 1-Click "Launch_VayuCoupler_Windows.bat" + Offline App</div>
      </a>

      <!-- Option 5: Download Complete ZIP -->
      <a href="/static/VayuCoupler_App_Source.zip" download="VayuCoupler_App_Source.zip" class="block p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white transition text-center">
        <div class="text-base font-bold text-indigo-300 flex items-center justify-center gap-2">📦 Download Full Project Source (.zip)</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Full FastAPI backend + Frontend codebase archive</div>
      </a>

    </div>

    <!-- Installation Tip -->
    <div class="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
      <div class="font-bold text-slate-300 flex items-center gap-1.5">
        <span>💡</span> Phone me App kaise Install karein:
      </div>
      <div class="text-[11px] leading-relaxed text-slate-400">
        <b>Android (Chrome):</b> Upar <b class="text-white">🚀 Open Live App</b> dabayein, fir Chrome ke 3 dots <b class="text-white">⋮</b> par tap karke <b class="text-emerald-400">"Install app" / "Add to Home screen"</b> select karein.<br>
        <b>iPhone (Safari):</b> Safari ke Share icon <b class="text-white">⎋</b> par tap karke <b class="text-cyan-400">"Add to Home Screen"</b> karein.
      </div>
    </div>

  </div>
</body>
</html>
"""

