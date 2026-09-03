/**
 * Internationalization (i18n) Engine for VayuCoupler
 * Supports: 
 * 1. en: Pure English
 * 2. hi: Pure Devanagari Hindi (शुद्ध हिन्दी)
 * 3. hinglish: Conversational Hinglish blend
 */

export const TRANSLATIONS = {
  en: {
    // Header & Brand
    app_subtitle: "Delhi NCR Coupled Forecasting System",
    app_title: "Air Pollution–Weather Coupled Early Warning System",
    grap_badge: "PREDICTIVE GRAP ACTIVE",
    settings_btn: "Settings",

    // Navigation Tabs
    tab_overview: "Command Center",
    tab_grap: "Predictive GRAP",
    tab_dispatches: "Dispatches",
    tab_whatif: "What-If Sim",
    tab_interstate: "Inter-State Grid",

    // Time Scrubber
    t_hour: "T-Hour",
    scrubber_day: "Day",
    scrubber_d1: "Day 1 (Normal)",
    scrubber_d3: "Day 3 (Alert)",
    scrubber_d5: "Day 5 (Peak Smog)",
    scrubber_d7: "Day 7 (Clean Air)",
    scrubber_btn_d1: "🟢 Day 1",
    scrubber_btn_d3: "⚡ Day 3 Alert",
    scrubber_btn_d5: "🚨 Day 5 Peak",
    scrubber_btn_d7: "🍃 Day 7 Relief",
    scrubber_badge_normal: "🟢 Normal",
    scrubber_badge_alert: "⚡ Alert",
    scrubber_badge_peak: "🚨 Peak Smog",
    scrubber_badge_relief: "🍃 Relief",

    // Telemetry Cards
    avg_aqi: "DELHI NCR AVG AQI",
    local_aqi: "LOCAL AQI",
    ncr_avg_short: "NCR Avg",
    ventilation_idx: "VENTILATION INDEX",
    inversion_delta: "INVERSION STRENGTH (ΔT)",
    pblh_height: "BOUNDARY LAYER (PBLH)",
    active_fires: "ACTIVE STUBBLE FIRES",
    stubble_share: "STUBBLE PM2.5 SHARE",
    worst_station: "MAX POLLUTED STATION",
    wind_vector: "WIND VECTOR",
    stubble_share_label: "Stubble Share",
    severe_trapping: "Severe Trapping",
    normal_dispersion: "Normal Dispersion",
    nocturnal_trapping: "Nocturnal Trapping",

    // Section Titles
    monitoring_grid: "Delhi NCR Monitoring Network",
    spatial_grid_title: "Delhi NCR Spatial Grid & Stubble Corridor",
    realtime_stations: "16 Real-time Monitoring Stations",
    source_apportionment: "Source Apportionment",
    source_stubble: "Stubble Burning",
    source_vehicles: "Vehicular Exhaust",
    source_dust: "Road & Construction Dust",
    source_industry: "Industrial Clusters",
    source_domestic: "Secondary & Domestic",

    station_forecast_title: "Coupled 72h Station Forecast & Met Parameters",
    select_station_prompt: "Click any station marker or zone below to inspect 72-hour trajectory",
    zoom_controls: "Map Zoom",
    reset_view: "Reset View",

    // Station Forecast Card
    fc_curve_title: "Coupled 72h Continuous Forecast Curve (WRF-Chem)",
    fc_mean_aqi: "Mean AQI",
    fc_ci_band: "90% CI Band",
    fc_severe_thresh: "Severe (400+)",
    fc_lead_label: "Lead",
    fc_decomp_title: "Physics Coupling Decomposition (+24h Lead Drivers)",
    fc_xai_badge: "Explainable AI Attribution",
    fc_stubble_smoke: "Farm Stubble Smoke",
    fc_stubble_desc: "NW Corridor transport at breathing level",
    fc_inversion_trap: "Inversion Trapping",
    fc_inversion_desc: "Thermal lid & compressed boundary layer",
    fc_urban_base: "Local Urban Baseline",
    fc_urban_desc: "Vehicles, dust & regional background",
    fc_grap_alert: "GRAP Stage IV Pre-emptive Alert Triggered (+24h to +72h Lead)",
    fc_emergency: "EMERGENCY",
    fc_now: "Now",
    fc_peak: "Peak",
    fc_cpcb_telemetry: "CPCB Continuous Ambient Telemetry",
    fc_grap_mandate: "Atmospheric ventilation index collapsing below 1200 m²/s. Mandatory school hybrid mode, diesel truck peripheral diversion, and continuous mist sweeps active.",

    // What-If Simulation
    whatif_title: "Counterfactual Policy Simulation Engine",
    whatif_subtitle: "Simulate pre-emptive interventions before smog peaks arrive",
    slider_stubble: "Stubble Fire Mitigation (Punjab/Haryana)",
    slider_truck: "Heavy Commercial Truck Peripheral Diversion",
    slider_dust: "Mechanized Road Sweeping & Mist Dust Mitigation",
    slider_industry: "PNG/Clean Fuel Industrial Switching",
    simulated_peak_aqi: "Simulated Peak AQI",
    baseline_peak_aqi: "Baseline Peak AQI",
    points_saved: "AQI Points Saved",
    policy_effectiveness: "Policy Effectiveness",

    // Dispatches
    dispatches_title: "Automated Multi-Agency Stakeholder Dispatches",
    dispatches_subtitle: "Automated executive orders triggered 72h before crisis threshold",
    urgency_level: "Urgency Level",
    target_agency: "Target Agency",
    action_mandate: "Action Mandate",
    dispatch_payload: "Telemetry Payload",

    // Inter-State Grid
    interstate_title: "Inter-State Smog Transport & Coordination Matrix",
    interstate_subtitle: "Synchronized cross-border emission control between Delhi, Punjab, Haryana, UP, and Rajasthan",
    state_col: "State / Jurisdiction",
    role_col: "Coupled Basin Role",
    status_col: "Current Telemetry Status",
    actions_col: "Enforced Inter-State Mandates",
    urgency_col: "Urgency",

    // Settings Modal
    settings_title: "System Preferences",
    theme_section: "Appearance Theme",
    theme_dark: "Dark Mode (MoES Atmospheric)",
    theme_light: "Light Mode (High-Contrast White)",
    lang_section: "System Language",
    lang_en: "English (Formal English)",
    lang_hi: "हिन्दी (Pure Devanagari Hindi)",
    lang_hinglish: "Hinglish (Conversational Blend)",
    save_close: "Save & Close",

    // VayuAI Copilot
    ai_copilot: "VayuAI Copilot",
    ai_placeholder: "Ask weather, AQI forecast, or policy...",
    ai_welcome: "Hello! I am **VayuAI Copilot**. Ask any question regarding Delhi NCR air quality forecast, meteorological physics, GRAP enforcement, or farm fires!",
    ai_location_btn: "Detect Location",
    ai_offline_badge: "Offline AI",
    ai_online_badge: "Gemini 3.5 Flash",
    ai_offline_warning: "⚠️ **No Internet Connection (Offline Mode)**\n\nFor open-ended questions, please turn on your Internet (Gemini AI will activate). In offline mode, choose from the topics below:",
    ai_offline_tap_prompt: "⚡ Tap any topic below for offline answers:"
  },

  hi: {
    // Header & Brand
    app_subtitle: "दिल्ली एनसीआर युग्मित पूर्वानुमान प्रणाली",
    app_title: "वायु प्रदूषण-मौसम युग्मित पूर्व चेतावनी प्रणाली",
    grap_badge: "पूर्वानुमानित ग्रैप सक्रिय",
    settings_btn: "सेटिंग्स",

    // Navigation Tabs
    tab_overview: "कमांड सेंटर",
    tab_grap: "पूर्वानुमानित ग्रैप",
    tab_dispatches: "एक्शन ऑर्डर्स",
    tab_whatif: "नीति सिमुलेशन",
    tab_interstate: "अंतर-राज्य ग्रिड",

    // Time Scrubber
    t_hour: "टी-घंटा",
    scrubber_day: "दिन",
    scrubber_d1: "दिन 1 (सामान्य)",
    scrubber_d3: "दिन 3 (अलर्ट)",
    scrubber_d5: "दिन 5 (पीक प्रदूषण)",
    scrubber_d7: "दिन 7 (साफ़ हवा)",
    scrubber_btn_d1: "🟢 दिन 1",
    scrubber_btn_d3: "⚡ दिन 3 अलर्ट",
    scrubber_btn_d5: "🚨 दिन 5 पीक",
    scrubber_btn_d7: "🍃 दिन 7 राहत",
    scrubber_badge_normal: "🟢 सामान्य",
    scrubber_badge_alert: "⚡ अलर्ट",
    scrubber_badge_peak: "🚨 पीक प्रदूषण",
    scrubber_badge_relief: "🍃 राहत",

    // Telemetry Cards
    avg_aqi: "दिल्ली एनसीआर औसत AQI",
    local_aqi: "स्थानीय AQI",
    ncr_avg_short: "एनसीआर औसत",
    ventilation_idx: "वेंटिलेशन इंडेक्स (VI)",
    inversion_delta: "थर्मल इन्वर्जन शक्ति (ΔT)",
    pblh_height: "सीमा परत ऊंचाई (PBLH)",
    active_fires: "सक्रिय पराली आग (नासा)",
    stubble_share: "पराली PM2.5 हिस्सेदारी",
    worst_station: "सर्वाधिक प्रदूषित स्टेशन",
    wind_vector: "हवा की गति व दिशा",
    stubble_share_label: "पराली का हिस्सा",
    severe_trapping: "गंभीर प्रदूषण ट्रैपिंग",
    normal_dispersion: "सामान्य फैलाव",
    nocturnal_trapping: "रात्रिकालीन इन्वर्जन ट्रैपिंग",

    // Section Titles
    monitoring_grid: "दिल्ली एनसीआर निगरानी नेटवर्क",
    spatial_grid_title: "दिल्ली एनसीआर ग्रिड एवं पराली कॉरिडोर",
    realtime_stations: "16 लाइव निगरानी केंद्र",
    source_apportionment: "प्रदूषण स्रोत विभाजन",
    source_stubble: "पराली दहन (Stubble Burning)",
    source_vehicles: "वाहनों का धुआं (Vehicles)",
    source_dust: "सड़क व निर्माण धूल (Dust)",
    source_industry: "औद्योगिक उत्सर्जन (Industry)",
    source_domestic: "घरेलू व अन्य स्रोत (Domestic)",

    station_forecast_title: "युग्मित 72-घंटे स्टेशन पूर्वानुमान एवं मौसम पैरामीटर",
    select_station_prompt: "72-घंटे का पूर्वानुमान देखने के लिए नीचे किसी भी स्टेशन पर क्लिक करें",
    zoom_controls: "मानचित्र ज़ूम",
    reset_view: "रीसेट करें",

    // Station Forecast Card
    fc_curve_title: "युग्मित 72-घंटे निरंतर पूर्वानुमान वक्र (WRF-Chem)",
    fc_mean_aqi: "औसत AQI",
    fc_ci_band: "90% विश्वास दायरा (CI)",
    fc_severe_thresh: "गंभीर आपात (400+)",
    fc_lead_label: "लीड",
    fc_decomp_title: "भौतिकी युग्मन विभाजन (+24 घंटे के मुख्य कारक)",
    fc_xai_badge: "व्याख्यात्मक एआई विश्लेषण",
    fc_stubble_smoke: "खेतों की पराली का धुआं",
    fc_stubble_desc: "उत्तर-पश्चिम कॉरिडोर से श्वसन स्तर पर धुआं",
    fc_inversion_trap: "थर्मल इन्वर्जन ट्रैपिंग",
    fc_inversion_desc: "थर्मल ढक्कन और संकुचित वायुमंडलीय परत",
    fc_urban_base: "स्थानीय शहरी उत्सर्जन",
    fc_urban_desc: "वाहनों का धुआं, सड़क धूल व स्थानीय स्रोत",
    fc_grap_alert: "ग्रैप स्टेज-IV अग्रिम अलर्ट सक्रिय (+24h से +72h पूर्व चेतावनी)",
    fc_emergency: "आपातकाल",
    fc_now: "वर्तमान",
    fc_peak: "चरम (पीक)",
    fc_cpcb_telemetry: "सीपीसीबी निरंतर परिवेशी वायु टेलीमेट्री",
    fc_grap_mandate: "वेंटिलेशन इंडेक्स 1200 m²/s से नीचे गिरा। स्कूलों में हाइब्रिड/ऑनलाइन मोड अनिवार्य, भारी ट्रकों का बाईपास डायवर्जन और एंटी-स्मॉग गन छिड़काव सक्रिय।",

    // What-If Simulation
    whatif_title: "पूर्वानुमानित नीति सिमुलेशन इंजन",
    whatif_subtitle: "स्मॉग संकट आने से 72 घंटे पूर्व सरकारी प्रतिबंधों का प्रभाव देखें",
    slider_stubble: "पराली दहन नियंत्रण (पंजाब/हरियाणा)",
    slider_truck: "भारी वाणिज्यिक ट्रकों का पेरिफेरल डायवर्जन",
    slider_dust: "सड़क स्वीपिंग और एंटी-स्मॉग गन छिड़काव",
    slider_industry: "पीएनजी/स्वच्छ ईंधन औद्योगिक रूपांतरण",
    simulated_peak_aqi: "अनुकरणित पीक AQI",
    baseline_peak_aqi: "मूल पीक AQI",
    points_saved: "AQI में कमी (बचत)",
    policy_effectiveness: "नीति प्रभावशीलता",

    // Dispatches
    dispatches_title: "स्वचालित बहु-एजेंसी एक्शन ऑर्डर्स",
    dispatches_subtitle: "AQI संकट स्तर से 72 घंटे पहले जारी किए गए स्वचालित कार्यकारी आदेश",
    urgency_level: "आपात स्तर",
    target_agency: "संबद्ध एजेंसी",
    action_mandate: "कार्रवाई आदेश",
    dispatch_payload: "डेटा पेलोड",

    // Inter-State Grid
    interstate_title: "अंतर-राज्यीय स्मॉग समन्वय मैट्रिक्स",
    interstate_subtitle: "दिल्ली, पंजाब, हरियाणा, उत्तर प्रदेश और राजस्थान के बीच समन्वित उत्सर्जन नियंत्रण",
    state_col: "राज्य / क्षेत्र",
    role_col: "बेसिन भूमिका",
    status_col: "वर्तमान स्थिति",
    actions_col: "लागू अंतर-राज्यीय आदेश",
    urgency_col: "प्राथमिकता",

    // Settings Modal
    settings_title: "सिस्टम सेटिंग्स",
    theme_section: "रंग रूप (थीम)",
    theme_dark: "डार्क मोड (पर्यावरणीय साइबर थीम)",
    theme_light: "लाइट मोड (उच्च-कंट्रास्ट सरकारी पोर्टल)",
    lang_section: "सिस्टम भाषा",
    lang_en: "English (अंग्रेज़ी)",
    lang_hi: "हिन्दी (शुद्ध देवनागरी)",
    lang_hinglish: "Hinglish (हिंग्लिश)",
    save_close: "सहेजें और बंद करें",

    // VayuAI Copilot
    ai_copilot: "वायु-एआई कोपायलट",
    ai_placeholder: "मौसम, AQI या सरकारी आदेशों के बारे में पूछें...",
    ai_welcome: "नमस्ते! मैं हूँ **वायु-एआई कोपायलट**। दिल्ली एनसीआर के वायु गुणवत्ता पूर्वानुमान, मौसम विज्ञान, ग्रैप नियमों या पराली दहन के बारे में कोई भी प्रश्न पूछें!",
    ai_location_btn: "स्थान पहचानें",
    ai_offline_badge: "ऑफलाइन एआई",
    ai_online_badge: "जेमिनी 3.5 फ्लैश",
    ai_offline_warning: "⚠️ **इंटरनेट कनेक्शन बंद है (ऑफलाइन मोड)**\n\nखुले प्रश्नों के लिए कृपया इंटरनेट चालू करें (जेमिनी सक्रिय होगा)। ऑफलाइन मोड में कृपया नीचे दिए गए विषयों में से चुनें:",
    ai_offline_tap_prompt: "⚡ ऑफलाइन उत्तर के लिए नीचे किसी भी विषय पर टैप करें:"
  },

  hinglish: {
    // Header & Brand
    app_subtitle: "Delhi NCR Coupled Forecasting System",
    app_title: "Air Pollution–Weather Coupled Early Warning System",
    grap_badge: "PREDICTIVE GRAP ACTIVE",
    settings_btn: "Settings ⚙️",

    // Navigation Tabs
    tab_overview: "Command Center",
    tab_grap: "Predictive GRAP",
    tab_dispatches: "Dispatches",
    tab_whatif: "What-If Sim",
    tab_interstate: "Inter-State Grid",

    // Time Scrubber
    t_hour: "T-Hour",
    scrubber_day: "Day",
    scrubber_d1: "Day 1 (Normal)",
    scrubber_d3: "Day 3 (Alert)",
    scrubber_d5: "Day 5 (Peak Smog)",
    scrubber_d7: "Day 7 (Saaf Hawa)",
    scrubber_btn_d1: "🟢 Day 1",
    scrubber_btn_d3: "⚡ Day 3 Alert",
    scrubber_btn_d5: "🚨 Day 5 Peak",
    scrubber_btn_d7: "🍃 Day 7 Relief",
    scrubber_badge_normal: "🟢 Normal",
    scrubber_badge_alert: "⚡ Alert",
    scrubber_badge_peak: "🚨 Peak Smog",
    scrubber_badge_relief: "🍃 Relief",

    // Telemetry Cards
    avg_aqi: "DELHI NCR AVG AQI",
    local_aqi: "LOCAL AQI",
    ncr_avg_short: "NCR Avg",
    ventilation_idx: "VENTILATION INDEX",
    inversion_delta: "INVERSION STRENGTH (ΔT)",
    pblh_height: "BOUNDARY LAYER (PBLH)",
    active_fires: "ACTIVE STUBBLE FIRES",
    stubble_share: "STUBBLE PM2.5 SHARE",
    worst_station: "MAX POLLUTED STATION",
    wind_vector: "WIND VECTOR (हवा)",
    stubble_share_label: "Stubble Share",
    severe_trapping: "Severe Trapping",
    normal_dispersion: "Normal Dispersion",
    nocturnal_trapping: "Nocturnal Trapping",

    // Section Titles
    monitoring_grid: "Delhi NCR Monitoring Network",
    spatial_grid_title: "Delhi NCR Spatial Grid & Stubble Corridor",
    realtime_stations: "16 Real-time Monitoring Stations",
    source_apportionment: "Source Apportionment",
    source_stubble: "Stubble Burning (पराली)",
    source_vehicles: "Vehicular Exhaust (गाड़ियां)",
    source_dust: "Road & Dust (सड़क धूल)",
    source_industry: "Industrial Clusters (फैक्ट्रियां)",
    source_domestic: "Secondary & Domestic",

    station_forecast_title: "Coupled 72h Station Forecast & Met Parameters",
    select_station_prompt: "Kisi bhi station marker ya zone par click karke 72h forecast dekhein",
    zoom_controls: "Map Zoom",
    reset_view: "Reset View",

    // Station Forecast Card
    fc_curve_title: "Coupled 72h Continuous Forecast Curve",
    fc_mean_aqi: "Mean AQI",
    fc_ci_band: "90% CI Band",
    fc_severe_thresh: "Severe (400+)",
    fc_lead_label: "Lead",
    fc_decomp_title: "Physics Coupling Decomposition (+24h Lead Drivers)",
    fc_xai_badge: "Explainable AI Attribution",
    fc_stubble_smoke: "Farm Stubble Smoke",
    fc_stubble_desc: "NW Corridor transport at breathing level",
    fc_inversion_trap: "Inversion Trapping",
    fc_inversion_desc: "Thermal lid & compressed boundary layer",
    fc_urban_base: "Local Urban Baseline",
    fc_urban_desc: "Vehicles, dust & regional background",
    fc_grap_alert: "GRAP Stage IV Pre-emptive Alert (+24h to +72h Lead)",
    fc_emergency: "EMERGENCY",
    fc_now: "Now",
    fc_peak: "Peak",
    fc_cpcb_telemetry: "CPCB Continuous Ambient Telemetry",
    fc_grap_mandate: "Atmospheric ventilation index collapsing below 1200 m²/s. Mandatory school hybrid mode, diesel truck peripheral diversion, and continuous mist sweeps active.",

    // What-If Simulation
    whatif_title: "Counterfactual Policy Simulation Engine",
    whatif_subtitle: "Smog peak aane se pehle pre-emptive curbs ka asar simulate karein",
    slider_stubble: "Stubble Fire Mitigation (Punjab/Haryana)",
    slider_truck: "Heavy Commercial Truck Peripheral Diversion",
    slider_dust: "Mechanized Road Sweeping & Mist Dust Mitigation",
    slider_industry: "PNG/Clean Fuel Industrial Switching",
    simulated_peak_aqi: "Simulated Peak AQI",
    baseline_peak_aqi: "Baseline Peak AQI",
    points_saved: "AQI Points Saved",
    policy_effectiveness: "Policy Effectiveness",

    // Dispatches
    dispatches_title: "Automated Multi-Agency Stakeholder Dispatches",
    dispatches_subtitle: "Crisis se 72 ghante pehle trigger hue automated executive orders",
    urgency_level: "Urgency Level",
    target_agency: "Target Agency",
    action_mandate: "Action Mandate",
    dispatch_payload: "Telemetry Payload",

    // Inter-State Grid
    interstate_title: "Inter-State Smog Transport & Coordination Matrix",
    interstate_subtitle: "Delhi, Punjab, Haryana, UP, aur Rajasthan ke beech synchronized emission control",
    state_col: "State / Jurisdiction",
    role_col: "Coupled Basin Role",
    status_col: "Current Telemetry Status",
    actions_col: "Enforced Inter-State Mandates",
    urgency_col: "Urgency",

    // Settings Modal
    settings_title: "System Settings",
    theme_section: "Theme Appearance",
    theme_dark: "Dark Mode (MoES Atmospheric)",
    theme_light: "Light Mode (High-Contrast White)",
    lang_section: "System Language",
    lang_en: "English (Strict English)",
    lang_hi: "हिन्दी (Pure Hindi)",
    lang_hinglish: "Hinglish (Natural Mix)",
    save_close: "Save & Close",

    // VayuAI Copilot
    ai_copilot: "VayuAI Copilot",
    ai_placeholder: "Puchiye weather, AQI forecast, ya 'meri location'...",
    ai_welcome: "Namaste! Mai hu **VayuAI Copilot**. Delhi NCR ke air quality forecast, weather physics, GRAP orders ya stubble smoke ke baare me kuch bhi puchiye — voice ya text me!",
    ai_location_btn: "Location",
    ai_offline_badge: "⚡ Offline AI",
    ai_online_badge: "🟢 Gemini 3.5 Flash",
    ai_offline_warning: "⚠️ **Aapka Internet OFF hai (Offline AI Mode)!**\n\nOpen conversations ke liye kripya **Internet ON karein** (tab Gemini AI open conversations karega). Offline mode me data check karne ke liye niche diye gaye topics me se select karein:",
    ai_offline_tap_prompt: "⚡ Tap Any Topic Below for Offline Answers:"
  }
};

export function t(key, lang = 'hinglish') {
  const selectedLang = TRANSLATIONS[lang] || TRANSLATIONS['hinglish'];
  return selectedLang[key] || TRANSLATIONS['en'][key] || key;
}
