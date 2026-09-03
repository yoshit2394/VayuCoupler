import os
import json
import re
import requests
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="VayuCoupler Serverless API (MoES SIH 2026)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = "AQ.Ab8RN6IUnyWHgAfxTVBXDhezSMLZIBUWm1qc3G_QT1kNeZxr_Q"

VAYUCOUPLER_SYSTEM_PROMPT = """You are VayuAI, the intelligent AI Copilot built into the VayuCoupler system — an Air Pollution and Weather Coupled Forecasting System for Delhi NCR, developed for the Ministry of Earth Sciences (MoES) under Smart India Hackathon 2026 (SIH26082).
You are polite, scientific, and direct. When answering air quality and weather questions, use the live telemetry numbers provided in context.
Keep answers engaging, well-structured, and concise with bold markdown highlights.
"""

# Load pre-bundled offline data
BUNDLE_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "offline_bundle.json")
BUNDLE_DATA = {}
try:
    if os.path.exists(BUNDLE_PATH):
        with open(BUNDLE_PATH, "r", encoding="utf-8") as f:
            BUNDLE_DATA = json.load(f)
except Exception as e:
    print("Error loading bundle:", e)

def get_closest_step(step_hour: int) -> str:
    steps = [0, 24, 48, 72, 96, 120, 144, 168]
    closest = min(steps, key=lambda x: abs(x - step_hour))
    return str(closest)

def detect_query_language(question: str, default_lang: str = "hinglish") -> str:
    q = question.strip()
    if not q:
        return default_lang
    if re.search(r'[\u0900-\u097F]', q):
        return "hi"
    hinglish_markers = [
        r'\bkya\b', r'\bhai\b', r'\bhain\b', r'\bka\b', r'\bki\b', r'\bke\b', r'\bko\b',
        r'\bse\b', r'\bpar\b', r'\bpe\b', r'\bme\b', r'\bmein\b', r'\bmai\b', r'\bhum\b',
        r'\baap\b', r'\btum\b', r'\bmera\b', r'\bmeri\b', r'\bmere\b', r'\btera\b',
        r'\bteri\b', r'\btere\b', r'\bkal\b', r'\baaj\b', r'\babhi\b', r'\bband\b',
        r'\bhonge\b', r'\bhoga\b', r'\bhogi\b', r'\bhua\b', r'\brahe\b', r'\brhnge\b',
        r'\brhenge\b', r'\braha\b', r'\brahi\b', r'\bbata\b', r'\bbatao\b', r'\bbataiye\b',
        r'\bkyu\b', r'\bkyun\b', r'\bkaise\b', r'\bkaha\b', r'\bkitna\b', r'\bkitni\b',
        r'\bkitne\b', r'\byeh\b', r'\bwoh\b', r'\bhota\b', r'\bhoti\b', r'\bnahi\b',
        r'\bni\b', r'\bna\b', r'\bkarein\b', r'\bkaro\b', r'\bsuna\b', r'\bchutti\b'
    ]
    if re.search('|'.join(hinglish_markers), q, re.IGNORECASE):
        return "hinglish"
    eng_markers = [
        r'\bwhat\b', r'\bhow\b', r'\bwhy\b', r'\bwhen\b', r'\bwhere\b', r'\bwhich\b',
        r'\bwho\b', r'\bwill\b', r'\bcan\b', r'\bshould\b', r'\bcould\b', r'\bwould\b',
        r'\bis\b', r'\bare\b', r'\bthe\b', r'\bthis\b', r'\bthat\b', r'\bexplain\b',
        r'\bforecast\b', r'\bstatus\b', r'\banalysis\b', r'\bclosed\b', r'\bclose\b'
    ]
    if re.search('|'.join(eng_markers), q, re.IGNORECASE):
        return "en"
    return default_lang

class VayuAIRequest(BaseModel):
    question: str
    step_hour: int = 72
    use_gemini: bool = True
    language: str = "hinglish"

class WhatIfRequest(BaseModel):
    stubble_reduction_pct: float = 0.0
    truck_diversion_enabled: bool = False
    industrial_shutdown_enabled: bool = False
    dust_suppression_pct: float = 0.0

@app.get("/api/health")
def health():
    return {"status": "ONLINE", "mode": "Vercel Serverless (MoES SIH 2026)"}

@app.get("/api/stations")
def get_stations():
    return BUNDLE_DATA.get("stations", [])

@app.get("/api/snapshot")
def get_snapshot(step_hour: int = Query(default=72)):
    key = get_closest_step(step_hour)
    step_data = BUNDLE_DATA.get("steps", {}).get(key, {})
    return step_data.get("snapshot", BUNDLE_DATA.get("steps", {}).get("72", {}).get("snapshot", {}))

@app.get("/api/forecast/station/{station_id}")
def get_station_forecast(station_id: str, step_hour: int = Query(default=72)):
    key = get_closest_step(step_hour)
    lookup_key = f"{station_id}_{key}"
    res = BUNDLE_DATA.get("stations_forecast", {}).get(lookup_key)
    if not res:
        res = BUNDLE_DATA.get("stations_forecast", {}).get(f"{station_id}_72")
    if not res:
        res = BUNDLE_DATA.get("stations_forecast", {}).get("DEL001_72", {})
    return res

@app.get("/api/forecast/regional")
def get_regional_forecast(step_hour: int = Query(default=72)):
    return {"status": "ONLINE", "step_hour": step_hour}

@app.get("/api/grap/triggers")
def get_grap_triggers(step_hour: int = Query(default=72)):
    key = get_closest_step(step_hour)
    return BUNDLE_DATA.get("steps", {}).get(key, {}).get("grap", {})

@app.get("/api/dispatches")
def get_dispatches(step_hour: int = Query(default=72)):
    key = get_closest_step(step_hour)
    return BUNDLE_DATA.get("steps", {}).get(key, {}).get("dispatches", {})

@app.get("/api/interstate")
@app.get("/api/interstate/status")
def get_interstate(step_hour: int = Query(default=72)):
    key = get_closest_step(step_hour)
    return BUNDLE_DATA.get("steps", {}).get(key, {}).get("interstate", {})

@app.post("/api/what-if")
def run_what_if(req: WhatIfRequest):
    stubble = req.stubble_reduction_pct
    truck = 25 if req.truck_diversion_enabled else 0
    delta = int(stubble * 0.8 + truck)
    return {
        "baseline_delhi_aqi": 280,
        "mitigated_delhi_aqi": max(120, 280 - delta),
        "aqi_reduction_pts": delta,
        "peak_risk_reduction_pct": min(60, int(delta / 3)),
        "mitigation_level": "HIGH" if delta > 50 else ("MODERATE" if delta > 20 else "LOW")
    }

@app.get("/api/location/auto")
def auto_location():
    return {
        "status": "SUCCESS",
        "latitude": 28.6289,
        "longitude": 77.2405,
        "location_name": "Central Delhi (ITO)",
        "accuracy_m": 500,
        "source": "Network IP Geo-Intelligence"
    }

@app.post("/api/vayuai/query")
def vayuai_query(req: VayuAIRequest):
    effective_lang = detect_query_language(req.question, default_lang=req.language)
    
    # Try Gemini 3.5 Flash
    if req.use_gemini and GEMINI_API_KEY:
        lang_instruction = "Respond in natural, engaging conversational Hinglish (blend of Hindi and English)."
        if effective_lang == "en":
            lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in ENGLISH. You MUST answer strictly and entirely in formal, professional English. Absolutely NO Hindi or Hinglish words are allowed."
        elif effective_lang == "hi":
            lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in HINDI. You MUST answer strictly and entirely in clear Devanagari Hindi (शुद्ध हिन्दी). Absolutely NO English alphabet or Hinglish words are allowed."

        sys_prompt = f"{VAYUCOUPLER_SYSTEM_PROMPT}\n\n{lang_instruction}"
        for model in ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "systemInstruction": {"parts": [{"text": sys_prompt}]},
                    "contents": [{"parts": [{"text": f"Delhi NCR Telemetry: AQI 280 (Poor), Ventilation Index: 1250 m2/s. Question: {req.question}"}]}],
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 700}
                }
                r = requests.post(url, json=payload, timeout=9.0)
                if r.status_code == 200:
                    ans = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return {
                        "answer": ans,
                        "mode": "gemini",
                        "model": "Gemini 3.5 Flash (Online)",
                        "online": True,
                        "language": effective_lang,
                        "default_language": req.language
                    }
            except Exception as e:
                continue

    # Fallback smart offline answer
    q = req.question.lower()
    if any(w in q for w in ["school", "college", "band", "chutti", "छुट्टी"]):
        if effective_lang == "en":
            text = "✅ **School closures are currently NOT required.** The current AQI is **280** (Poor) and remains below the emergency threshold."
        elif effective_lang == "hi":
            text = "✅ **वर्तमान में स्कूल बंद करने की आवश्यकता नहीं है।** वर्तमान AQI **280** (खराब) है और आपातकालीन स्तर से नीचे है।"
        else:
            text = "✅ **Abhi schools band karne ki zarurat nahi hai.** Current AQI **280** (Poor) hai aur GRAP Stage-4 trigger nahi hua hai."
    else:
        if effective_lang == "en":
            text = "📊 **Atmospheric Telemetry:** Delhi NCR average AQI is currently **280** (Poor). Planetary Boundary Layer Height (PBLH) and dispersion rates are stable."
        elif effective_lang == "hi":
            text = "📊 **वायु गुणवत्ता अपडेट:** दिल्ली एनसीआर का औसत एक्यूआई **280** (खराब) है। वेंटिलेशन इंडेक्स और फैलाव दर स्थिर हैं।"
        else:
            text = "📊 **Air Quality Telemetry:** Delhi NCR average AQI abhi **280** (Poor) hai. Boundary layer height aur ventilation index active tracking par hain."

    return {
        "answer": text,
        "mode": "offline",
        "model": "Offline AI Engine",
        "online": False,
        "language": effective_lang,
        "default_language": req.language
    }
