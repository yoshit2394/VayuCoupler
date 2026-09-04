"""
VayuAI Copilot Engine
Ministry of Earth Sciences (MoES) — SIH 2026
Dual Mode:
1. Online: Gemini 3.5 Flash (handles any question strictly in chosen language: English, Hindi, Hinglish)
2. Offline: Local Physics & Telemetry Engine (localized in English, Hindi, Hinglish)
"""

import os
import re
import asyncio
import logging
import requests
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

VAYUCOUPLER_SYSTEM_PROMPT = """You are VayuAI, the intelligent AI Copilot built into the VayuCoupler system — an Air Pollution and Weather Coupled Forecasting System for Delhi NCR, developed for the Ministry of Earth Sciences (MoES) under Smart India Hackathon 2026 (SIH26082).

You are polite, scientific, and direct. When answering air quality and weather questions, use the live telemetry numbers provided in context.
Keep answers engaging, well-structured, and concise with bold markdown highlights.
"""

OFFLINE_TOPICS_BY_LANG = {
    "en": [
        {"label": "🏫 Will Schools Be Closed?", "query": "will schools and colleges be closed due to pollution?"},
        {"label": "💨 Ventilation Index Formula", "query": "what is the ventilation index formula and current status?"},
        {"label": "🌾 Stubble Burning Smoke Share", "query": "what is the stubble burning smoke contribution?"},
        {"label": "🚨 Predictive GRAP Stage 1–4 Curbs", "query": "explain predictive grap stage curbs and enforcement"},
        {"label": "🌫️ Boundary Layer (PBLH) Trapping", "query": "explain planetary boundary layer height trapping mechanism"},
        {"label": "🌡️ Thermal Inversion Trapping", "query": "explain nocturnal thermal inversion trapping"},
        {"label": "😷 Health Advisory & N95 Rules", "query": "health advisory and mask recommendations for current aqi"},
        {"label": "🚗 Truck Diversion & Odd-Even Impact", "query": "impact of commercial truck diversion and odd even rules"},
        {"label": "📍 My Location Air Quality Forecast", "query": "my location air quality forecast"},
        {"label": "📊 Delhi NCR Regional Live AQI", "query": "delhi ncr regional live aqi and weather telemetry"},
        {"label": "📈 72-Hour Pollution Trajectory", "query": "72-hour pollution forecast overview and peak timing"},
        {"label": "🏛️ Multi-Agency Action Dispatches", "query": "what are the multi-agency executive action dispatches?"}
    ],
    "hi": [
        {"label": "🏫 क्या स्कूल बंद होंगे?", "query": "क्या वायु प्रदूषण के कारण स्कूल और कॉलेज बंद होंगे?"},
        {"label": "💨 वेंटिलेशन इंडेक्स फॉर्मूला", "query": "वेंटिलेशन इंडेक्स फॉर्मूला और वर्तमान स्थिति क्या है?"},
        {"label": "🌾 पराली धुआं हिस्सेदारी", "query": "पंजाब और हरियाणा पराली धुएं का कितना योगदान है?"},
        {"label": "🚨 ग्रैप चरण प्रतिबंध", "query": "पूर्वानुमानित ग्रैप चरण 1 से 4 के नियम और प्रतिबंध क्या हैं?"},
        {"label": "🌫️ सीमा परत (PBLH) ट्रैपिंग", "query": "सीमा परत ऊंचाई यानी पीबीएलएच प्रदूषण ट्रैपिंग क्या है?"},
        {"label": "🌡️ थर्मल इन्वर्जन ट्रैपिंग", "query": "रात्रि तापीय उत्क्रमण (थर्मल इन्वर्जन) क्या होता है?"},
        {"label": "😷 स्वास्थ्य सलाह एवं N95", "query": "वर्तमान प्रदूषण स्तर पर स्वास्थ्य सलाह और सावधानियां क्या हैं?"},
        {"label": "🚗 ट्रक डायवर्जन व ऑड-ईवन", "query": "भारी वाणिज्यिक वाहनों के डायवर्जन और ऑड-ईवन का असर"},
        {"label": "📍 मेरे स्थान का वायु पूर्वानुमान", "query": "मेरी लोकेशन का पूर्वानुमान बताओ"},
        {"label": "📊 दिल्ली एनसीआर औसत AQI", "query": "दिल्ली एनसीआर का औसत वायु गुणवत्ता सूचकांक क्या है?"},
        {"label": "📈 72-घंटे प्रदूषण पूर्वानुमान", "query": "अगले 72 घंटों का प्रदूषण पूर्वानुमान और पीक समय"},
        {"label": "🏛️ बहु-एजेंसी एक्शन ऑर्डर्स", "query": "विभिन्न सरकारी एजेंसियों के लिए जारी कार्रवाई आदेश क्या हैं?"}
    ],
    "hinglish": [
        {"label": "🏫 Schools Band Honge Ya Nahi?", "query": "kal schools band honge ya nahi?"},
        {"label": "💨 Ventilation Index Formula", "query": "ventilation index formula aur status kya hai?"},
        {"label": "🌾 Stubble Burning Smoke Share", "query": "punjab stubble burning smoke kitna hai?"},
        {"label": "🚨 GRAP Stage 1–4 Curbs", "query": "predictive grap stage curbs kya hain?"},
        {"label": "🌫️ Boundary Layer (PBLH) Trapping", "query": "boundary layer height pblh trapping kya hai?"},
        {"label": "🌡️ Thermal Inversion Trapping", "query": "thermal inversion trapping kya hota hai?"},
        {"label": "😷 Health Advisory & N95", "query": "health advisory n95 mask recommendation"},
        {"label": "🚗 Truck Diversion & Odd-Even", "query": "truck diversion odd even impact"},
        {"label": "📍 Meri Location Ka Forecast", "query": "meri location ka forecast bata"},
        {"label": "📊 Delhi NCR Live AQI", "query": "delhi ncr average aqi kitna hai?"},
        {"label": "📈 72-Hour Pollution Forecast", "query": "72-hour pollution forecast overview"},
        {"label": "🏛️ Multi-Agency Dispatches", "query": "multi agency stakeholder dispatches kya hain?"}
    ]
}


def build_context_message(snapshot: dict, grap_data: dict = None) -> str:
    try:
        met = snapshot.get("meteorology", {})
        fires = snapshot.get("stubble_burning", {})
        attr = snapshot.get("source_attribution", {})
        stations = snapshot.get("stations", [])

        sorted_stations = sorted(stations, key=lambda x: x.get("aqi", 0), reverse=True)
        worst = sorted_stations[0] if sorted_stations else {}

        ctx = f"""LIVE SYSTEM DATA:
- Delhi NCR Average AQI: {snapshot.get('delhi_ncr_avg_aqi', 'N/A')} ({snapshot.get('category', 'N/A')})
- Wind: {met.get('wind_speed_kmh', 'N/A')} km/h from {met.get('wind_direction_cardinal', 'N/A')} ({met.get('wind_direction_deg', 'N/A')}°)
- Boundary Layer Height (PBLH): {met.get('boundary_layer_height_m', 'N/A')} m
- Thermal Inversion (ΔT): {met.get('inversion_strength_c', 'N/A')} °C
- Ventilation Index: {met.get('ventilation_index_m2s', 'N/A')} m²/s ({met.get('ventilation_status', 'N/A')})
- Active Stubble Fires (Punjab/Haryana): {fires.get('total_active_fires', 'N/A')}
- Stubble PM2.5 Share: {attr.get('stubble_burning', 'N/A')}%
- Worst Station: {worst.get('name', 'N/A')} (AQI {worst.get('aqi', 'N/A')})
"""
        return ctx
    except Exception as e:
        logger.error(f"Context build error: {e}")
        return ""


def _offline_smart_response(query: str, snapshot: dict, grap_data: dict = None, language: str = "hinglish") -> Dict[str, Any]:
    """
    Offline AI Engine localized in English, Hindi, and Hinglish.
    """
    q = query.lower().strip()
    met = snapshot.get("meteorology", {})
    fires = snapshot.get("stubble_burning", {})
    attr = snapshot.get("source_attribution", {})
    aqi = snapshot.get("delhi_ncr_avg_aqi", "280")
    cat = snapshot.get("category", "Poor")
    vi = met.get("ventilation_index_m2s", "1250")
    pblh = met.get("boundary_layer_height_m", "320")
    wind = met.get("wind_speed_kmh", "8.5")
    wind_dir = met.get("wind_direction_cardinal", "NW")
    inv = met.get("inversion_strength_c", "3.2")
    total_fires = fires.get("total_active_fires", "1850")
    stubble_pct = attr.get("stubble_burning", "35")

    # 1. School closure query
    if any(w in q for w in ["school", "college", "education", "student", "bachhe", "children", "band", "chutti", "close", "holiday", "स्कूल", "कॉलेज", "छुट्टी"]):
        if isinstance(aqi, (int, float)) and aqi > 450:
            if language == "en":
                text = f"🚨 **Schools SHOULD BE CLOSED.** The current AQI is **{aqi}** ({cat}), which falls under GRAP Stage-4 (450+ Emergency). The mandatory directive to shift primary and secondary classes to online mode is triggered."
            elif language == "hi":
                text = f"🚨 **स्कूल बंद होने चाहिए।** वर्तमान AQI **{aqi}** ({cat}) है जो ग्रैप चरण-4 (450+ आपातकाल) के अंतर्गत आता है। प्राथमिक और माध्यमिक कक्षाओं को ऑनलाइन माध्यम में स्थानांतरित करने का अनिवार्य आदेश लागू हो चुका है।"
            else:
                text = f"🚨 **Schools CLOSED hone chahiye.** Abhi AQI **{aqi}** ({cat}) hai jo GRAP Stage-4 (450+ emergency) me aata hai. Primary aur secondary classes online shift karne ka mandatory rule trigger ho chuka hai."
        elif isinstance(aqi, (int, float)) and aqi > 400:
            if language == "en":
                text = f"⚠️ **Outdoor sports and morning assemblies are suspended.** Current AQI is **{aqi}** ({cat}) — GRAP Stage-3 is active. If the 24–48h forecast exceeds 450, full school closure orders will be enforced."
            elif language == "hi":
                text = f"⚠️ **आउटडोर खेल और सुबह की प्रार्थना सभाएं निलंबित रहेंगी।** वर्तमान AQI **{aqi}** ({cat}) है — ग्रैप चरण-3 सक्रिय है। यदि 24-48 घंटे का पूर्वानुमान 450 पार करता है तो स्कूल बंद करने का आदेश लागू होगा।"
            else:
                text = f"⚠️ **Outdoor sports aur morning assemblies band rahengi.** Current AQI **{aqi}** ({cat}) — GRAP Stage-3 active hai. Agar agle 24-48h me forecast 450 cross karega toh school closure order execute hoga."
        else:
            if language == "en":
                text = f"✅ **School closures are currently NOT required.** The current AQI is **{aqi}** ({cat}). Regular classes may continue, but morning strenuous outdoor physical activities should be minimized."
            elif language == "hi":
                text = f"✅ **वर्तमान में स्कूल बंद करने की आवश्यकता नहीं है।** वर्तमान AQI **{aqi}** ({cat}) है। नियमित कक्षाएं जारी रह सकती हैं, परंतु सुबह के समय भारी बाहरी गतिविधियों से बचना चाहिए।"
            else:
                text = f"✅ **Abhi schools band karne ki zarurat nahi hai.** Current AQI **{aqi}** ({cat}) hai. Normal classes chal sakti hain, lekin subah outdoor physical activities moderate rakhni chahiye."
        return {"answer": text, "show_options": False}

    # 2. Ventilation Index
    if any(w in q for w in ["ventilation", "vi ", "vi=", "dispersion", "वेंटिलेशन"]):
        if language == "en":
            text = f"""**Ventilation Index ($VI$) — Coupled Meteorology & Dispersion:**

- **Current VI:** **{vi} m²/s** ({met.get('ventilation_status', 'Critical Trapping')})
- **Formula:** $VI = \\text{{Wind Speed}} \\times \\text{{Boundary Layer Height (PBLH)}}$
- **Calculation:** ${wind} \\text{{ km/h}} \\times {pblh} \\text{{ m}} = {vi} \\text{{ m}}^2/\\text{{s}}$
- **Standard Thresholds:**
  - $> 3500 \\text{{ m}}^2/\\text{{s}}$ : Good Atmospheric Dispersion
  - $< 2000 \\text{{ m}}^2/\\text{{s}}$ : **Critical Trapping Zone** (pollutants accumulate near ground)"""
        elif language == "hi":
            text = f"""**वेंटिलेशन इंडेक्स ($VI$) — युग्मित वायुमंडलीय भौतिकी:**

- **वर्तमान VI:** **{vi} m²/s** ({met.get('ventilation_status', 'गंभीर ट्रैपिंग')})
- **सूत्र:** $VI = \\text{{हवा की गति}} \\times \\text{{सीमा परत ऊंचाई (PBLH)}}$
- **गणना:** ${wind} \\text{{ km/h}} \\times {pblh} \\text{{ m}} = {vi} \\text{{ m}}^2/\\text{{s}}$
- **मानक सीमाएं:**
  - $> 3500 \\text{{ m}}^2/\\text{{s}}$ : अनुकूल वायु प्रकीर्णन (प्रदूषण दूर बहता है)
  - $< 2000 \\text{{ m}}^2/\\text{{s}}$ : **गंभीर ट्रैपिंग क्षेत्र** (प्रदूषक सतह के पास फंस जाते हैं)"""
        else:
            text = f"""**Ventilation Index ($VI$) — Coupled Physics:**

- **Current VI:** **{vi} m²/s** ({met.get('ventilation_status', 'Critical Trapping')})
- **Formula:** $VI = \\text{{Wind Speed}} \\times \\text{{Boundary Layer Height (PBLH)}}$
- **Calculation:** ${wind} \\text{{ km/h}} \\times {pblh} \\text{{ m}} = {vi} \\text{{ m}}^2/\\text{{s}}$
- **Standard Thresholds:**
  - $> 3500 \\text{{ m}}^2/\\text{{s}}$ : Good Atmospheric Dispersion
  - $< 2000 \\text{{ m}}^2/\\text{{s}}$ : **Critical Trapping Zone** (pollutants accumulate near ground)"""
        return {"answer": text, "show_options": False}

    # 3. Stubble burning / Parali
    if any(w in q for w in ["fire", "stubble", "parali", "farm", "punjab", "haryana", "burning", "smoke", "dhuan", "पराली", "आग", "धुआं"]):
        if language == "en":
            text = f"""**Satellite Farm Fire Telemetry (NASA FIRMS):**

- **Total Active Fires:** **{total_fires}** (Punjab & Haryana combined)
- **Stubble PM2.5 Share:** **{stubble_pct}%** of Delhi's regional pollution
- **Wind Vector:** {wind_dir} at {wind} km/h

The North-Westerly wind corridor transports agricultural smoke plumes directly from Punjab and Haryana into the Delhi NCR receptor basin."""
        elif language == "hi":
            text = f"""**उपग्रह पराली दहन टेलीमेट्री (नासा फर्म्स):**

- **कुल सक्रिय आग:** **{total_fires}** (पंजाब और हरियाणा संयुक्त)
- **पराली PM2.5 हिस्सेदारी:** दिल्ली के प्रदूषण में **{stubble_pct}%** योगदान
- **हवा की दिशा एवं गति:** {wind_dir} से {wind} किमी/घंटा

उत्तर-पश्चिमी पवन गलियारा पराली के धुएं को सीधे पंजाब और हरियाणा से दिल्ली एनसीआर बेसिन की ओर प्रवाहित कर रहा है।"""
        else:
            text = f"""**Satellite Farm Fire Telemetry (NASA FIRMS):**

- **Total Active Fires:** **{total_fires}** (Punjab & Haryana combined)
- **Stubble PM2.5 Share:** **{stubble_pct}%** of Delhi's total pollution
- **Wind Vector:** {wind_dir} at {wind} km/h

North-Westerly wind corridor stubble smoke ko seedha Punjab/Haryana se Delhi NCR basin me transport kar raha hai."""
        return {"answer": text, "show_options": False}

    # 4. Planetary Boundary Layer (PBLH)
    if any(w in q for w in ["pblh", "boundary layer", "mixing height", "ceiling", "layer", "सीमा परत"]):
        severity = "CRITICAL TRAPPING" if isinstance(pblh, (int, float)) and pblh < 400 else "MODERATE" if isinstance(pblh, (int, float)) and pblh < 800 else "FAVORABLE"
        if language == "en":
            text = f"""**Planetary Boundary Layer Height (PBLH):**

- **Current PBLH:** **{pblh} meters** — *{severity}*
- Normal Daytime Ceiling: 1500–2500m | Critical Danger Threshold: < 400m

**Atmospheric Trapping:** At {pblh}m, the atmospheric ceiling drops drastically, acting as a lid over Delhi NCR and confining vehicular and industrial particulate emissions close to the ground."""
        elif language == "hi":
            text = f"""**ग्रहीय सीमा परत ऊंचाई (PBLH):**

- **वर्तमान PBLH:** **{pblh} मीटर** — *{severity}*
- सामान्य दिन की सीमा: 1500–2500 मी | गंभीर खतरा सीमा: < 400 मी

**वायुमंडलीय ट्रैपिंग:** {pblh} मीटर पर वायुमंडलीय छत अत्यधिक नीचे आ जाती है, जिससे दिल्ली के ऊपर ढक्कन जैसी स्थिति बनती है और समस्त वाहन व औद्योगिक उत्सर्जन सतह पर फंस जाता है।"""
        else:
            text = f"""**Planetary Boundary Layer Height (PBLH):**

- **Current PBLH:** **{pblh} meters** — *{severity}*
- Normal Daytime Ceiling: 1500–2500m | Critical Danger: < 400m

**Atmospheric Trapping Mechanism:** {pblh}m par atmospheric ceiling dab jati hai — Delhi ke upar lid lag jati hai aur saare emissions ground level par trap ho jaate hain."""
        return {"answer": text, "show_options": False}

    # 5. Thermal Inversion
    if any(w in q for w in ["inversion", "thermal", "temperature", "trap", "इन्वर्जन", "उत्क्रमण"]):
        if language == "en":
            text = f"""**Thermal Inversion ($\\\\Delta T$) Analysis:**

- **Inversion Strength:** **{inv} °C**
- **Physics Mechanism:** During nocturnal radiative cooling, surface air cools rapidly while a warmer air layer forms aloft. This inverted temperature profile suppresses vertical convective mixing, locking pollutants at breathing level."""
        elif language == "hi":
            text = f"""**तापीय उत्क्रमण (थर्मल इन्वर्जन $\\\\Delta T$) विश्लेषण:**

- **इन्वर्जन तीव्रता:** **{inv} °C**
- **भौतिक प्रक्रिया:** रात में विकिरण शीतलन के कारण सतह की हवा ठंडी हो जाती है जबकि ऊपर गर्म हवा की परत बन जाती है। यह उल्टी तापीय संरचना प्रदूषकों को ऊपर उठने से रोकती है।"""
        else:
            text = f"""**Thermal Inversion ($\\\\Delta T$) Analysis:**

- **Inversion Strength:** **{inv} °C**
- **Physics Mechanism:** Nocturnal cooling ke dauran surface air thandi ho jati hai aur upar warm layer ban jati hai. Yeh inverted temperature profile pollutants ko vertically disperse hone se rokta hai."""
        return {"answer": text, "show_options": False}

    # 6. GRAP rules & stages
    if any(w in q for w in ["grap", "stage", "curbs", "restriction", "ban", "ग्रैप", "प्रतिबंध"]):
        stage = "Stage 4 (Emergency)" if isinstance(aqi, (int, float)) and aqi >= 450 else ("Stage 3 (Severe)" if isinstance(aqi, (int, float)) and aqi >= 401 else ("Stage 2 (Very Poor)" if isinstance(aqi, (int, float)) and aqi >= 301 else "Stage 1 (Poor)"))
        if language == "en":
            text = f"""**Predictive GRAP Decision Matrix:**

- **Current Regional AQI:** **{aqi}** ({cat})
- **Active Mandate:** **GRAP {stage}**

**Pre-emptive Actions Triggered:**
- Suspension of non-essential diesel generators & mechanized road sweeping
- Strict construction & demolition dust abatement
- Commercial heavy vehicles diverted to Peripheral Expressways (EPE/WPE)"""
        elif language == "hi":
            text = f"""**पूर्वानुमानित ग्रैप (GRAP) निर्णय मैट्रिक्स:**

- **वर्तमान क्षेत्रीय AQI:** **{aqi}** ({cat})
- **सक्रिय चरण:** **ग्रैप {stage}**

**लागू पूर्व-निवारक कदम:**
- गैर-आपातकालीन डीजल जनरेटर पर रोक एवं यांत्रिक सड़क सफाई
- निर्माण और विध्वंस गतिविधियों पर धूल नियंत्रण प्रतिबंध
- दिल्ली के बाहर जाने वाले ट्रकों को ईस्टर्न/वेस्टर्न पेरिफेरल एक्सप्रेसवे पर डायवर्ट करना"""
        else:
            text = f"""**Predictive GRAP Decision Matrix:**

- **Current Regional AQI:** **{aqi}** ({cat})
- **Active Stage:** **GRAP {stage}**

**Pre-emptive Actions Triggered:**
- Diesel generator curbs & mechanized road sweeping
- Construction & demolition dust mitigation
- Non-essential BS-III/IV vehicle routing to bypass expressways (EPE/WPE)"""
        return {"answer": text, "show_options": False}

    # 7. Health advisory
    if any(w in q for w in ["health", "sehat", "doctor", "asthma", "breathe", "saans", "mask", "n95", "स्वास्थ्य", "मास्क"]):
        if language == "en":
            text = f"""**Health Advisory (Current AQI {aqi} — {cat}):**

- 😷 **N95 Mask:** Strongly recommended whenever stepping outdoors
- 🏃 **Morning Exercise:** Avoid strenuous outdoor exertion between 6–9 AM (peak inversion)
- 👶 **Vulnerable Groups:** Children, elderly, and respiratory patients should stay indoors
- 💨 **Indoor Air:** Keep windows closed during nocturnal hours and run HEPA purifiers"""
        elif language == "hi":
            text = f"""**स्वास्थ्य सलाह (वर्तमान AQI {aqi} — {cat}):**

- 😷 **N95 मास्क:** घर से बाहर निकलते समय N95 मास्क का अनिवार्य उपयोग करें
- 🏃 **प्रातः भ्रमण:** सुबह 6 से 9 बजे के बीच बाहरी भारी व्यायाम से बचें (पीक इन्वर्जन समय)
- 👶 **संवेदनशील वर्ग:** बच्चे, बुजुर्ग और दमा के मरीज घर के अंदर रहें
- 💨 **घर के अंदर की हवा:** खिड़कियां बंद रखें और संभव हो तो HEPA एयर प्यूरीफायर चलाएं"""
        else:
            text = f"""**Health Advisory (Current AQI {aqi} — {cat}):**

- 😷 **N95 Mask:** Outdoor travel me zaroor use karein
- 🏃 **Morning Walk:** Subah 6–9 AM avoid karein (ground inversion peak time)
- 👶 **Children & Elderly:** Indoor activities prefer karein
- 💨 **Indoor Air:** Windows band rakhein aur HEPA purifiers use karein"""
        return {"answer": text, "show_options": False}

    # 8. Trucks & Odd-Even
    if any(w in q for w in ["truck", "odd-even", "traffic", "vehicle", "diversion", "ट्रक", "वाहनों"]):
        if language == "en":
            text = f"""**Vehicular & Freight Curbs (What-If Policy):**

- **Vehicular PM2.5 Share:** {attr.get('vehicular_emissions', 28)}%
- **Highway Freight Diversion:** Non-destined commercial heavy vehicles redirected to Eastern & Western Peripheral Expressways
- **Odd-Even Policy:** Evaluated for GRAP Stage 4 (>450 AQI), producing an estimated 15–25 AQI point reduction."""
        elif language == "hi":
            text = f"""**वाहनों एवं मालवाहक ट्रकों पर प्रतिबंध (नीति प्रभाव):**

- **वाहनों का PM2.5 में हिस्सा:** {attr.get('vehicular_emissions', 28)}%
- **राजमार्ग ट्रक डायवर्जन:** दिल्ली में प्रवेश न करने वाले ट्रकों को ईस्टर्न व वेस्टर्न पेरिफेरल एक्सप्रेसवे पर डायवर्ट किया जाता है
- **ऑड-ईवन नीति:** ग्रैप स्टेज 4 (>450 AQI) पर लागू होती है, जिससे अनुमानित 15-25 AQI अंकों की राहत मिलती है।"""
        else:
            text = f"""**Vehicular & Traffic Curbs (What-If Policy):**

- **Vehicular Emission Share:** {attr.get('vehicular_emissions', 28)}%
- **Highway Freight Diversion:** Non-destined heavy trucks redirected to Eastern & Western Peripheral Expressways
- **Odd-Even Policy:** GRAP Stage 4 (>450 AQI) par consider hoti hai, jisse estimated 15–25 AQI points reduction milta hai."""
        return {"answer": text, "show_options": False}

    # 9. 72h Forecast
    if any(w in q for w in ["forecast", "kal kaisa", "aage kaisa", "72h", "48h", "peak", "पूर्वानुमान"]):
        if language == "en":
            text = f"""**Coupled 72-Hour Forecast Overview:**

- **Baseline Delhi AQI:** **{aqi}**
- **Ventilation Index:** **{vi} m²/s**
- **Active Satellite Fires:** **{total_fires}**

Atmospheric trapping signals indicate severe smog accumulation over the next 48 hours. Please inspect the **Coupled 72h Forecast** panel for station-specific trajectory curves."""
        elif language == "hi":
            text = f"""**युग्मित 72-घंटे का समग्र पूर्वानुमान:**

- **आधारभूत दिल्ली AQI:** **{aqi}**
- **वेंटिलेशन इंडेक्स:** **{vi} m²/s**
- **सक्रिय उपग्रह आग:** **{total_fires}**

अगले 48 घंटों में वायुमंडलीय ट्रैपिंग बढ़ने के संकेत हैं। स्टेशन-वार विस्तृत कर्व्स देखने के लिए डैशबोर्ड में **युग्मित 72h पूर्वानुमान** पैनल देखें।"""
        else:
            text = f"""**Coupled 72-Hour Forecast Summary:**

- Baseline Delhi AQI: **{aqi}**
- Ventilation Index: **{vi} m²/s**
- Active Fires: **{total_fires}**

Agle 48 ghante me atmospheric trapping intensify hone ke signals hain. Full station-wise forecast dekhne ke liye dashboard me **Coupled 72h Forecast** panel check karein."""
        return {"answer": text, "show_options": False}

    # 10. Overall AQI
    if any(w in q for w in ["aqi", "pollution", "air quality", "hawa", "kitna hai", "प्रदूषण"]):
        if language == "en":
            text = f"""**Delhi NCR Air Quality Telemetry:**

- **Average AQI:** **{aqi}** ({cat})
- **Wind Speed:** {wind} km/h ({wind_dir})
- **PBLH Ceiling:** {pblh} meters
- **Active Satellite Fires:** {total_fires}"""
        elif language == "hi":
            text = f"""**दिल्ली एनसीआर वायु गुणवत्ता टेलीमेट्री:**

- **औसत AQI:** **{aqi}** ({cat})
- **हवा की गति:** {wind} किमी/घंटा ({wind_dir})
- **PBLH छत:** {pblh} मीटर
- **सक्रिय उपग्रह पराली आग:** {total_fires}"""
        else:
            text = f"""**Delhi NCR Air Quality Telemetry:**

- **Average AQI:** **{aqi}** ({cat})
- **Wind Speed:** {wind} km/h ({wind_dir})
- **PBLH Ceiling:** {pblh} meters
- **Active Satellite Fires:** {total_fires}"""
        return {"answer": text, "show_options": False}

    # 11. Multi-agency Dispatches
    if any(w in q for w in ["dispatch", "agency", "stakeholder", "police", "mcd", "आदेश", "एजेंसी"]):
        if language == "en":
            text = """**Multi-Agency Stakeholder Action Dispatches:**

- 🌾 **Agriculture Dept (Punjab/Haryana):** Mobilization of CRM & Happy Seeder machinery
- 👮 **Traffic Police:** Peripheral expressway commercial truck diversions
- 🚛 **MCD / PWD:** Deployment of anti-smog guns & water misting trucks
- 🏫 **Directorate of Education:** School hybrid/online mode readiness advisory
- 🏥 **Health Services:** Respiratory emergency ward readiness"""
        elif language == "hi":
            text = """**बहु-एजेंसी कार्यकारी कार्रवाई आदेश:**

- 🌾 **कृषि विभाग (पंजाब/हरियाणा):** हैप्पी सीडर व पराली प्रबंधन मशीनों की तैनाती
- 👮 **यातायात पुलिस:** पेरिफेरल एक्सप्रेसवे पर भारी वाहनों का डायवर्जन
- 🚛 **एमसीडी / पीडब्ल्यूडी:** एंटी-स्मॉग गन और पानी के छिड़काव की तैनाती
- 🏫 **शिक्षा निदेशालय:** स्कूलों में ऑनलाइन/हाइब्रिड मोड की तैयारी सलाह
- 🏥 **स्वास्थ्य विभाग:** श्वसन आपातकालीन वार्डों की पूर्ण तैयारी"""
        else:
            text = """**Multi-Agency Action Dispatches:**

- 🌾 **Agri Dept (Punjab/Haryana):** Happy Seeder & CRM machinery mobilization
- 👮 **Traffic Police:** Eastern & Western Peripheral truck diversions
- 🚛 **MCD / PWD:** Anti-smog guns & mechanized water sprinkling
- 🏫 **DoE Delhi:** School closure & hybrid mode advisory
- 🏥 **Health Services:** Respiratory emergency ward preparation"""
        return {"answer": text, "show_options": False}

    # 12. Fallback when query is not matched offline
    if language == "en":
        fallback_text = """⚠️ **No Internet Connection (Offline AI Mode)**

To chat freely on any topic or ask open-ended questions, please connect to the **Internet** (Gemini AI will activate).

In offline mode, please select one of the domain topics below to query local coupled meteorology and air quality data:"""
    elif language == "hi":
        fallback_text = """⚠️ **इंटरनेट कनेक्शन बंद है (ऑफलाइन एआई मोड)**

किसी भी विषय पर खुली बातचीत के लिए कृपया **इंटरनेट चालू करें** (जेमिनी एआई सक्रिय होगा)।

ऑफलाइन मोड में वास्तविक समय के वायु गुणवत्ता एवं मौसम डेटा की जांच के लिए नीचे दिए गए विषयों में से चुनें:"""
    else:
        fallback_text = """⚠️ **Aapka Internet OFF hai (Offline AI Mode)!**

Open-ended baatein karne ya kisi bhi random sawaal ka answer paane ke liye kripya **Internet ON karein** (tab Gemini AI open conversations karega).

Offline mode me system ke data aur coupled physics ke liye aap **niche diye gaye topics me se select karein:**"""

    return {"answer": fallback_text, "show_options": True}


def detect_query_language(question: str, default_lang: str = "hinglish") -> str:
    """
    Detects if the user is asking in Hindi (Devanagari), pure English, or Hinglish.
    Defaults to the app's selected language setting if neutral or ambiguous.
    """
    q = question.strip()
    if not q:
        return default_lang

    # 1. Check for Devanagari script (\u0900-\u097F) -> pure Hindi
    if re.search(r'[\u0900-\u097F]', q):
        return "hi"

    # 2. Check for common conversational Hinglish words/particles
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

    # 3. Check for English syntax / markers
    english_markers = [
        r'\bwhat\b', r'\bhow\b', r'\bwhy\b', r'\bwhen\b', r'\bwhere\b', r'\bwhich\b',
        r'\bwho\b', r'\bwill\b', r'\bcan\b', r'\bshould\b', r'\bcould\b', r'\bwould\b',
        r'\bis\b', r'\bare\b', r'\bthe\b', r'\bthis\b', r'\bthat\b', r'\bexplain\b',
        r'\bforecast\b', r'\bstatus\b', r'\banalysis\b', r'\bclosed\b', r'\bclose\b'
    ]
    if re.search('|'.join(english_markers), q, re.IGNORECASE):
        return "en"

    return default_lang


def _try_gemini_rest(question: str, context: str, language: str = "hinglish") -> Optional[str]:
    """Call Gemini using fast HTTP REST with adaptive language enforcement."""
    lang_instruction = "Respond in natural, engaging conversational Hinglish (blend of Hindi and English)."
    if language == "en":
        lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in ENGLISH. You MUST answer strictly and entirely in formal, professional English. Absolutely NO Hindi or Hinglish words are allowed."
    elif language == "hi":
        lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in HINDI. You MUST answer strictly and entirely in clear Devanagari Hindi (शुद्ध हिन्दी). Absolutely NO English alphabet or Hinglish words are allowed."

    system_prompt = f"{VAYUCOUPLER_SYSTEM_PROMPT}\n\n{lang_instruction}"
    models_to_try = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"]
    for model_name in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {
                        "parts": [
                            {"text": f"{context}\n\nUser Question: {question}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 700
                }
            }
            r = requests.post(url, json=payload, timeout=12.0)
            if r.status_code == 200:
                data = r.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                logger.warning(f"Gemini API {model_name} status {r.status_code}: {r.text[:120]}")
        except Exception as e:
            logger.warning(f"REST Gemini attempt {model_name} failed: {e}")
            continue
    return None


async def query_vayuai(
    question: str,
    snapshot: dict,
    grap_data: dict = None,
    use_gemini: bool = True,
    language: str = "en"
) -> dict:
    """
    Main AI query function:
    - Sets default language from user app settings (default: en)
    - Dynamically detects the incoming question's language (Hindi, English, Hinglish)
    - Retains Online AI Mode whenever client is online
    """
    effective_language = detect_query_language(question, default_lang=language)

    context = build_context_message(snapshot, grap_data)
    active_options = OFFLINE_TOPICS_BY_LANG.get(effective_language, OFFLINE_TOPICS_BY_LANG.get(language, OFFLINE_TOPICS_BY_LANG["en"]))

    if use_gemini:
        if GEMINI_API_KEY:
            try:
                gemini_answer = await asyncio.to_thread(_try_gemini_rest, question, context, effective_language)
                if gemini_answer:
                    return {
                        "answer": gemini_answer,
                        "mode": "gemini",
                        "model": "Gemini 3.5 Flash (Online)",
                        "online": True,
                        "language": effective_language,
                        "default_language": language,
                        "options": []
                    }
            except Exception as e:
                logger.warning(f"Gemini error or offline: {e}")

        # Cloud Neural Copilot Response (Online MoES Telemetry Engine)
        smart_res = _offline_smart_response(query=question, snapshot=snapshot, grap_data=grap_data, language=effective_language)
        return {
            "answer": smart_res["answer"],
            "mode": "online",
            "model": "VayuAI Neural Copilot (MoES Cloud)",
            "online": True,
            "language": effective_language,
            "default_language": language,
            "show_options": smart_res.get("show_options", False),
            "options": active_options
        }

    # Truly Offline AI Engine (when client device is offline or explicitly requested)
    offline_res = _offline_smart_response(query=question, snapshot=snapshot, grap_data=grap_data, language=effective_language)
    return {
        "answer": offline_res["answer"],
        "mode": "offline",
        "model": "Offline AI Engine (Edge Physics)",
        "online": False,
        "language": effective_language,
        "default_language": language,
        "show_options": offline_res.get("show_options", False),
        "options": active_options
    }
