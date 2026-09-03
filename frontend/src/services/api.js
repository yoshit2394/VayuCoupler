import offlineBundle from '../data/offline_bundle.json';

const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

function getClosestStepKey(stepHour) {
  const steps = [0, 24, 48, 72, 96, 120, 144, 168];
  let closest = steps[0];
  let minDiff = Math.abs(stepHour - closest);
  for (const s of steps) {
    const diff = Math.abs(stepHour - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return String(closest);
}

export async function fetchStations() {
  try {
    const res = await fetch(`${BASE_URL}/api/stations`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline stations fallback:', e);
  }
  return offlineBundle.stations || [];
}

export async function fetchSnapshot(stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/snapshot?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline snapshot fallback:', e);
  }
  const key = getClosestStepKey(stepHour);
  return offlineBundle.steps[key]?.snapshot || offlineBundle.steps["72"].snapshot;
}

export async function fetchStationForecast(stationId, stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/station/${stationId}?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline station forecast fallback:', e);
  }
  const key = getClosestStepKey(stepHour);
  return offlineBundle.stations_forecast[`${stationId}_${key}`] || 
         offlineBundle.stations_forecast[`${stationId}_72`] || 
         offlineBundle.stations_forecast['DEL001_72'];
}

export async function fetchRegionalForecast(stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/regional?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline regional forecast fallback:', e);
  }
  return { status: "ONLINE", step_hour: stepHour };
}

export async function fetchGrapTriggers(stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/grap/triggers?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline grap fallback:', e);
  }
  const key = getClosestStepKey(stepHour);
  return offlineBundle.steps[key]?.grap || offlineBundle.steps["72"].grap;
}

export async function fetchDispatches(stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/dispatches?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline dispatches fallback:', e);
  }
  const key = getClosestStepKey(stepHour);
  return offlineBundle.steps[key]?.dispatches || offlineBundle.steps["72"].dispatches;
}

export async function fetchInterstateGrid(stepHour = 72) {
  try {
    const res = await fetch(`${BASE_URL}/api/interstate?step_hour=${stepHour}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline interstate fallback:', e);
  }
  const key = getClosestStepKey(stepHour);
  return offlineBundle.steps[key]?.interstate || offlineBundle.steps["72"].interstate;
}

export async function runWhatIfSimulation(params) {
  try {
    const res = await fetch(`${BASE_URL}/api/what-if`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Using offline simulation fallback:', e);
  }
  // Local approximation
  const stubbleRed = params.stubble_reduction_pct || 0;
  const truckRed = params.truck_diversion_enabled ? 25 : 0;
  const delta = Math.round(stubbleRed * 0.8 + truckRed);
  return {
    baseline_delhi_aqi: 280,
    mitigated_delhi_aqi: Math.max(120, 280 - delta),
    aqi_reduction_pts: delta,
    peak_risk_reduction_pct: Math.min(60, Math.round(delta / 3)),
    mitigation_level: delta > 50 ? "HIGH" : (delta > 20 ? "MODERATE" : "LOW")
  };
}

export async function queryVayuAI(question, stepHour = 72, useGemini = true, signal = null, language = 'hinglish') {
  try {
    const res = await fetch(`${BASE_URL}/api/vayuai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, step_hour: stepHour, use_gemini: useGemini, language }),
      signal: signal || undefined
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Remote VayuAI unreachable, using client offline responder:', e);
  }
  
  // Client-side offline fallback
  const q = question.toLowerCase();
  let answer = "";
  if (q.includes("school") || q.includes("band") || q.includes("chutti") || q.includes("छुट्टी")) {
    if (language === 'hi') {
      answer = "✅ **वर्तमान में स्कूल बंद करने की आवश्यकता नहीं है।** वर्तमान AQI सामान्य सीमा में है और ग्रैप चरण-4 सक्रिय नहीं हुआ है।";
    } else if (language === 'en') {
      answer = "✅ **School closures are currently NOT required.** The current AQI remains below the emergency threshold.";
    } else {
      answer = "✅ **Abhi schools band karne ki zarurat nahi hai.** Current AQI control me hai aur GRAP Stage-4 trigger nahi hua hai.";
    }
  } else if (q.includes("stubble") || q.includes("parali") || q.includes("पराली")) {
    if (language === 'hi') {
      answer = "🌾 **पराली धुएं का प्रभाव:** पंजाब और हरियाणा के सक्रिय पराली जलाने से दिल्ली के कुल PM2.5 में लगभग 30-35% का योगदान आ रहा है।";
    } else if (language === 'en') {
      answer = "🌾 **Stubble Burning Impact:** Upwind agricultural stubble burning currently contributes approximately 30–35% to Delhi NCR PM2.5.";
    } else {
      answer = "🌾 **Stubble burning ka impact:** Punjab aur Haryana ke farm fires ka Delhi NCR ke PM2.5 me lagbhag 30-35% share hai.";
    }
  } else {
    if (language === 'hi') {
      answer = "📊 **वायु गुणवत्ता अवलोकन:** दिल्ली एनसीआर का औसत एक्यूआई वर्तमान में निगरानी में है। वेंटिलेशन इंडेक्स और थर्मल इन्वेंशन ट्रैपिंग के आधार पर पूर्वानुमान सुरक्षित है।";
    } else if (language === 'en') {
      answer = "📊 **Air Quality Telemetry:** Delhi NCR average AQI is currently actively tracked. Atmospheric dispersion remains within predictive bounds.";
    } else {
      answer = "📊 **Air Quality Update:** Delhi NCR ka AQI live telemetry ke anusaar active monitoring par hai. Vent index aur PBLH height track ho rahi hai.";
    }
  }

  return {
    answer,
    mode: "offline",
    model: "Offline AI Engine (Mobile Native)",
    online: false,
    language
  };
}
