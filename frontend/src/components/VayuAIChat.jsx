import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, MessageSquare, X, Send, Mic, MicOff, Bot, User, 
  RefreshCw, ChevronDown, Check, Volume2, Globe, Cpu, CornerDownLeft,
  Square, MapPin, Navigation, ArrowUpRight, ShieldCheck, Compass,
  Layers, Flame, Wind, AlertTriangle, Activity, Settings
} from 'lucide-react';
import { queryVayuAI } from '../services/api';
import { t } from '../utils/i18n';

const DELHI_ZONES = [
  { name: "Central Delhi (ITO)", id: "DEL004" },
  { name: "East Delhi (Anand Vihar)", id: "DEL001" },
  { name: "South Delhi (R.K. Puram)", id: "DEL003" },
  { name: "West Delhi (Dwarka)", id: "DEL002" },
  { name: "North Delhi (Jahangirpuri)", id: "DEL005" },
  { name: "Noida / East NCR", id: "NCR003" },
  { name: "Gurugram (Vikas Sadan)", id: "NCR002" },
  { name: "Ghaziabad (Vasundhara)", id: "NCR005" },
  { name: "Faridabad / South NCR", id: "NCR004" },
];

const OFFLINE_TOPICS_BY_LANG = {
  en: [
    { label: "🏫 Will Schools Be Closed?", query: "will schools and colleges be closed due to pollution?" },
    { label: "💨 Ventilation Index Formula", query: "what is the ventilation index formula and current status?" },
    { label: "🌾 Stubble Burning Smoke Share", query: "what is the stubble burning smoke contribution?" },
    { label: "🚨 Predictive GRAP Stage Curbs", query: "explain predictive grap stage curbs and enforcement" },
    { label: "🌫️ Boundary Layer (PBLH) Trapping", query: "explain planetary boundary layer height trapping mechanism" },
    { label: "🌡️ Thermal Inversion Trapping", query: "explain nocturnal thermal inversion trapping" },
    { label: "😷 Health Advisory & N95 Rules", query: "health advisory and mask recommendations for current aqi" },
    { label: "🚗 Truck Diversion & Odd-Even", query: "impact of commercial truck diversion and odd even rules" },
    { label: "📍 My Location Forecast", query: "my location air quality forecast" },
    { label: "📊 Delhi NCR Regional Live AQI", query: "delhi ncr regional live aqi and weather telemetry" },
    { label: "📈 72-Hour Pollution Trajectory", query: "72-hour pollution forecast overview and peak timing" },
    { label: "🏛️ Multi-Agency Dispatches", query: "what are the multi-agency executive action dispatches?" }
  ],
  hi: [
    { label: "🏫 क्या स्कूल बंद होंगे?", query: "क्या वायु प्रदूषण के कारण स्कूल और कॉलेज बंद होंगे?" },
    { label: "💨 वेंटिलेशन इंडेक्स फॉर्मूला", query: "वेंटिलेशन इंडेक्स फॉर्मूला और वर्तमान स्थिति क्या है?" },
    { label: "🌾 पराली धुआं हिस्सेदारी", query: "पंजाब और हरियाणा पराली धुएं का कितना योगदान है?" },
    { label: "🚨 ग्रैप चरण प्रतिबंध", query: "पूर्वानुमानित ग्रैप चरण 1 से 4 के नियम और प्रतिबंध क्या हैं?" },
    { label: "🌫️ सीमा परत (PBLH) ट्रैपिंग", query: "सीमा परत ऊंचाई यानी पीबीएलएच प्रदूषण ट्रैपिंग क्या है?" },
    { label: "🌡️ थर्मल इन्वर्जन ट्रैपिंग", query: "रात्रि तापीय उत्क्रमण (थर्मल इन्वर्जन) क्या होता है?" },
    { label: "😷 स्वास्थ्य सलाह एवं N95", query: "वर्तमान प्रदूषण स्तर पर स्वास्थ्य सलाह और सावधानियां क्या हैं?" },
    { label: "🚗 ट्रक डायवर्जन व ऑड-ईवन", query: "भारी वाणिज्यिक वाहनों के डायवर्जन और ऑड-ईवन का असर" },
    { label: "📍 मेरे स्थान का वायु पूर्वानुमान", query: "मेरी लोकेशन का पूर्वानुमान बताओ" },
    { label: "📊 दिल्ली एनसीआर औसत AQI", query: "दिल्ली एनसीआर का औसत वायु गुणवत्ता सूचकांक क्या है?" },
    { label: "📈 72-घंटे प्रदूषण पूर्वानुमान", query: "अगले 72 घंटों का प्रदूषण पूर्वानुमान और पीक समय" },
    { label: "🏛️ बहु-एजेंसी एक्शन ऑर्डर्स", query: "विभिन्न सरकारी एजेंसियों के लिए जारी कार्रवाई आदेश क्या हैं?" }
  ],
  hinglish: [
    { label: "🏫 Schools Band Honge Ya Nahi?", query: "kal schools band honge ya nahi?" },
    { label: "💨 Ventilation Index Formula", query: "ventilation index formula aur status kya hai?" },
    { label: "🌾 Stubble Burning Smoke Share", query: "punjab stubble burning smoke kitna hai?" },
    { label: "🚨 GRAP Stage 1–4 Curbs", query: "predictive grap stage curbs kya hain?" },
    { label: "🌫️ Boundary Layer (PBLH) Trapping", query: "boundary layer height pblh trapping kya hai?" },
    { label: "🌡️ Thermal Inversion Trapping", query: "thermal inversion trapping kya hota hai?" },
    { label: "😷 Health Advisory & N95", query: "health advisory n95 mask recommendation" },
    { label: "🚗 Truck Diversion & Odd-Even", query: "truck diversion odd even impact" },
    { label: "📍 Meri Location Ka Forecast", query: "meri location ka forecast bata" },
    { label: "📊 Delhi NCR Live AQI", query: "delhi ncr average aqi kitna hai?" },
    { label: "📈 72-Hour Pollution Forecast", query: "72-hour pollution forecast overview" },
    { label: "🏛️ Multi-Agency Dispatches", query: "multi agency stakeholder dispatches kya hain?" }
  ]
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function VayuAIChat({ 
  currentStep = 72, 
  snapshot = null, 
  onSelectStation = null,
  language = 'hinglish',
  theme = 'dark',
  onOpenSettings = null,
  isOpen: isOpenProp = undefined,
  onToggleOpen: onToggleOpenProp = undefined
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : internalIsOpen;
  const setIsOpen = (val) => {
    if (onToggleOpenProp) {
      onToggleOpenProp(typeof val === 'function' ? val(isOpen) : val);
    } else {
      setInternalIsOpen(val);
    }
  };
  const isUrlOffline = typeof window !== 'undefined' && (
    window.location.search.includes('offline') || 
    window.location.search.includes('mode=offline')
  );
  const [forceOffline, setForceOffline] = useState(isUrlOffline);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);


  const isAiOnline = !forceOffline && isOnline;

  const activeTopics = OFFLINE_TOPICS_BY_LANG[language] || OFFLINE_TOPICS_BY_LANG['hinglish'];

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: t('ai_welcome', language),
      mode: 'gemini',
      online: !isUrlOffline,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastModeInfo, setLastModeInfo] = useState({ 
    online: !isUrlOffline, 
    model: !isUrlOffline ? 'Gemini 3.5 Flash' : 'Offline AI Engine' 
  });
  const [hasUnread, setHasUnread] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{
          ...prev[0],
          text: t('ai_welcome', language)
        }];
      }
      return prev;
    });
  }, [language]);

  // Setup Web Speech API for Mic
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : (language === 'en' ? 'en-US, en-IN' : 'hi-IN, en-IN');

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnread(false);
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Mic start failed", e);
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const selectZoneAndRedirect = (zone) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: `📍 **${zone.name} Selected!**\n\nApp redirected to **${zone.name}** Coupled 72h Forecast trajectory.`,
        stationRedirect: zone.id,
        stationName: zone.name,
        isLocation: true,
        online: !forceOffline && lastModeInfo.online,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (onSelectStation) {
      onSelectStation(zone.id);
    }
  };

  const resolveCoordinates = (userLat, userLon, detectMsgId, source = "Browser GPS") => {
    setIsLocating(false);
    if (snapshot && snapshot.stations && snapshot.stations.length > 0) {
      const stationsWithDist = snapshot.stations.map(st => ({
        ...st,
        distance: getDistanceKm(userLat, userLon, st.lat, st.lon)
      }));
      stationsWithDist.sort((a, b) => a.distance - b.distance);
      const nearest = stationsWithDist[0];
      const distKm = nearest.distance.toFixed(1);

      setMessages(prev => [
        ...prev.filter(m => m.id !== detectMsgId),
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `📍 **Location Detected!** (${source})\n\nNearest monitoring station: **${nearest.name} (${nearest.region})** (~${distKm} km).\n\n- **Current AQI:** **${nearest.aqi}** (${nearest.category})\n- **PM2.5:** ${nearest.pm25} μg/m³\n- **Stubble Smoke Share:** ${nearest.stubble_share_ugm3} μg/m³\n\n👉 **Redirecting to ${nearest.name} Coupled 72h Forecast Panel!**`,
          stationRedirect: nearest.station_id,
          stationName: nearest.name,
          isLocation: true,
          online: !forceOffline && lastModeInfo.online,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      if (onSelectStation) {
        onSelectStation(nearest.station_id);
      }
    }
  };

  const handleLocationDetection = () => {
    if (isLocating) return;
    setIsLocating(true);
    const detectMsgId = Date.now().toString();
    let isHandled = false;

    setMessages(prev => [
      ...prev,
      {
        id: detectMsgId,
        sender: 'bot',
        text: "🛰️ **Detecting location...**\n\nCalculating nearest air quality monitoring station...",
        online: !forceOffline && lastModeInfo.online,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    const handleSuccess = (lat, lon, source) => {
      if (isHandled) return;
      isHandled = true;
      resolveCoordinates(lat, lon, detectMsgId, source);
    };

    const fallbackToAutoEndpoint = async (reason) => {
      if (isHandled) return;
      try {
        const r = await fetch('/api/location/auto');
        if (r.ok) {
          const d = await r.json();
          if (d.success && d.lat && d.lon) {
            handleSuccess(d.lat, d.lon, d.source || "Network Node");
            return;
          }
        }
      } catch (e) {
        console.warn("Auto location endpoint failed:", e);
      }
      if (!isHandled) {
        isHandled = true;
        setIsLocating(false);
        setMessages(prev => prev.filter(m => m.id !== detectMsgId));
        showManualZonePicker(`${reason} Please choose an area from the Delhi NCR zones below:`);
      }
    };

    if (!navigator.geolocation) {
      fallbackToAutoEndpoint("Browser hardware GPS unavailable.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSuccess(position.coords.latitude, position.coords.longitude, "Browser GPS");
      },
      (error) => {
        console.warn('Geolocation error or slow, trying network auto-detection:', error);
        fallbackToAutoEndpoint("Hardware GPS unavailable on PC.");
      },
      { timeout: 7000, enableHighAccuracy: false, maximumAge: 600000 }
    );
  };

  const showManualZonePicker = (introText) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: introText,
        isZonePicker: true,
        online: !forceOffline && lastModeInfo.online,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (questionText = null) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isLoading) return;

    // Check if query is about location
    const locationRegex = /(location|area|forecast.*mera|mera.*forecast|near me|aas paas|aaspaas|my.*location|kaha hu|where am i|mere.*paas|स्थान|जगह)/i;
    if (locationRegex.test(textToSend)) {
      const userMsg = {
        id: Date.now().toString(),
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      handleLocationDetection();
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const useGemini = isAiOnline;
      const res = await queryVayuAI(textToSend, currentStep, useGemini, controller.signal, language);
      
      const msgIsOnline = res.online ?? isAiOnline;
      if (msgIsOnline) {
        setLastModeInfo({
          online: true,
          model: res.model || 'Gemini 3.5 Flash'
        });
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.answer || "Sorry, could not process response at this time.",
        mode: res.mode,
        model: res.model,
        online: msgIsOnline,
        showOptions: res.show_options || false,
        options: res.options || activeTopics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      if (!isOpen) setHasUnread(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'bot',
          text: "⏹️ *Response generation stopped.*",
          online: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      }
      console.error('AI Query Error:', err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: t('ai_offline_warning', language),
        mode: 'offline',
        online: false,
        showOptions: true,
        options: activeTopics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const clearChat = () => {
    handleStop();
    setMessages([
      {
        id: 'reset',
        sender: 'bot',
        text: t('ai_welcome', language),
        online: !forceOffline && lastModeInfo.online,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Formatter for markdown text
  const formatMessageText = (text) => {
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      
      // Table row
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        return (
          <div key={idx} className="font-mono text-[11px] bg-slate-900/60 px-2 py-0.5 border-b border-slate-800 text-cyan-200 overflow-x-auto whitespace-pre">
            {line}
          </div>
        );
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletContent = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 text-xs my-0.5 leading-relaxed">
            <span dangerouslySetInnerHTML={{ 
              __html: bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>') 
            }} />
          </li>
        );
      }

      return (
        <p key={idx} className={`${line.trim() === '' ? 'h-2' : 'my-1'} text-slate-200 text-xs leading-relaxed`}
          dangerouslySetInnerHTML={{ 
            __html: formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>') 
          }} 
        />
      );
    });
  };

  return (
    <>
      {/* ===== 1. FLOATING ACTION LAUNCHER BUTTON (Bottom-Right on Desktop/Tablet) ===== */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-[90] items-center gap-2 select-none">
        
        {/* Helper tooltip tag when closed */}
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-xs font-semibold text-cyan-300 shadow-xl shadow-cyan-950/60 backdrop-blur-md cursor-pointer hover:border-cyan-400 transition animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('ai_copilot', language)}</span>
            <span className={`w-2 h-2 rounded-full ${forceOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`}></span>
          </div>
        )}

        {/* Circular Floating Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
            isOpen 
              ? 'bg-slate-800 text-slate-300 border border-slate-700 rotate-90 scale-95' 
              : forceOffline
                ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-500 text-slate-950 font-bold border-2 border-amber-300 shadow-amber-500/30 hover:scale-105 active:scale-95'
                : 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-500 text-slate-950 font-bold border-2 border-cyan-300 shadow-cyan-500/30 hover:scale-105 active:scale-95'
          }`}
          title="Open VayuAI Intelligent Copilot"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-slate-950 animate-pulse" />
              <span className={`absolute -inset-1 rounded-2xl blur-sm animate-pulse -z-10 ${forceOffline ? 'bg-amber-400/30' : 'bg-cyan-400/30'}`}></span>
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 flex items-center justify-center text-[9px] text-white font-black">
                  1
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ===== 2. EXPANDED POP-UP CHAT MODAL (Distinct Popup Modal with Backdrop) ===== */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full sm:w-[460px] max-w-full sm:max-w-[480px] h-[82vh] sm:h-[620px] max-h-[88vh] bg-[#0A131F] border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-cyan-950/90 backdrop-blur-2xl flex flex-col overflow-hidden animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            {/* Grab pill on mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/70 border-b border-cyan-500/20 px-4 py-3 sm:p-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-md ${
                  !isAiOnline 
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/20' 
                    : 'bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-cyan-500/20'
                }`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white tracking-tight">VayuAI Copilot</h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold">
                      MoES 2026
                    </span>
                  </div>
                {/* Mode Indicator & Interactive Toggle */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setForceOffline(!forceOffline)}
                    className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm ${
                      !isAiOnline 
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/80 hover:bg-amber-900' 
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80 hover:bg-emerald-900'
                    }`}
                    title="Click to toggle between Online Gemini and Offline Physics AI"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${!isAiOnline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                    {!isAiOnline ? '⚡ Offline AI' : '🟢 Gemini 3.5 Flash'}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions: Location, Refresh & Close */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleLocationDetection}
                className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Detect My Location & Redirect to Forecast">
                <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-[10px]">{t('ai_location_btn', language)}</span>
              </button>

              <button 
                onClick={clearChat}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Clear Chat History">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-bold active:scale-95"
                title="Close VayuAI Popup">
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 min-h-0 custom-scrollbar">
            
            {/* Offline Mode Alert Banner */}
            {!isAiOnline && (
              <div className="p-2.5 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-xs text-amber-200 flex items-start justify-between gap-2 shadow-md shrink-0">
                <div>
                  <div className="font-bold flex items-center gap-1 text-amber-300 text-[11px]">
                    <span>⚡ 100% Offline AI Mode</span>
                  </div>
                  <p className="text-[10px] text-amber-200/90 mt-0.5 leading-snug">
                    Zero internet used. All queries answered via local coupled physics, station telemetry, and domain rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForceOffline(false)}
                  className="text-[10px] font-bold text-cyan-300 hover:underline shrink-0 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                >
                  Switch to Online
                </button>
              </div>
            )}

            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-2 items-start ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                  m.sender === 'user' 
                    ? 'bg-cyan-600 text-white' 
                    : m.online
                      ? 'bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950'
                      : 'bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950'
                }`}>
                  {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[88%] rounded-2xl p-3 text-xs ${
                  m.sender === 'user' 
                    ? 'bg-cyan-950/80 text-cyan-100 border border-cyan-600/60 rounded-tr-sm' 
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-md'
                }`}>
                  {formatMessageText(m.text)}

                  {/* Interactive Options Grid when offline or requested */}
                  {m.showOptions && m.options && (
                    <div className="mt-3 pt-2.5 border-t border-amber-700/40">
                      <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>{t('ai_offline_tap_prompt', language)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.options.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSend(opt.query)}
                            className="group relative p-2.5 rounded-xl bg-slate-950/90 hover:bg-[#1A1208] border border-slate-800 hover:border-amber-400 text-slate-300 hover:text-amber-100 transition-all duration-300 text-left flex items-start gap-2 cursor-pointer active:scale-95 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/20 hover:z-20 shadow-sm"
                            title={opt.label}
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-0.5 group-hover:scale-150 group-hover:bg-amber-300 transition-transform duration-200 shadow-sm shadow-amber-400/60"></span>
                            <span className="text-[11px] font-semibold leading-snug break-words flex-1 group-hover:translate-x-0.5 transition-transform duration-200">
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Redirect Button if station was detected */}
                  {m.stationRedirect && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => onSelectStation && onSelectStation(m.stationRedirect)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30 transition active:scale-95 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View {m.stationName} Forecast Panel</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Manual Zone Picker Grid with Live AQI & Permission Guide */}
                  {m.isZonePicker && (
                    <div className="mt-3 pt-2.5 border-t border-cyan-800/50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                          📍 1-Click Delhi NCR Zone Selector:
                        </span>
                        <button
                          type="button"
                          onClick={handleLocationDetection}
                          className="px-2 py-0.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-cyan-400" />
                          <span>Try GPS Again</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {DELHI_ZONES.map(z => {
                          const st = snapshot && snapshot.stations ? snapshot.stations.find(s => s.station_id === z.id) : null;
                          const aqiVal = st ? st.aqi : null;
                          const catColor = st ? st.category_color : '#06B6D4';
                          return (
                            <button
                              key={z.id}
                              type="button"
                              onClick={() => selectZoneAndRedirect(z)}
                              className="group p-2 rounded-xl bg-slate-950/90 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-400 text-slate-200 hover:text-cyan-100 transition-all duration-200 text-left flex items-center justify-between gap-2 cursor-pointer active:scale-95 hover:scale-[1.02] shadow-sm"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 text-cyan-400 shrink-0 group-hover:scale-125 transition-transform" />
                                <span className="text-[11px] font-medium truncate">{z.name}</span>
                              </div>
                              {aqiVal && (
                                <span 
                                  className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 shrink-0"
                                  style={{ color: catColor }}
                                >
                                  {aqiVal}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 leading-relaxed flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold shrink-0">💡 Tip:</span>
                        <span>
                          Chrome address bar ke left mein <strong>Tune (🎚️) ya Lock (🔒)</strong> dabayein ➡️ <strong>Location ko "Allow"</strong> karein, taaki exact GPS se sabse kareeb ka station auto-detect ho sake.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-800/60 text-[9px] text-slate-500 font-mono">
                    <span>{m.timestamp}</span>
                    {m.sender === 'bot' && (
                      <span>
                        {m.stationRedirect || m.isLocation ? (
                          <span className="text-teal-300 font-bold bg-teal-950/90 px-1.5 py-0.5 rounded border border-teal-700/80 text-[9px] flex items-center gap-1">
                            📍 Geo Telemetry
                          </span>
                        ) : m.online ? (
                          <span className="text-cyan-400 font-semibold flex items-center gap-1">
                            ✨ Gemini 3.5 Flash
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-700 text-[9px] flex items-center gap-1">
                            ⚡ Offline AI
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Clean loading indicator with STOP button */}
            {isLoading && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    forceOffline 
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950' 
                      : 'bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950'
                  }`}>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
                
                {/* Stop Button */}
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2.5 py-1 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-600/80 text-rose-300 text-[10px] font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-rose-950/50 cursor-pointer"
                  title="Stop generating response"
                >
                  <Square className="w-3 h-3 fill-rose-300" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {activeTopics.map((top, i) => (
              <button
                key={i}
                onClick={() => {
                  if (top.query.includes("location") || top.query.includes("स्थान")) {
                    handleLocationDetection();
                  } else {
                    handleSend(top.query);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all duration-200 shrink-0 active:scale-95 cursor-pointer hover:scale-105 hover:shadow-md ${
                  top.label.includes("Location") || top.label.includes("स्थान")
                    ? 'bg-gradient-to-r from-cyan-950 to-teal-950 border border-cyan-500/80 text-cyan-300 hover:border-cyan-400'
                    : forceOffline 
                      ? 'bg-slate-900 hover:bg-amber-950/80 border border-slate-700 hover:border-amber-500/80 text-slate-300 hover:text-amber-200'
                      : 'bg-slate-900 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 text-slate-300 hover:text-cyan-200'
                }`}
              >
                {top.label}
              </button>
            ))}
          </div>

          {/* Input Box + Voice + Send / Stop Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 shrink-0 safe-area-pb">
            {isListening && (
              <div className="mb-2 p-1.5 rounded-lg bg-rose-950/60 border border-rose-700/80 text-[11px] text-rose-300 flex items-center justify-between animate-pulse">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                  Listening... Bolna shuru kijiye
                </span>
                <button onClick={toggleVoice} className="text-[10px] font-bold text-rose-300 hover:underline cursor-pointer">
                  Stop
                </button>
              </div>
            )}

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 sm:p-1 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/40 transition"
            >
              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ai_placeholder', language)}
                className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none"
              />

              {/* Voice Mic Button */}
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isListening 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300'
                }`}
                title={isListening ? "Stop listening" : "Click to speak (Voice input)"}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Action Button: Stop if loading, else Send */}
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-md shadow-rose-600/30 active:scale-95 flex items-center gap-1 text-xs cursor-pointer"
                  title="Stop Generating"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={`p-2 rounded-xl text-slate-950 font-bold hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-md active:scale-95 cursor-pointer ${
                    forceOffline 
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/20' 
                      : 'bg-gradient-to-tr from-cyan-500 to-teal-500 shadow-cyan-500/20'
                  }`}
                  title="Send Message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
            
            <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 px-1 font-mono">
              <span>Press Enter to send</span>
              <span>{forceOffline ? '⚡ Offline AI Active' : '🎙️ Voice input enabled'}</span>
            </div>
          </div>

          </div>
        </div>
      )}
    </>
  );
}
