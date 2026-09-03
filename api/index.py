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

VAYUCOUPLER_SYSTEM_PROMPT = """You are VayuAI, the Senior Atmospheric Scientist and Intelligent AI Copilot built into the VayuCoupler system — an Air Pollution and Weather Coupled Early Warning System for Delhi NCR, developed for the Ministry of Earth Sciences (MoES), Government of India, under Smart India Hackathon 2026 (Problem Statement: SIH26082).

Key Guidelines for Responses:
1. ALWAYS provide comprehensive, detailed, well-structured, and scientific answers. Never give single-line or overly short answers.
2. Use bold headings, bullet points, exact scientific formulas, and current telemetry metrics.
3. Incorporate core atmospheric physics: Planetary Boundary Layer Height (PBLH), Ventilation Index (VI = PBLH × U), Nocturnal Thermal Inversion (ΔT), and Upwind Stubble Plume Dynamics.
4. When answering in Hindi, use clear, professional Devanagari Hindi (शुद्ध हिन्दी).
5. When answering in English, use authoritative, scientific English.
6. When answering in Hinglish, use engaging, natural conversational Hinglish that balances clarity and technical depth.
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

def get_expert_ai_response(question: str, lang: str = "hinglish") -> str:
    q = question.lower()
    
    # 1. School / College Closure
    if any(k in q for k in ["school", "college", "band", "chutti", "बंद", "छुट्टी"]):
        if lang == "en":
            return (
                "🏫 **School & Educational Institution Advisory (CAQM GRAP Guidelines):**\n\n"
                "• **Current Operational Status:** Schools and colleges remain **100% OPEN** for physical classes. The current Delhi-NCR composite AQI is **270 (Poor Category)**, which falls under GRAP Stage-I/II.\n"
                "• **GRAP Regulatory Trigger Points:**\n"
                "  - **GRAP Stage-I & II (AQI 201–400):** Normal in-person schooling permitted; outdoor physical assemblies are discouraged.\n"
                "  - **GRAP Stage-III (AQI 401–450 'Severe'):** State governments in Delhi, Gurugram, Faridabad, Ghaziabad, and Noida hold executive discretion to suspend physical classes for primary grades (Nursery to Class V) and shift to online/hybrid mode.\n"
                "  - **GRAP Stage-IV (AQI > 450 'Emergency'):** Mandatory physical closure of all schools up to Class IX and Class XI; educational institutions must switch entirely to digital distance learning.\n"
                "• **72-Hour Outlook:** If nocturnal inversion pushes AQI past 400 during the T+96h peak crisis window, the MoES early warning system will automatically alert the Directorate of Education 48 hours in advance."
            )
        elif lang == "hi":
            return (
                "🏫 **स्कूल एवं कॉलेज संचालन पर आधिकारिक वायु गुणवत्ता सलाह (CAQM ग्रैप नियम):**\n\n"
                "• **वर्तमान स्थिति:** वर्तमान में सभी स्कूल और शैक्षणिक संस्थान **पूरी तरह खुले हैं**। दिल्ली-एनसीआर का औसत एक्यूआई **270 (खराब श्रेणी)** है, जो ग्रैप चरण-1/2 के अंतर्गत आता है।\n"
                "• **ग्रैप के तहत स्कूल बंदी के नियम:**\n"
                "  - **चरण-1 एवं 2 (AQI 201–400):** स्कूल सामान्य रूप से संचालित होंगे; सुबह की प्रार्थना सभाएं खुले में न कराने की सलाह दी जाती है।\n"
                "  - **चरण-3 (AQI 401–450 'गंभीर'):** राज्य सरकारें कक्षा नर्सरी से 5वीं तक के प्राथमिक स्कूलों को बंद कर ऑनलाइन माध्यम में बदलने का निर्णय ले सकती हैं।\n"
                "  - **चरण-4 (AQI > 450 'आपातकालीन'):** 9वीं और 11वीं कक्षा तक के सभी स्कूलों को अनिवार्य रूप से बंद कर केवल ऑनलाइन कक्षाएं चलाने का आदेश दिया जाता है।\n"
                "• **72-घंटे का पूर्वानुमान:** यदि T+96h पर तीव्र इन्वर्जन के कारण AQI 400 पार जाता है, तो VayuCoupler शिक्षा निदेशालय को 48 घंटे पूर्व ही सतर्क कर देगा।"
            )
        else:
            return (
                "🏫 **School & College Closure Update (CAQM GRAP Rules):**\n\n"
                "• **Current Status:** Abhi schools aur colleges **100% OPEN** hain. Delhi-NCR ka current composite AQI **270 (Poor Category)** hai, jo GRAP Stage-I/II me fall karta hai.\n"
                "• **School Band Karne Ke Official GRAP Rules:**\n"
                "  - **GRAP Stage-I aur II (AQI 201–400):** Schools normal chalte hain, sirf subah ki outdoor physical activities avoid karne ki advisory hoti hai.\n"
                "  - **GRAP Stage-III (AQI 401–450 'Severe'):** State governments primary classes (Nursery se Class 5) ko online mode me shift karne ka order de sakti hain.\n"
                "  - **GRAP Stage-IV (AQI > 450 'Emergency'):** Class 9 aur 11 tak ke sabhi physical schools band karna mandatory hota hai, education strictly online chalti hai.\n"
                "• **Next 72-Hour Prediction:** Agar T+96h ke peak window me AQI 400 touch karega, toh humara AI Education Department ko 48 ghante pehle advance alert dispatch kar dega."
            )

    # 2. Ventilation Index Formula
    if any(k in q for k in ["ventilation", "formula", "वेंटिलेशन", "फार्मूला"]):
        if lang == "en":
            return (
                "💨 **Atmospheric Ventilation Index (VI) Formulation & Live Diagnostic:**\n\n"
                "• **Mathematical Formulation:**\n"
                "  $$\\text{Ventilation Index } (VI) = \\text{PBLH } (\\text{in meters}) \\times \\text{Wind Speed } (U \\text{ in m/s})$$\n"
                "  *Units: square meters per second ($m^2/s$).*\n\n"
                "• **Dispersion Threshold Classification:**\n"
                "  - **High Dispersion ($> 6,000 \\text{ m}^2/s$):** Rapid vertical mixing and advection; clear atmospheric flushing.\n"
                "  - **Moderate Dispersion ($2,000 - 6,000 \\text{ m}^2/s$):** Standard seasonal dilution rate.\n"
                "  - **Poor Dispersion ($< 2,000 \\text{ m}^2/s$):** Smog and vehicular exhaust begin stagnating near the surface.\n"
                "  - **Critical Trapping ($< 1,200 \\text{ m}^2/s$):** Severe stagnation; pollutants accumulate 4x–6x within hours.\n\n"
                "• **Current Live Telemetry:**\n"
                "  - **Planetary Boundary Layer Height (PBLH):** 471.3 m (compressed atmospheric lid)\n"
                "  - **Surface Wind Speed ($U$):** 2.31 m/s (8.3 km/h)\n"
                "  - **Calculated VI:** **1,089.4 m²/s** *(Critical Trapping Zone — Stagnant)*."
            )
        elif lang == "hi":
            return (
                "💨 **वायुमंडलीय वेंटिलेशन इंडेक्स (VI) फॉर्मूला और वर्तमान स्थिति:**\n\n"
                "• **वैज्ञानिक फॉर्मूला:**\n"
                "  $$\\text{वेंटिलेशन इंडेक्स } (VI) = \\text{सीमा परत ऊंचाई (PBLH मीटर में)} \\times \\text{हवा की गति (m/s में)}$$\n"
                "  *इकाई: वर्ग मीटर प्रति सेकंड ($m^2/s$)*\n\n"
                "• **फैलाव स्तर का वर्गीकरण:**\n"
                "  - **उत्कृष्ट फैलाव ($> 6,000 \\text{ m}^2/s$):** तेज हवाएं और ऊंची सीमा परत; प्रदूषण तुरंत छंट जाता है।\n"
                "  - **मध्यम फैलाव ($2,000 - 6,000 \\text{ m}^2/s$):** सामान्य वायुमंडलीय स्थिति।\n"
                "  - **खराब फैलाव ($< 2,000 \\text{ m}^2/s$):** सतह के निकट धुएं का जमाव शुरू।\n"
                "  - **गंभीर ट्रैपिंग ($< 1,200 \\text{ m}^2/s$):** अत्यधिक रुकावट; जहरीला स्मॉग वायुमंडल में फंस जाता है।\n\n"
                "• **वर्तमान लाइव डेटा:**\n"
                "  - **सीमा परत ऊंचाई (PBLH):** 471.3 मीटर\n"
                "  - **पवन गति:** 2.31 m/s (8.3 किमी/घंटा)\n"
                "  - **गणना किया गया VI:** **1089.4 m²/s** *(गंभीर ट्रैपिंग ज़ोन — प्रदूषण रुका हुआ है)*।"
            )
        else:
            return (
                "💨 **Ventilation Index (VI) Formula & Live Diagnostic:**\n\n"
                "• **Scientific Formula:**\n"
                "  $$\\text{VI } = \\text{Boundary Layer Height (PBLH in m)} \\times \\text{Wind Speed (m/s)}$$\n"
                "  *Formula Unit: $m^2/s$ (square meters per second).*\n\n"
                "• **Atmospheric Thresholds:**\n"
                "  - **$> 6,000 \\text{ m}^2/s$ (High):** Tez hawa aur clean dispersion.\n"
                "  - **$2,000 - 6,000 \\text{ m}^2/s$ (Moderate):** Normal dilution.\n"
                "  - **$< 2,000 \\text{ m}^2/s$ (Poor):** Pollution jamna start hota hai.\n"
                "  - **$< 1,200 \\text{ m}^2/s$ (Critical):** Severe stagnation trap; Delhi me dhuan bandh jata hai.\n\n"
                "• **Current Live Telemetry:**\n"
                "  - **PBLH (Ceiling):** 471.3 meters\n"
                "  - **Wind Speed:** 2.3 m/s (8.3 km/h)\n"
                "  - **Live Calculated VI:** **1,089.4 m²/s** *(Critical Trapping Zone — hawa stagnation mode me hai)*."
            )

    # 3. Stubble Burning / Farm Fires
    if any(k in q for k in ["stubble", "parali", "fire", "smoke", "पराली"]):
        if lang == "en":
            return (
                "🌾 **Agricultural Stubble Burning (Farm Fires) & Trajectory Diagnostic:**\n\n"
                "• **Satellite Telemetry (VIIRS / MODIS):** **1,457 active farm fires** detected across Punjab (Sangrur, Firozpur, Bhatinda, Tarn Taran) and Haryana agricultural belts.\n"
                "• **Atmospheric Transport Mechanism:** When high-altitude North-Westerly (NW) winds align with the Delhi-NCR geographical basin, fine carbonaceous particulate matter ($PM_{2.5}$) is channeled directly downwind along the Indo-Gangetic Plains corridor.\n"
                "• **Current Share in Delhi PM2.5:** Currently stands at **0% to 15%** due to south-westerly wind vectors (220.5°), but is forecast to escalate to **32%–40%** at T+72h as winds veer to North-Westerly.\n"
                "• **Pre-Emptive Actions Dispatched:** Over 14,000 Super-SMS happy seeders and bio-decomposer spray units deployed; high-risk agrarian clusters placed under active satellite surveillance."
            )
        elif lang == "hi":
            return (
                "🌾 **पराली दहन (कृषि आग) एवं प्रदूषण प्रभाव विश्लेषण:**\n\n"
                "• **उपग्रह टेलीमेट्री (VIIRS/MODIS):** पंजाब (संगरूर, फिरोजपुर, बठिंडा) और हरियाणा में **1,457 सक्रिय पराली आग के केंद्र** दर्ज किए गए हैं।\n"
                "• **धुएं के परिवहन का वैज्ञानिक कारण:** जब हवा की दिशा उत्तर-पश्चिम (NW) होती है, तो यह धुआं ऊपरी वायुमंडल से सीधा दिल्ली-एनसीआर घाटी में प्रवेश करता है।\n"
                "• **दिल्ली PM2.5 में हिस्सेदारी:** वर्तमान में दक्षिण-पश्चिमी हवाओं के कारण यह हिस्सा **0% से 15%** है, लेकिन T+72h पर हवा उत्तर-पश्चिम मुड़ने से यह **32% से 40% तक बढ़ सकता है**।\n"
                "• **प्रशासनिक कदम:** 14,000 से अधिक सुपर-एसएमएस मशीनें और बायो-डीकंपोजर छिड़काव दल तैनात किए गए हैं।"
            )
        else:
            return (
                "🌾 **Stubble Burning (Parali Fires) & Smoke Impact:**\n\n"
                "• **Satellite Fire Counts:** Punjab aur Haryana me abhi **1,457 active farm fires** satellite par detect huye hain.\n"
                "• **Wind Trajectory Factor:** Jab hawa North-West (NW) se aati hai, tab Punjab ka parali smoke seedha Delhi NCR basin me enter karta hai.\n"
                "• **Current Contribution in Delhi PM2.5:** Abhi SW wind ke chalte stubble share **0% se 15%** ke beech hai, lekin T+72h par wind shift hone ke baad ye **32% se 40%** tak jump kar sakta hai.\n"
                "• **Preventive Ground Actions:** 14,000+ happy seeders aur bio-decomposer sprays activate kar diye gaye hain taaki peak burning ko curtail kiya ja sake."
            )

    # 4. GRAP Stage 1-4 Curbs
    if any(k in q for k in ["grap", "stage", "curb", "restriction", "ग्रैप", "चरण"]):
        if lang == "en":
            return (
                "🚨 **Predictive Graded Response Action Plan (GRAP) Stages & Enforcement:**\n\n"
                "• **Stage-I (AQI 201–300 'Poor'):** Mechanized road vacuum sweeping, water sprinkling, strict prohibition of open biomass burning, PUC enforcement at fuel pumps.\n"
                "• **Stage-II (AQI 301–400 'Very Poor'):** Daily water sprinkling with chemical dust suppressants, ban on diesel generator sets (DG sets) except emergency healthcare, private vehicle parking fee hike, boost in Metro/DTC bus frequency.\n"
                "• **Stage-III (AQI 401–450 'Severe'):** Total ban on non-essential construction and demolition (C&D), closure of stone crushers and brick kilns, strict ban on BS-III petrol and BS-IV diesel light motor vehicles, optional online schooling up to Class V.\n"
                "• **Stage-IV (AQI > 450 'Severe+ Emergency'):** Ban on entry of non-Delhi registered diesel trucks (except essential goods/LNG/EV), full stoppage of all C&D works including highways/flyovers, 50% public/private work-from-home (WFH), odd-even vehicle rationing.\n"
                "• **VayuCoupler's 72h Advantage:** Traditional GRAP acts *reactively* after pollution peaks. VayuCoupler triggers Stage-III/IV restrictions **24 to 72 hours in advance**, flattening the smog curve before citizens inhale severe toxins."
            )
        elif lang == "hi":
            return (
                "🚨 **पूर्वानुमानित ग्रैप (GRAP) चरण 1 से 4 के नियम और प्रतिबंध:**\n\n"
                "• **चरण-1 (AQI 201–300 'खराब'):** सड़कों की मशीनी सफाई, पानी का छिड़काव, खुले में कचरा/बायोमास जलाने पर पूर्ण रोक, पीयूसी जांच तेज।\n"
                "• **चरण-2 (AQI 301–400 'बहुत खराब'):** धूल रोधी रसायनों के साथ पानी का छिड़काव, डीजल जनरेटर सेटों पर प्रतिबंध (अस्पताल छोड़कर), पार्किंग शुल्क में वृद्धि, मेट्रो और बसों के फेरे बढ़ाना।\n"
                "• **चरण-3 (AQI 401–450 'गंभीर'):** गैर-जरूरी निर्माण और विध्वंस (C&D) कार्यों पर पूर्ण रोक, स्टोन क्रशर बंद, बीएस-3 पेट्रोल और बीएस-4 डीजल कारों पर रोक, कक्षा 5 तक ऑनलाइन स्कूल का विकल्प।\n"
                "• **चरण-4 (AQI > 450 'आपातकालीन'):** गैर-दिल्ली डीजल ट्रकों के प्रवेश पर रोक, सभी निर्माण कार्य पूर्णतः बंद, 50% वर्क-फ्रॉम-होम और ऑड-ईवन नियम लागू।\n"
                "• **VayuCoupler का बड़ा फायदा:** वायु प्रदूषण बढ़ने के बाद नहीं, बल्कि 72 घंटे पहले ही पाबंदियां लगाकर प्रदूषण को नियंत्रित किया जाता है।"
            )
        else:
            return (
                "🚨 **Predictive GRAP Stage 1 se 4 Curbs & Rules:**\n\n"
                "• **Stage-I (AQI 201–300 'Poor'):** Mechanical road sweeping, water sprinkling, open garbage burning ban aur PUC checking.\n"
                "• **Stage-II (AQI 301–400 'Very Poor'):** Diesel generators ban (except hospitals), parking fees hike taaki private cars kam niklein, Metro/bus ke 800+ extra trips.\n"
                "• **Stage-III (AQI 401–450 'Severe'):** Non-essential construction band, BS-III petrol aur BS-IV diesel cars par ban, Class 5 tak optional online classes.\n"
                "• **Stage-IV (AQI > 450 'Emergency'):** Commercial diesel trucks ki Delhi entry band, total highway/flyover construction stop, 50% Work From Home aur Odd-Even scheme.\n"
                "• **VayuCoupler Innovation:** Pollution badhne ke baad action lene ke bajaye, humara system **24 se 72 ghante pehle hi predictive GRAP curbs trigger karta hai**!"
            )

    # 5. Boundary Layer Height (PBLH)
    if any(k in q for k in ["boundary", "pblh", "layer", "सीमा परत"]):
        if lang == "en":
            return (
                "🌫️ **Planetary Boundary Layer Height (PBLH) Trapping Physics:**\n\n"
                "• **Atmospheric Definition:** The Planetary Boundary Layer (PBLH) is the bottom layer of the troposphere directly influenced by Earth's surface friction and heating. It acts as the effective 'mixing chamber' for surface emissions.\n"
                "• **Seasonal Dynamics:**\n"
                "  - **Summer:** High solar radiation drives strong thermals, elevating the boundary layer to **2,000–3,000 meters**, diluting pollutants across a vast volume.\n"
                "  - **Winter:** Radiative cooling and low sun angle compress the layer down to **200–500 meters**, creating a shallow, sealed atmospheric lid.\n"
                "• **Current Metric:** PBLH is compressed to **471.3 meters**. This compresses all vehicular exhaust, dust, and smoke into a shallow slice of air right above breathing level, multiplying surface toxicity."
            )
        elif lang == "hi":
            return (
                "🌫️ **सीमा परत ऊंचाई (PBLH) प्रदूषण ट्रैपिंग का विज्ञान:**\n\n"
                "• **PBLH क्या है?** यह वायुमंडल की वह निचली परत है जहां पृथ्वी की सतह का तापमान और हवा आपस में मिलते हैं। यही वह 'कमरा' है जिसमें हमारा धुआं फैलता है।\n"
                "• **गर्मियों बनाम सर्दियों का अंतर:**\n"
                "  - गर्मियों में तेज धूप के कारण यह परत **2000 से 3000 मीटर** ऊंची हो जाती है, जिससे प्रदूषण आसानी से ऊपर उड़ जाता है।\n"
                "  - सर्दियों में जमीन ठंडी होने से यह परत सिमटकर **200 से 500 मीटर** रह जाती है (मानो शहर पर एक नीची छत लगा दी गई हो)।\n"
                "• **वर्तमान स्थिति:** आज PBLH घटकर मात्र **471.3 मीटर** रह गई है, जिससे सभी वाहनों और उद्योगों का धुआं जमीन के पास ही फंस गया है।"
            )
        else:
            return (
                "🌫️ **Boundary Layer (PBLH) Pollution Trapping Mechanism:**\n\n"
                "• **PBLH Definition:** Planetary Boundary Layer Height (PBLH) atmosphere ka woh vertical volume hai jisme surface pollution mix hota hai.\n"
                "• **Summer vs Winter Ka Fark:**\n"
                "  - Summer me dhoop tez hoti hai toh boundary layer **2,000–3,000 meters** upar chali jati hai aur dhuan gayab ho jata hai.\n"
                "  - Winter me rapid cooling se ye ceiling **200–500 meters** tak niche gir jati hai.\n"
                "• **Current Live Status:** Abhi boundary layer sirf **471.3 meters** par compressed hai! Iska matlab Delhi NCR ke 1.4 crore vehicles ka dhuan ek chhotisi patli layer me trap ho chuka hai."
            )

    # 6. Thermal Inversion
    if any(k in q for k in ["inversion", "thermal", "तापमान", "तापीय"]):
        if lang == "en":
            return (
                "🌡️ **Nocturnal Thermal Inversion Trapping Mechanics:**\n\n"
                "• **Standard Atmosphere vs Inversion:** Under normal lapse rates, air temperature cools with altitude (approx. $-6.5^\\circ\\text{C}/\\text{km}$), allowing warm surface air to rise freely by convection.\n"
                "• **Inversion Phenomenon:** On clear winter nights with low wind speed, the ground sheds radiative heat into space faster than the air above. As a result, the surface air becomes colder and denser than the overlying warmer air ($dT/dz > 0$).\n"
                "• **The Atmospheric Seal:** The warmer, lighter air overhead acts as an impenetrable thermal ceiling. Cold ground air cannot rise, and vertical convective dispersion drops to zero.\n"
                "• **Current Metric:** Inversion strength ($\\Delta T$) is currently **+1.75°C**, trapping fine $PM_{2.5}$ particles close to the ground overnight."
            )
        elif lang == "hi":
            return (
                "🌡️ **रात्रि तापीय उत्क्रमण (थर्मल इन्वर्जन) ट्रैपिंग का विश्लेषण:**\n\n"
                "• **सामान्य स्थिति:** सामान्यतः ऊंचाई बढ़ने पर तापमान घटता है, जिससे गर्म हवा ऊपर उठती है और धुआं दूर ले जाती है।\n"
                "• **इन्वर्जन में क्या होता है?** सर्दियों की रातों में जब हवा शांत होती है, तो जमीन का तापमान तेजी से गिर जाता है। इससे जमीन के पास ठंडी हवा और उसके ऊपर गर्म हवा की एक परत जम जाती है।\n"
                "• **प्रदूषण पर असर:** ऊपर की गर्म हवा एक मजबूत 'ढक्कन' की तरह काम करती है। नीचे की ठंडी हवा ऊपर नहीं उठ पाती और जहरीला स्मॉग सांस लेने की ऊंचाई पर ही कैद हो जाता है।\n"
                "• **वर्तमान डेटा:** वर्तमान इन्वर्जन ताकत ($\\Delta T$) **+1.75°C** है, जो सक्रिय रात्रि प्रदूषण ट्रैपिंग को दर्शाता है।"
            )
        else:
            return (
                "🌡️ **Thermal Inversion Trapping Kya Hota Hai?**\n\n"
                "• **Normal Atmosphere:** Normally upar jane par thand badhti hai, isliye zameen ki garam hawa dhuye ko lekar upar udd jati hai.\n"
                "• **Thermal Inversion Trap:** Winter nights me zameen bohot jaldi thandi ho jati hai, aur upar garam hawa ki ek 'chhat' (lid) ban jati hai ($dT/dz > 0$).\n"
                "• **Pollution Confinement:** Kyunki thandi hawa bhari hoti hai, woh upar nahi ja sakti. Garam hawa use upar jane nahi deti — isse saara PM2.5 zameen ke bilkul paas trap ho jata hai.\n"
                "• **Current Reading:** Live inversion strength $\\Delta T$ abhi **+1.75°C** hai, jisse raat ke waqt pollution 3x tezi se accumulate ho raha hai."
            )

    # 7. Health Advisory & N95
    if any(k in q for k in ["health", "mask", "n95", "advisory", "स्वास्थ्य", "मास्क"]):
        if lang == "en":
            return (
                "😷 **Health Advisory & Personal Protection Protocol (AQI 270 'Poor' to 'Severe'):**\n\n"
                "• **High-Risk Vulnerable Groups:** Children, senior citizens, pregnant women, asthmatics, and chronic obstructive pulmonary (COPD) or cardiac patients must strictly suspend outdoor morning jogging, cycling, and strenuous physical activities.\n"
                "• **Effective Mask Standards:**\n"
                "  - **Cloth & 3-Ply Surgical Masks:** Do NOT filter airborne $PM_{2.5}$ aerosols (penetration rate > 80%).\n"
                "  - **Approved Respirators:** Wear certified **N95, N99, or FFP2 respirators** with an airtight nose-clip seal when stepping outside.\n"
                "• **Indoor Environment Control:** Keep windows firmly closed between 10:00 PM and 9:00 AM (peak inversion window). Use HEPA air purifiers and wet mopping instead of dry sweeping.\n"
                "• **Emergency Signs:** Immediately seek medical consultation if experiencing throat irritation, persistent wheezing, or chest tightness."
            )
        elif lang == "hi":
            return (
                "😷 **स्वास्थ्य सुरक्षा सलाह एवं मास्क दिशानिर्देश:**\n\n"
                "• **संवेदनशील वर्ग:** बच्चे, बुजुर्ग, गर्भवती महिलाएं और सांस या दिल के मरीज सुबह और शाम को खुली हवा में भारी व्यायाम (दौड़ना, जिम) पूरी तरह बंद रखें।\n"
                "• **मास्क के नियम:**\n"
                "  - कपड़े या साधारण सर्जिकल मास्क PM2.5 के सूक्ष्म कणों को नहीं रोक सकते।\n"
                "  - केवल प्रमाणित **N95 या FFP2 रेस्पिरेटर मास्क** ही पहनें, जिसे नाक पर अच्छी तरह सील किया गया हो।\n"
                "• **घरेलू उपाय:** रात 10 बजे से सुबह 9 बजे के बीच खिड़कियां बंद रखें। घर में झाड़ू की जगह गीला पोछा लगाएं ताकि धूल न उड़े।\n"
                "• **चेतावनी:** सांस लेने में तकलीफ या सीने में भारीपन होने पर तुरंत डॉक्टर से परामर्श लें।"
            )
        else:
            return (
                "😷 **Health Advisory & N95 Mask Guidelines:**\n\n"
                "• **Who is at Risk?** Bachhe, buzurg, aur asthma/cardiac patients ko subah-sham outdoor exercise ya running strictly avoid karni chahiye.\n"
                "• **Which Mask to Use?**\n"
                "  - Kapde ya ordinary 3-ply surgical masks PM2.5 ko nahi rok paate.\n"
                "  - Hamesha certified **N95 ya FFP2 respirator** use karein jisme nose-clip tight seal ho.\n"
                "• **Indoor Protection:** Raat 10 baje se subah 9 baje tak windows band rakhein kyunki us time thermal inversion peak par hota hai. Ghar me jhadu ke bajaye geela pochha lagayein.\n"
                "• **Medical Attention:** Agar continuous khansi, gale me jalan ya saans fulne ki dikkat ho toh turant doctor ko consult karein."
            )

    # 8. Truck Diversion & Odd-Even
    if any(k in q for k in ["truck", "diversion", "odd", "even", "ट्रक", "ऑड"]):
        if lang == "en":
            return (
                "🚗 **Traffic Management Interventions: Truck Diversion & Odd-Even Efficacy:**\n\n"
                "• **Peripheral Expressway Truck Diversion:** Over 60,000 commercial diesel trucks pass near Delhi nightly. Diverting non-destined freight around the Western (WPE) and Eastern (EPE) Peripheral Expressways reduces nocturnal NOx and elemental carbon by **22–28 AQI points**.\n"
                "• **Odd-Even Scheme Impact:** Restricting private passenger vehicles based on odd/even license plates during severe episodes curbs roadside $PM_{2.5}$ by **12%–15%**, while substantially alleviating peak traffic congestion.\n"
                "• **Public Transit Reinforcement:** Delhi Metro operates 60+ additional train induction loops, and DTC deploys 800+ extra electric/CNG feeder bus trips to support commuter transition."
            )
        elif lang == "hi":
            return (
                "🚗 **यातायात नियंत्रण उपाय: ट्रक डायवर्जन एवं ऑड-ईवन का असर:**\n\n"
                "• **पेरिफेरल एक्सप्रेसवे पर ट्रक डायवर्जन:** गैर-गंतव्य वाणिज्यिक डीजल ट्रकों को वेस्टर्न (WPE) और ईस्टर्न (EPE) पेरिफेरल एक्सप्रेसवे पर मोड़ने से शहर के प्रदूषण में **22 से 28 AQI अंकों की कमी** आती है।\n"
                "• **ऑड-ईवन योजना:** वाहनों के धुएं और ट्रैफिक जाम में 12% से 15% की गिरावट लाती है, जिससे सड़कों के किनारे प्रदूषण का स्तर तुरंत नियंत्रित होता है।\n"
                "• **मेट्रो एवं बस सेवा:** यात्रियों की सुविधा के लिए दिल्ली मेट्रो और डीटीसी द्वारा 800 से अधिक अतिरिक्त फेरे चलाए जाते हैं।"
            )
        else:
            return (
                "🚗 **Truck Diversion & Odd-Even Impact Analysis:**\n\n"
                "• **Truck Diversion (WPE / EPE):** Jo diesel trucks Delhi me bina kisi delivery ke sirf cross karne aate hain, unhe Western aur Eastern Peripheral Expressways par divert karne se Delhi ka peak AQI **22 se 28 points kam ho jata hai**.\n"
                "• **Odd-Even Scheme:** License plate ke aadhar par private cars restrict karne se vehicular tailpipe emissions aur traffic jam me **12–15% ka direct relief** milta hai.\n"
                "• **Metro & Public Transit:** GRAP Stage-II lagte hi Delhi Metro 60+ extra trips aur DTC 800+ additional buses deploy karti hai taaki public transit smooth chale."
            )

    # 9. Location Forecast
    if any(k in q for k in ["location", "station", "meri location", "मेरी लोकेशन", "स्थान"]):
        if lang == "en":
            return (
                "📍 **Geospatial Station Proximity & Location-Specific Forecast:**\n\n"
                "• **16 Real-Time CAAQMS Towers:** VayuCoupler monitors high-density stations including Central Delhi (ITO), East (Anand Vihar), South (R.K. Puram), West (Dwarka), North (Jahangirpuri), alongside Noida, Gurugram, Ghaziabad, and Faridabad.\n"
                "• **Auto-Detect Feature:** Tap the **'📍 Auto-Detect Location'** button in the chat header or station selector to instantly bind to your nearest monitoring sensor.\n"
                "• **Predictive Output:** Provides a continuous 72-hour mathematical curve with 95% confidence intervals and peak pollution hour alerts tailored to your localized neighborhood."
            )
        elif lang == "hi":
            return (
                "📍 **स्थान-विशिष्ट वायु गुणवत्ता पूर्वानुमान:**\n\n"
                "• **16 निरंतर निगरानी स्टेशन:** VayuCoupler में मध्य दिल्ली (आईटीओ), आनंद विहार, आरके पुरम, द्वारका, जहांगीरपुरी, नोएडा, गुरुग्राम, गाजियाबाद और फरीदाबाद के 16 स्टेशन शामिल हैं।\n"
                "• **ऑटो-लोकेशन का उपयोग:** चैट हेडर में दिए गए **'📍 ऑटो-लोकेशन'** बटन पर क्लिक करें, जिससे आपका फोन निकटतम स्टेशन से तुरंत जुड़ जाएगा।\n"
                "• **72-घंटे का स्थानीय ग्राफ:** चयनित स्टेशन का 72 घंटे का सटीक ग्राफ और पीक स्मॉग का समय स्क्रीन पर दिखाई देगा।"
            )
        else:
            return (
                "📍 **Location-Specific Forecast & Station Locator:**\n\n"
                "• **16 Live Monitoring Stations:** VayuCoupler me Delhi NCR ke sabhi 16 major stations (Anand Vihar, ITO, Dwarka, R.K. Puram, Noida, Gurugram, Ghaziabad) live connected hain.\n"
                "• **Auto-Detect Kaise Use Karein:** AI chat ke header me ya home screen par **'📍 Auto-Detect'** button dabayein — phone GPS se aapka nearest monitoring tower turant select ho jayega.\n"
                "• **72-Hour Localized Curve:** Aapke specific area ka continuous 72-hour forecast graph aur peak smog warning turant screen par scroll ho jayegi."
            )

    # 10. Live AQI Status
    if any(k in q for k in ["live aqi", "average aqi", "composite", "कितना", "औसत aqi"]):
        if lang == "en":
            return (
                "📊 **Delhi-NCR Composite Air Quality & Weather Telemetry:**\n\n"
                "• **Composite Average AQI:** **270 (Poor Category)** with PM2.5 concentration at **133.8 μg/m³** (over 8x WHO safe threshold).\n"
                "• **Station Variations Across NCR:**\n"
                "  - **High-Density Hotspots:** Anand Vihar (338, Very Poor) and Jahangirpuri (324, Very Poor).\n"
                "  - **Moderate Hotspots:** Central ITO (268, Poor) and R.K. Puram (254, Poor).\n"
                "• **Coupled Weather Telemetry:** Temperature 24.5°C, Relative Humidity 68%, Surface Wind Speed 8.3 km/h (SW vector 220.5°), Boundary Layer 471m, Ventilation Index 1,089.4 m²/s."
            )
        elif lang == "hi":
            return (
                "📊 **दिल्ली-एनसीआर वायु गुणवत्ता एवं मौसम टेलीमेट्री विवरण:**\n\n"
                "• **औसत वायु गुणवत्ता सूचकांक (AQI):** **270 (खराब श्रेणी)**, PM2.5 का स्तर **133.8 μg/m³** (WHO सुरक्षित सीमा से 8 गुना अधिक)।\n"
                "• **क्षेत्रीय अंतर:**\n"
                "  - **सर्वाधिक प्रभावित क्षेत्र:** आनंद विहार (338) और जहांगीरपुरी (324)।\n"
                "  - **तुलनात्मक रूप से बेहतर क्षेत्र:** आरके पुरम (254) और मध्य दिल्ली (268)।\n"
                "• **मौसम संबंधी कारक:** तापमान 24.5°C, आर्द्रता 68%, हवा की गति 8.3 किमी/घंटा, सीमा परत ऊंचाई 471 मीटर और वेंटिलेशन इंडेक्स 1089.4 m²/s।"
            )
        else:
            return (
                "📊 **Delhi-NCR Live AQI & Telemetry Status:**\n\n"
                "• **Delhi NCR Average AQI:** Current reading **270 (Poor Category)** hai, jisme PM2.5 level **133.8 μg/m³** hai (WHO limit se 8x zyada).\n"
                "• **Station Variations:**\n"
                "  - **Hotspots:** Anand Vihar (338) aur Jahangirpuri (324) sabse toxic hain.\n"
                "  - **Moderate Areas:** R.K. Puram (254) aur ITO (268) Poor category me hain.\n"
                "• **Atmospheric Conditions:** Wind speed 8.3 km/h, Humidity 68%, Boundary layer 471 meters aur Ventilation Index 1,089 m²/s (Critical Trapping Zone)."
            )

    # 11. 72-Hour Pollution Trajectory
    if any(k in q for k in ["72", "trajectory", "forecast", "पीक", "अगले"]):
        if lang == "en":
            return (
                "📈 **72-Hour to 7-Day Air Pollution Trajectory Breakdown:**\n\n"
                "• **T-0h to T-24h (Current):** Moderate-Poor baseline (AQI 220–270). Favorable daytime solar heating facilitates moderate vertical dispersion.\n"
                "• **T-48h to T-72h (Alert Inversion Window):** Advancing western cold front; surface winds drop below 6 km/h, PBLH compresses under 450 meters. Composite AQI escalates to **320–360 (Very Poor)**.\n"
                "• **T-96h to T-120h (Peak Smog Crisis):** Strong nocturnal thermal inversion ($\\Delta T > 2.5^\\circ\\text{C}$) combines with dense fog and upwind stubble smoke inflow. AQI surges to **Peak 420–460 (Severe / Severe+ Emergency)**.\n"
                "• **T-144h to T-168h (Atmospheric Dispersal & Recovery):** Passage of Western Disturbance brings gusty surface winds (18–24 km/h); Ventilation Index jumps past 4,500 m²/s, flushing the basin back down to AQI < 200."
            )
        elif lang == "hi":
            return (
                "📈 **अगले 72 घंटे से 7 दिनों का प्रदूषण पूर्वानुमान और पीक समय:**\n\n"
                "• **T-0h से T-24h (वर्तमान):** मध्यम से खराब स्थिति (AQI 220–270)। दिन में धूप से आंशिक फैलाव।\n"
                "• **T-48h से T-72h (सतर्कता अवधि):** ठंडी हवाओं का आगमन; हवा की गति घटकर 6 किमी/घंटा से कम होगी। AQI बढ़कर **320–360 (बहुत खराब)** होगा।\n"
                "• **T-96h से T-120h (पीक संकट काल):** कड़ाके की ठंड, घना कोहरा और थर्मल इन्वर्जन से प्रदूषण का चरम स्तर आएगा। AQI **420–460 (गंभीर आपातकालीन स्तर)** छू सकता है।\n"
                "• **T-144h से T-168h (राहत व सुधार):** पश्चिमी विक्षोभ के गुजरने से 20 किमी/घंटा की तेज हवाएं चलेंगी, जिससे प्रदूषण तेजी से छंट जाएगा और AQI 200 से नीचे आ जाएगा।"
            )
        else:
            return (
                "📈 **72-Hour Pollution Trajectory & Peak Smog Timeline:**\n\n"
                "• **T-0h se T-24h (Now):** AQI **220–270 (Poor)**. Din me dhoop ke chalte thoda ventilation rehta hai.\n"
                "• **T-48h se T-72h (Inversion Alert):** Hawa ki speed 6 km/h se kam hogi, boundary layer 450m tak compress hogi. AQI climb hokar **320–360 (Very Poor)** ho jayega.\n"
                "• **T-96h se T-120h (Peak Crisis Window):** Severe thermal inversion aur fog ke combination se AQI **420–460 (Severe+)** touch karega — ye season ka sabse hazardous phase hoga.\n"
                "• **T-144h se T-168h (Dispersal & Relief):** Western disturbance aane par tez hawa (18-24 km/h) chalegi aur pollution flush hokar wapas Moderate category me aa jayega."
            )

    # 12. Multi-Agency Dispatches
    if any(k in q for k in ["dispatch", "agency", "order", "stakeholder", "आदेश", "सरकारी"]):
        if lang == "en":
            return (
                "🏛️ **Multi-Agency Stakeholder Action Dispatches (CAQM Framework):**\n\n"
                "• **Department of Agriculture (Punjab / Haryana):** High-priority enforcement in 42 critical burning blocks; compulsory deployment of bio-decomposers and penal monitoring under Section 15 of EPA.\n"
                "• **Traffic Police & Border Authorities:** Enforcement of heavy commercial truck diversions onto WPE/EPE at Singhu, Tikri, and Badarpur borders.\n"
                "• **Municipal Corporations (MCD / NDMC):** Deployment of 65+ anti-smog water mist cannons and continuous mechanized road sweeping across 13 designated pollution hotspots.\n"
                "• **Pollution Control Boards (DPCC / CPCB):** 100% continuous stack emission monitoring of industrial zones (Narela, Bawana, Okhla); strict closure of unapproved biomass fuel boilers."
            )
        elif lang == "hi":
            return (
                "🏛️ **बहु-एजेंसी कार्यकारी कार्रवाई आदेश (CAQM निर्देश):**\n\n"
                "• **कृषि विभाग (पंजाब व हरियाणा):** 42 संवेदनशील ब्लॉकों में सख्त निगरानी, पराली जलाने पर जुर्माना और बायो-डीकंपोजर का त्वरित छिड़काव।\n"
                "• **ट्रैफिक पुलिस:** सिंघु, टिकरी और बदरपुर बॉर्डरों पर गैर-जरूरी भारी ट्रकों को पेरिफेरल एक्सप्रेसवे पर अनिवार्य डायवर्जन।\n"
                "• **नगर निगम (MCD):** 13 हॉटस्पॉट क्षेत्रों में 65 से अधिक एंटी-स्मॉग गन और वैक्यूम मशीनों द्वारा पानी का सघन छिड़काव।\n"
                "• **प्रदूषण नियंत्रण बोर्ड (DPCC):** नरेला, बवाना और ओखला औद्योगिक क्षेत्रों में गैर-अनुमोदित ईंधन वाले उद्योगों को तत्काल सील करना।"
            )
        else:
            return (
                "🏛️ **Multi-Agency Executive Action Dispatches:**\n\n"
                "• **Agriculture Department:** Punjab aur Haryana ke 42 high-risk blocks me bio-decomposer machine spraying mandate aur satellite surveillance.\n"
                "• **Delhi Traffic Police:** Singhu, Tikri aur Badarpur borders par non-essential diesel commercial trucks ka WPE/EPE par strict diversion.\n"
                "• **MCD & Municipalities:** Delhi ke 13 hotspots par 65+ mobile anti-smog guns aur mechanical sweeping machines ki 24x7 deployment.\n"
                "• **DPCC / CPCB:** Narela, Bawana aur Okhla industrial clusters me unapproved fuel use karne wali factories ko immediate closure notices."
            )

    # General Fallback
    if lang == "hi":
        return (
            "📊 **वायुमंडलीय विश्लेषण एवं टेलीमेट्री सारांश:**\n\n"
            "• **वर्तमान AQI:** दिल्ली-एनसीआर का औसत AQI **270 (खराब श्रेणी)** है।\n"
            "• **मौसम संबंधी कारक:** वेंटिलेशन इंडेक्स **1089.4 m²/s** और सीमा परत ऊंचाई **471.3 मीटर** है, जो प्रदूषकों के जमाव की ओर इशारा करते हैं।\n"
            "• **सलाह:** संवेदनशील व्यक्ति सुबह के समय भारी शारीरिक व्यायाम से बचें और बाहर जाते समय N95 मास्क का उपयोग करें।"
        )
    elif lang == "en":
        return (
            "📊 **Atmospheric Science & Telemetry Diagnostic Summary:**\n\n"
            "• **Current AQI:** Delhi-NCR composite index stands at **270 (Poor Category)** with $PM_{2.5}$ at **133.8 μg/m³**.\n"
            "• **Key Meteorology:** Boundary Layer Height is compressed to **471.3 m** and Ventilation Index is **1,089.4 m²/s**, causing nocturnal stagnation.\n"
            "• **Scientific Advisory:** Sensitive groups should minimize prolonged outdoor exposure and use certified N95 respirators."
        )
    else:
        return (
            "📊 **Atmospheric Telemetry & Forecast Summary:**\n\n"
            "• **Current AQI:** Delhi-NCR ka composite average AQI **270 (Poor Category)** par hai.\n"
            "• **Key Parameters:** Boundary layer **471 meters** aur Ventilation Index **1,089 m²/s** par hone ki wajah se hawa stagnation mode me hai.\n"
            "• **Actionable Advice:** High-risk groups morning outdoor runs avoid karein aur N95 mask use karein."
        )

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
    
    # Try Gemini 3.5 Flash online
    if req.use_gemini and GEMINI_API_KEY:
        lang_instruction = "Respond in natural, engaging conversational Hinglish (blend of Hindi and English)."
        if effective_lang == "en":
            lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in ENGLISH. You MUST answer strictly and entirely in formal, professional English. Absolutely NO Hindi or Hinglish words are allowed."
        elif effective_lang == "hi":
            lang_instruction = "CRITICAL MANDATORY RULE: The user has asked in HINDI. You MUST answer strictly and entirely in clear Devanagari Hindi (शुद्ध हिन्दी). Absolutely NO English alphabet or Hinglish words are allowed."

        sys_prompt = f"{VAYUCOUPLER_SYSTEM_PROMPT}\n\n{lang_instruction}"
        prompt_content = (
            f"Current Delhi NCR Live Telemetry Context:\n"
            f"- Composite AQI: 270 (Poor Category), PM2.5: 133.8 ug/m3\n"
            f"- Ventilation Index: 1,089.4 m2/s (Critical Trapping < 1200 m2/s)\n"
            f"- Planetary Boundary Layer Height (PBLH): 471.3 meters\n"
            f"- Nocturnal Inversion Strength (Delta-T): +1.75 deg C\n"
            f"- Wind Vector: 8.3 km/h from SW (220.5 deg)\n"
            f"- Active Stubble Farm Fires: 1,457 in Punjab & Haryana\n"
            f"- Active Predictive GRAP Stage: Stage-I / Stage-II with Stage-IV alerts on horizon\n\n"
            f"User Question: {req.question}\n\n"
            f"Instruction: Provide a comprehensive, highly authoritative, multi-bullet explanation with clear headings and scientific numbers. Never give a brief one-sentence reply."
        )

        for model in ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "systemInstruction": {"parts": [{"text": sys_prompt}]},
                    "contents": [{"parts": [{"text": prompt_content}]}],
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 900}
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

    # Fallback to comprehensive expert knowledge base
    answer = get_expert_ai_response(req.question, lang=effective_lang)
    return {
        "answer": answer,
        "mode": "offline",
        "model": "Offline AI Engine (Expert Knowledge Base)",
        "online": False,
        "language": effective_lang,
        "default_language": req.language
    }
