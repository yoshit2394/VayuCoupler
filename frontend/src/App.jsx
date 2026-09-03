import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, ShieldAlert, Send, Sliders, GitMerge, LayoutDashboard, 
  RotateCcw, Play, Pause, Activity, Gauge, Layers, Thermometer, 
  Compass, Flame, MapPin, TrendingUp, PieChart, CheckCircle, Radio,
  ZoomIn, ZoomOut, X, AlertTriangle, Building2, Truck, GraduationCap,
  Heart, Users, Leaf, AlertCircle, ArrowRight, ChevronDown, Settings,
  Bot, Sparkles, Navigation, Crosshair
} from 'lucide-react';
import { 
  fetchStations, fetchSnapshot, fetchStationForecast, 
  fetchGrapTriggers, fetchDispatches, fetchInterstateGrid, runWhatIfSimulation 
} from './services/api';
import VayuAIChat from './components/VayuAIChat';
import SettingsModal from './components/SettingsModal';
import StationForecastCard from './components/StationForecastCard';
import { t } from './utils/i18n';
import { sound } from './utils/sound';
import { requestUserLocation } from './utils/location';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('vayucoupler_theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('vayucoupler_lang') || 'hinglish');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const [currentStep, setCurrentStep] = useState(72);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStationId, setSelectedStationId] = useState('DEL001');
  const [selectedRoleId, setSelectedRoleId] = useState('ROLE_AGRI');

  // Geolocation & local station auto-detection
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('vayucoupler_user_location');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [locationStatus, setLocationStatus] = useState('detecting'); // 'detecting' | 'detected' | 'denied' | 'idle'
  const [locationBannerVisible, setLocationBannerVisible] = useState(false);
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Zoom state
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Station detail modal
  const [stationModal, setStationModal] = useState(null);
  // Official Dispatch Order detail modal
  const [activeDispatchModal, setActiveDispatchModal] = useState(null);

  const [snapshot, setSnapshot] = useState(null);
  const [stationFc, setStationFc] = useState(null);
  const [grapData, setGrapData] = useState(null);
  const [dispatches, setDispatches] = useState(null);
  const [interstate, setInterstate] = useState(null);
  const [whatIfData, setWhatIfData] = useState(null);

  const [stubbleVal, setStubbleVal] = useState(50);
  const [truckVal, setTruckVal] = useState(40);
  const [dustVal, setDustVal] = useState(30);
  const [industryVal, setIndustryVal] = useState(20);

  useEffect(() => {
    async function loadData() {
      try {
        const [snap, sFc, grap, disp, inter] = await Promise.all([
          fetchSnapshot(currentStep),
          fetchStationForecast(selectedStationId, currentStep),
          fetchGrapTriggers(currentStep),
          fetchDispatches(currentStep),
          fetchInterstateGrid(currentStep)
        ]);
        setSnapshot(snap);
        setStationFc(sFc);
        setGrapData(grap);
        setDispatches(disp);
        setInterstate(inter);
      } catch (err) {
        console.error("API error", err);
      }
    }
    loadData();
  }, [currentStep, selectedStationId]);

  // Auto-detect user's live GPS location on startup & automatically set local station
  useEffect(() => {
    if (!snapshot?.stations || snapshot.stations.length === 0 || hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;

    let isMounted = true;
    requestUserLocation(snapshot.stations).then((loc) => {
      if (!isMounted) return;
      if (loc.success && loc.closestStation) {
        setUserLocation(loc);
        setLocationStatus('detected');
        setSelectedStationId(loc.closestStation.station_id);
        setLocationBannerVisible(true);
        sound.playTap();
        setTimeout(() => {
          if (isMounted) setLocationBannerVisible(false);
        }, 3500);
      } else {
        setLocationStatus('denied');
      }
    });

    return () => { isMounted = false; };
  }, [snapshot?.stations]);

  const handleDetectLocation = async () => {
    setLocationStatus('detecting');
    sound.playTap();
    const loc = await requestUserLocation(snapshot?.stations || []);
    if (loc.success && loc.closestStation) {
      setUserLocation(loc);
      setLocationStatus('detected');
      setSelectedStationId(loc.closestStation.station_id);
      setLocationBannerVisible(true);
      setTimeout(() => setLocationBannerVisible(false), 3500);
    } else {
      setLocationStatus('denied');
      alert(language === 'hi' 
        ? 'लोकेशन की अनुमति नहीं मिली। कृपया अपने फोन या ब्राउज़र की सेटिंग्स में जाकर लोकेशन ऑन करें।' 
        : 'Location permission denied. Please enable location in your device settings.');
    }
  };

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev >= 167 ? 0 : prev + 1));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleWhatIf = async () => {
    try {
      const res = await runWhatIfSimulation({
        step_hour: currentStep,
        stubble_reduction_pct: stubbleVal,
        truck_reduction_pct: truckVal,
        dust_reduction_pct: dustVal,
        industry_switch_pct: industryVal
      });
      setWhatIfData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    handleWhatIf();
  }, [currentStep, stubbleVal, truckVal, dustVal, industryVal]);

  // Map pan & drag handlers (Supports Mouse, Pointer, and Mobile Touch Events)
  // Map pan & drag handlers (Supports Mouse, Pointer, and Mobile Touch Events)
  const handlePointerDown = (e) => {
    // If tapping on a station marker or chip, never capture pointer on container!
    if (e.target && (e.target.closest?.('[data-station]') || e.target.getAttribute?.('data-station'))) {
      return;
    }
    if (mapZoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...mapPan };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 2) {
      setMapPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleTouchStart = (e) => {
    // If tapping on a station marker, never intercept touch for drag!
    if (e.target && (e.target.closest?.('[data-station]') || e.target.getAttribute?.('data-station'))) {
      return;
    }
    if (mapZoom <= 1 || e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStart.current = { ...mapPan };
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 4) {
      if (e.cancelable) e.preventDefault();
      setMapPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const resetZoom = () => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); };

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-cyan-400 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to MoES Coupled Forecasting Engine...</span>
        </div>
      </div>
    );
  }

  const met = snapshot.meteorology;
  const fires = snapshot.stubble_burning;
  const currSt = snapshot.stations.find(s => s.station_id === selectedStationId) || snapshot.stations[0];

  // Station click handler
  const handleStationClick = (station) => {
    sound.playStationSelect();
    setSelectedStationId(station.station_id);
    setStationModal(station);
    setTimeout(() => sound.playModalOpen(), 60);
  };

  // Location redirect handler: switches tab and scrolls right to forecast card with flash animation
  const handleSelectAndScrollStation = (stationId) => {
    sound.playStationSelect();
    setSelectedStationId(stationId);
    setActiveTab('overview');
    setTimeout(() => {
      const el = document.getElementById('station-forecast-panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('forecast-highlight-active');
        // Trigger reflow so animation restarts cleanly even on rapid clicks
        void el.offsetWidth;
        el.classList.add('forecast-highlight-active');
        setTimeout(() => {
          el.classList.remove('forecast-highlight-active');
        }, 3800);
      }
    }, 150);
  };

  const urgencyColor = (u) => {
    if (u === 'EMERGENCY') return '#EF4444';
    if (u === 'CRITICAL') return '#F97316';
    if (u === 'HIGH') return '#F59E0B';
    if (u === 'ELEVATED') return '#22D3EE';
    return '#10B981';
  };

  const switchTab = (tabId) => {
    sound.playTab(tabId);
    setActiveTab(tabId);
    setIsAiOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const openAi = () => {
    sound.playChime();
    setIsAiOpen(true);
  };

  const changeStep = (step) => {
    sound.playTap();
    setCurrentStep(step);
  };

  const togglePlay = () => {
    sound.playTap();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      
      {/* ===== TOP NAVIGATION ===== */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-2.5 md:py-3 safe-area-pt">
        {/* Desktop Navbar */}
        <div className="hidden md:flex max-w-[1720px] mx-auto items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">SIH26082 • MoES</span>
                <span className="text-xs text-slate-400">Delhi NCR Coupled Forecasting System</span>
              </div>
              <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Air Pollution–Weather Coupled Early Warning System
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  PREDICTIVE GRAP ACTIVE
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              {[
                { id: 'overview', icon: <LayoutDashboard className="w-4 h-4" />, label: t('tab_overview', language) },
                { id: 'grap',     icon: <ShieldAlert className="w-4 h-4" />,    label: t('tab_grap', language) },
                { id: 'dispatches', icon: <Send className="w-4 h-4" />,         label: t('tab_dispatches', language) },
                { id: 'whatif',   icon: <Sliders className="w-4 h-4" />,        label: t('tab_whatif', language) },
                { id: 'interstate', icon: <GitMerge className="w-4 h-4" />,     label: t('tab_interstate', language) },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === tab.id
                      ? 'text-cyan-400 bg-cyan-950 border border-cyan-800 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>

            {/* Live GPS Location Button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm ${
                userLocation 
                  ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/80 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title={userLocation ? `Live Station: ${userLocation.closestStation.name} (${userLocation.distanceKm} km)` : "Detect My Location"}
            >
              <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${locationStatus === 'detecting' ? 'animate-spin' : ''}`} />
              {userLocation ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{userLocation.closestStation.name.split(' ')[0]} ({userLocation.distanceKm}km)</span>
                </span>
              ) : (
                <span>{locationStatus === 'detecting' ? 'Detecting...' : (language === 'hi' ? 'मेरी लोकेशन' : 'Detect Location')}</span>
              )}
            </button>

            {/* Desktop Local Station AQI Pill */}
            <button
              type="button"
              onClick={() => handleSelectAndScrollStation(currSt.station_id)}
              className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold font-mono transition cursor-pointer active:scale-95 shadow-sm"
              style={{
                backgroundColor: (currSt?.category_color || snapshot.category_color) + '22',
                color: currSt?.category_color || snapshot.category_color,
                borderColor: (currSt?.category_color || snapshot.category_color) + '66'
              }}
              title={`Selected Station: ${currSt?.name} • AQI ${currSt?.aqi}`}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: currSt?.category_color || snapshot.category_color }}></span>
              <span>{currSt?.name?.split(' ')[0]}: AQI {currSt?.aqi ?? snapshot.delhi_ncr_avg_aqi}</span>
            </button>

            {/* Settings Trigger Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm"
              title="System Preferences (Theme & Language)"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('settings_btn', language)}</span>
            </button>
          </div>
        </div>

        {/* Mobile Native App Bar */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-tight">VayuCoupler</span>
                <span className="text-[8px] font-bold px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">MoES</span>
              </div>
              <p className="text-[9px] text-slate-400">Delhi-NCR Coupled AQI</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Live GPS Location Button / Badge */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold active:scale-95 transition ${
                userLocation 
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/70 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-950 text-slate-300 border-slate-800'
              }`}
              title="Detect My Location"
            >
              <Navigation className={`w-3 h-3 text-cyan-400 ${locationStatus === 'detecting' ? 'animate-spin' : ''}`} />
              {userLocation ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="truncate max-w-[85px]">{userLocation.closestStation.name.split(' ')[0]}</span>
                  <span className="text-[9px] text-cyan-400/80 font-mono">({userLocation.distanceKm}km)</span>
                </span>
              ) : (
                <span className="text-[9px]">{locationStatus === 'detecting' ? 'GPS...' : (language === 'hi' ? 'लोकेशन' : 'GPS')}</span>
              )}
            </button>

            <button 
              type="button"
              onClick={() => handleSelectAndScrollStation(currSt.station_id)}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border active:scale-95 transition cursor-pointer"
              style={{
                backgroundColor: (currSt?.category_color || snapshot.category_color) + '2a',
                color: currSt?.category_color || snapshot.category_color,
                borderColor: (currSt?.category_color || snapshot.category_color) + '70'
              }}
              title={`Local Station: ${currSt?.name} • AQI ${currSt?.aqi}`}
            >
              AQI {currSt?.aqi ?? snapshot.delhi_ncr_avg_aqi}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 active:scale-95"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating GPS Location Auto-Detection Banner (Auto-dismisses in 3.5s) */}
      {locationBannerVisible && userLocation && (
        <div 
          onClick={() => {
            sound.playTap();
            handleSelectAndScrollStation(userLocation.closestStation.station_id);
            setLocationBannerVisible(false);
          }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-emerald-950/95 border border-cyan-500/60 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 backdrop-blur-2xl max-w-md w-[94%] cursor-pointer active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-top-3"
          title="Click to view forecast for your local station"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{language === 'hi' ? 'आपकी लाइव लोकेशन सेट हो गई है' : 'Local Air Quality Set to Your Location'}</span>
              </div>
              <div className="text-[11px] text-cyan-300 font-medium truncate mt-0.5">
                {userLocation.closestStation.name} • {userLocation.distanceKm} km away • AQI {userLocation.closestStation.aqi}
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocationBannerVisible(false);
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 shrink-0 cursor-pointer active:scale-95"
              title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Subtle auto-dismiss timer bar */}
          <div className="w-full bg-cyan-950/60 h-1 rounded-full overflow-hidden border border-cyan-800/40">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full animate-[shrinkWidth_3.5s_linear_forwards]" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* ===== TIME SCRUBBER (Simplified 7-Day Forecast Timeline) ===== */}
      <section className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-4">
          
          {/* Play/Pause & Simple Day Badge */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button 
              onClick={togglePlay}
              className="w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition active:scale-95 shadow-md shadow-cyan-900/40 cursor-pointer"
              title={isPlaying ? "Pause Timeline" : "Play 7-Day Forecast"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              <span className="text-cyan-400 font-bold">
                📅 {t('scrubber_day', language)} {Math.min(7, Math.max(1, Math.floor(currentStep / 24) + 1))}
              </span>
              <span className="text-slate-500 text-[10px]">({currentStep}h)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                currentStep >= 144 ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60' :
                currentStep >= 96  ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60' :
                currentStep >= 48  ? 'text-amber-300 bg-amber-950/80 border border-amber-700/60' :
                                     'text-cyan-300 bg-cyan-950/80 border border-cyan-700/60'
              }`}>
                {currentStep >= 144 ? t('scrubber_badge_relief', language) :
                 currentStep >= 96  ? t('scrubber_badge_peak', language) :
                 currentStep >= 48  ? t('scrubber_badge_alert', language) : t('scrubber_badge_normal', language)}
              </span>
            </div>
          </div>

          {/* Slider & Simple Milestone Labels */}
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 px-0.5">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                {t('scrubber_d1', language)}
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                {t('scrubber_d3', language)}
              </span>
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block animate-ping"></span>
                {t('scrubber_d5', language)}
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                {t('scrubber_d7', language)}
              </span>
            </div>
            <input 
              type="range" min="0" max="167" value={currentStep}
              onChange={(e) => {
                sound.playSlider();
                setCurrentStep(parseInt(e.target.value));
              }}
              className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              style={{ accentColor: '#06B6D4' }}
            />
          </div>

          {/* Simple 4 Quick Day Buttons */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 shrink-0 text-xs w-full md:w-auto">
            <button 
              type="button"
              onClick={() => changeStep(24)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-semibold ${
                currentStep <= 36 
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-950' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {t('scrubber_btn_d1', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(72)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-semibold ${
                currentStep >= 48 && currentStep <= 84 
                  ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-md shadow-amber-950' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {t('scrubber_btn_d3', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(120)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-bold ${
                currentStep >= 96 && currentStep <= 132 
                  ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-md shadow-rose-950' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {t('scrubber_btn_d5', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(156)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-semibold ${
                currentStep >= 144 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-950' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {t('scrubber_btn_d7', language)}
            </button>
          </div>

        </div>
      </section>

      {/* ===== MAIN CONTENT TABS ===== */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3.5 md:p-6 pb-28 md:pb-8 flex flex-col gap-6">

        {/* ==================== OVERVIEW / COMMAND CENTER TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5 md:gap-6">

            {/* 6 Key Atmospheric Coupling Telemetry Cards */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {/* Card 1: Local Station Hero AQI (Auto-Synced with GPS / Selected Station) */}
              <div 
                onClick={() => handleSelectAndScrollStation(currSt.station_id)}
                className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 cursor-pointer hover:border-cyan-500/50 transition shadow-sm group select-none" 
                style={{ borderLeftColor: currSt?.category_color || snapshot.category_color }}
                title={`Click to view 72h Coupled Forecast for ${currSt?.name}`}
              >
                <div className="text-[11px] sm:text-xs text-slate-400 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-bold truncate max-w-[140px]">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                    <span className="truncate">{currSt?.name?.toUpperCase()}</span>
                  </span>
                  {userLocation ? (
                    <span className="text-[9px] text-cyan-300 font-medium flex items-center gap-1 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{userLocation.distanceKm} km</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-mono">
                      {t('local_aqi', language)}
                    </span>
                  )}
                </div>

                <div className="my-1 sm:my-1.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: currSt?.category_color || '#FFFFFF' }}>
                    {currSt?.aqi}
                  </span>
                  <span 
                    className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full" 
                    style={{ backgroundColor: (currSt?.category_color || '#FBBF24') + '33', color: currSt?.category_color || '#FBBF24' }}
                  >
                    {language === 'hi' 
                      ? (currSt?.category === 'Severe' ? 'गंभीर' : currSt?.category === 'Very Poor' ? 'बहुत खराब' : currSt?.category === 'Poor' ? 'खराब' : currSt?.category === 'Moderate' ? 'मध्यम' : currSt?.category === 'Satisfactory' ? 'संतोषजनक' : 'अच्छा')
                      : currSt?.category}
                  </span>
                </div>

                <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>PM2.5: <b className="text-slate-200">{currSt?.pm25}</b> μg/m³</span>
                  <span className="text-slate-500 text-[10px]">{t('ncr_avg_short', language)}: <b className="text-slate-400 font-bold">{snapshot.delhi_ncr_avg_aqi}</b></span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 border-cyan-500">
                <div className="text-[11px] sm:text-xs text-cyan-400 font-semibold">{t('ventilation_idx', language)}</div>
                <div className="my-1 sm:my-1.5 text-xl sm:text-2xl font-black font-mono text-cyan-300">
                  {met.ventilation_index_m2s} <span className="text-xs text-slate-400">m²/s</span>
                </div>
                <div className={`text-[10px] sm:text-[11px] font-medium ${met.ventilation_index_m2s < 2000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {language === 'hi' ? 'गंभीर ट्रैपिंग (<1200 m²/s)' : met.ventilation_status}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 border-indigo-500">
                <div className="text-[11px] sm:text-xs text-slate-400 font-semibold">{t('pblh_height', language)}</div>
                <div className="my-1 sm:my-1.5 text-xl sm:text-2xl font-black font-mono text-indigo-200">
                  {met.boundary_layer_height_m} <span className="text-xs text-slate-400">m</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">
                  {met.boundary_layer_height_m < 500 ? t('severe_trapping', language) : t('normal_dispersion', language)}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 border-amber-500">
                <div className="text-[11px] sm:text-xs text-slate-400 font-semibold">{t('inversion_delta', language)}</div>
                <div className="my-1 sm:my-1.5 text-xl sm:text-2xl font-black font-mono text-amber-300">
                  {met.inversion_strength_c} <span className="text-xs text-slate-400">°C</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">{t('nocturnal_trapping', language)}</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 border-blue-500">
                <div className="text-[11px] sm:text-xs text-slate-400 font-semibold">{t('wind_vector', language)}</div>
                <div className="my-1 sm:my-1.5 text-lg sm:text-xl font-bold font-mono text-blue-200">{met.wind_speed_kmh} km/h</div>
                <div className="text-[10px] sm:text-[11px] text-slate-400">{met.wind_direction_cardinal} ({met.wind_direction_deg}°)</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-xl border-l-4 border-orange-500">
                <div className="text-[11px] sm:text-xs text-slate-400 font-semibold">{t('active_fires', language)}</div>
                <div className="my-1 sm:my-1.5 text-xl sm:text-2xl font-black font-mono text-orange-400">
                  {fires.total_active_fires} <span className="text-xs text-slate-400">{language === 'hi' ? 'आग' : 'fires'}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-orange-400 font-mono flex items-center justify-between">
                  <span>{t('stubble_share_label', language)}: {snapshot.source_attribution.stubble_burning}%</span>
                  {currSt?.stubble_share_ugm3 !== undefined && (
                    <span className="text-amber-300 font-mono text-[10px]">({currSt.name.split(' ')[0]}: {currSt.stubble_share_ugm3}μg)</span>
                  )}
                </div>
              </div>
            </section>

            {/* Map & Station Forecast (2-Column Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Map (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" /> {t('spatial_grid_title', language)}
                </h2>
                <span className="text-xs font-mono text-slate-400">{t('realtime_stations', language)}</span>
              </div>

              {/* Zoom Slider Controls */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const nextZoom = Math.max(1, +(mapZoom - 0.25).toFixed(2));
                    setMapZoom(nextZoom);
                    if (nextZoom <= 1) setMapPan({ x: 0, y: 0 });
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 shrink-0 cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4 text-slate-300 shrink-0" />
                </button>

                <input
                  type="range" min="1" max="3" step="0.05" value={mapZoom}
                  onChange={(e) => {
                    const z = parseFloat(e.target.value);
                    setMapZoom(z);
                    if (z <= 1) setMapPan({ x: 0, y: 0 });
                  }}
                  className="flex-1 accent-cyan-500 cursor-pointer h-2 py-1.5"
                  style={{ accentColor: '#06B6D4' }}
                />

                <button
                  type="button"
                  onClick={() => {
                    const nextZoom = Math.min(3, +(mapZoom + 0.25).toFixed(2));
                    setMapZoom(nextZoom);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 shrink-0 cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4 text-slate-300 shrink-0" />
                </button>

                <span className="text-[11px] font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 shrink-0">
                  {Math.round(mapZoom * 100)}%
                </span>

                {mapZoom > 1 && (
                  <button 
                    type="button"
                    onClick={resetZoom} 
                    className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/90 hover:bg-cyan-900 px-2.5 py-1 rounded-lg border border-cyan-800 active:scale-95 transition shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Quick Station Selection Chips Bar for Instant 1-Tap Access */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar select-none">
                <span className="text-[10px] font-bold text-slate-400 font-mono shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" /> {language === 'hi' ? 'स्टेशन:' : 'Stations:'}
                </span>
                {snapshot.stations.map((st) => {
                  const isSelected = st.station_id === selectedStationId;
                  return (
                    <button
                      key={st.station_id}
                      type="button"
                      data-station="true"
                      onClick={() => handleStationClick(st)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                      title={`Select ${st.name} (${st.aqi} AQI)`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: st.category_color }}
                      />
                      <span>{st.name.split(' ')[0]}</span>
                      <span className="font-mono text-[10px] opacity-80">({st.aqi})</span>
                    </button>
                  );
                })}
              </div>

              <div
                ref={mapContainerRef}
                className="w-full aspect-[16/10] bg-[#070B11] rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center select-none"
                style={{ 
                  cursor: mapZoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
                  touchAction: mapZoom > 1 ? 'none' : 'pan-y'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <div
                  style={{
                    transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
                    width: '100%', height: '100%'
                  }}
                >
                  <svg viewBox="0 0 800 500" className="w-full h-full select-none">
                    <defs>
                      {/* Atmospheric Dispersion Radial Gradient (Green Good Perimeter -> Red Harm Core) */}
                      <radialGradient id="delhiBasinHeatmap" cx="62%" cy="60%" r="55%" fx="62%" fy="60%">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity="0.55" />   {/* Core Severe Harm Red */}
                        <stop offset="35%" stopColor="#EA580C" stopOpacity="0.42" />  {/* Unhealthy Orange Plume */}
                        <stop offset="68%" stopColor="#CA8A04" stopOpacity="0.28" />  {/* Moderate Yellow Buffer */}
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.32" /> {/* Clean Outer Perimeter Green (Good) */}
                      </radialGradient>

                      {/* Punjab & Haryana Upwind Crop Residue Terrain Gradient */}
                      <linearGradient id="upwindTerrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#131D2E" stopOpacity="0.95" />
                        <stop offset="50%" stopColor="#1E293B" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#451A03" stopOpacity="0.85" />
                      </linearGradient>

                      {/* Aerodynamic Smoke Inflow Corridor Gradient (NW -> SE Transport) */}
                      <linearGradient id="smokeInflowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F97316" stopOpacity="0.95" />
                        <stop offset="55%" stopColor="#EF4444" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#991B1B" stopOpacity="0.3" />
                      </linearGradient>

                      {/* Yamuna River Gradient */}
                      <linearGradient id="yamunaFlowGrad" x1="0%" y1="0%" x2="40%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
                        <stop offset="50%" stopColor="#0284C7" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#0369A1" stopOpacity="0.75" />
                      </linearGradient>
                    </defs>

                    {/* Regional Geo-Grid Latitude/Longitude Guidelines */}
                    <g opacity="0.15" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3 3">
                      <line x1="40" y1="120" x2="760" y2="120" />
                      <line x1="40" y1="250" x2="760" y2="250" />
                      <line x1="40" y1="380" x2="760" y2="380" />
                      <line x1="200" y1="30" x2="200" y2="470" />
                      <line x1="400" y1="30" x2="400" y2="470" />
                      <line x1="600" y1="30" x2="600" y2="470" />
                    </g>

                    {/* ================= UPWIND AGRICULTURAL SECTOR (Punjab & Haryana) ================= */}
                    <path 
                      d="M 30 35 L 330 35 L 350 245 L 30 225 Z" 
                      fill="url(#upwindTerrainGrad)" 
                      stroke="#EA580C" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 3" 
                      opacity="0.9"
                    />
                    
                    {/* Upwind Sector Header & Stubble Fire Badge */}
                    <g transform="translate(45, 55)">
                      <rect x="0" y="0" width="220" height="22" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                      <text x="10" y="15" fill="#CBD5E1" fontSize="10.5" fontWeight="800" fontFamily="JetBrains Mono">
                        🌾 PUNJAB &amp; HARYANA UPWIND
                      </text>
                    </g>
                    
                    <g transform="translate(45, 82)">
                      <rect x="0" y="0" width="250" height="18" rx="5" fill="#7C2D12" stroke="#EA580C" strokeWidth="1" />
                      <text x="8" y="12.5" fill="#FEF08A" fontSize="9" fontWeight="800" fontFamily="JetBrains Mono">
                        🔥 NASA FIRMS: {fires?.total_active_fires || 1457} ACTIVE STUBBLE FIRES
                      </text>
                    </g>

                    {/* Glowing Stubble Hotspots (Sangrur, Bhatinda, Kaithal, Karnal) */}
                    {[
                      { name: 'Sangrur', x: 110, y: 120 },
                      { name: 'Bhatinda', x: 80, y: 170 },
                      { name: 'Kaithal', x: 200, y: 135 },
                      { name: 'Karnal', x: 275, y: 185 },
                    ].map((f, fi) => (
                      <g key={fi} transform={`translate(${f.x}, ${f.y})`}>
                        <circle r="14" fill="#EF4444" opacity="0.3" className="animate-ping" />
                        <circle r="8" fill="#EA580C" opacity="0.5" />
                        <circle r="4" fill="#FEF08A" stroke="#EF4444" strokeWidth="1.5" />
                        <text x="9" y="3.5" fill="#FDBA74" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">
                          {f.name}
                        </text>
                      </g>
                    ))}

                    {/* Wind Vector Inflow Streamlines (NW -> SE Trapping Direction) */}
                    <g opacity="0.85">
                      <path d="M 200 120 Q 320 185, 450 265" fill="none" stroke="url(#smokeInflowGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="12 8" />
                      <path d="M 230 150 Q 345 215, 475 290" fill="none" stroke="url(#smokeInflowGrad)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="10 6" />
                      <path d="M 265 180 Q 370 240, 500 315" fill="none" stroke="url(#smokeInflowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 6" />
                      
                      {/* Flow direction indicator text */}
                      <g transform="translate(265, 195) rotate(32)">
                        <rect x="-4" y="-10" width="165" height="14" rx="4" fill="#0B1320" stroke="#F97316" strokeWidth="0.8" opacity="0.9" />
                        <text x="4" y="0" fill="#FDBA74" fontSize="8" fontWeight="800" fontFamily="JetBrains Mono">
                          💨 Inflow Vector (NW 220° • {met?.wind_speed_kmh || 8.3} km/h)
                        </text>
                      </g>
                    </g>

                    {/* ================= DELHI NCR BASIN (Green Perimeter to Red Harm Core) ================= */}
                    {/* Outer Boundary with Clean Air Green Rim (Good Air Buffer) */}
                    <path 
                      d="M 370 170 C 420 145, 570 145, 620 190 C 655 235, 640 370, 595 435 C 530 470, 410 460, 360 395 C 325 330, 335 215, 370 170 Z" 
                      fill="url(#delhiBasinHeatmap)" 
                      stroke="#10B981" 
                      strokeWidth="2.5" 
                      opacity="0.95"
                    />

                    {/* Basin Title */}
                    <g transform="translate(435, 175)">
                      <rect x="0" y="0" width="140" height="20" rx="5" fill="#0F172A" stroke="#06B6D4" strokeWidth="1" />
                      <text x="12" y="14" fill="#38BDF8" fontSize="11" fontWeight="900" fontFamily="JetBrains Mono">
                        DELHI NCR BASIN
                      </text>
                    </g>

                    {/* Core Atmospheric Trapping Plume (Red/Crimson Harm Hotspot) */}
                    <ellipse 
                      cx="495" 
                      cy="295" 
                      rx="105" 
                      ry="72" 
                      fill="#EF4444" 
                      fillOpacity="0.25" 
                      stroke="#EF4444" 
                      strokeWidth="1.5" 
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                    
                    <g transform="translate(415, 245)">
                      <rect x="0" y="0" width="160" height="15" rx="4" fill="#450A0A" stroke="#EF4444" strokeWidth="0.8" opacity="0.9" />
                      <text x="7" y="10.5" fill="#FCA5A5" fontSize="7.5" fontWeight="800" fontFamily="JetBrains Mono">
                        🔴 SEVERE AIR TRAPPING CORE (300+)
                      </text>
                    </g>

                    {/* Clean Air Perimeter Indicator (Green for Good) */}
                    <g transform="translate(345, 435)">
                      <rect x="0" y="0" width="155" height="15" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="0.8" opacity="0.9" />
                      <text x="6" y="10.5" fill="#6EE7B7" fontSize="7.5" fontWeight="800" fontFamily="JetBrains Mono">
                        🟢 Clean Ridge Perimeter (&lt;100)
                      </text>
                    </g>

                    {/* Serpentine Yamuna River Course */}
                    <path 
                      d="M 475 140 Q 484 195 489 240 Q 498 295 515 350 Q 532 405 548 460" 
                      stroke="url(#yamunaFlowGrad)" 
                      strokeWidth="4" 
                      fill="none" 
                      opacity="0.85" 
                      strokeLinecap="round" 
                    />
                    <path 
                      d="M 475 140 Q 484 195 489 240 Q 498 295 515 350 Q 532 405 548 460" 
                      stroke="#E0F2FE" 
                      strokeWidth="1.2" 
                      fill="none" 
                      opacity="0.9" 
                      strokeLinecap="round" 
                    />
                    <text x="524" y="375" fill="#38BDF8" fontSize="8" fontStyle="italic" fontWeight="800" fontFamily="JetBrains Mono">
                      Yamuna River
                    </text>

                    {/* Floating Color Legend Bar (Green for Good, Red for Harm) */}
                    <g transform="translate(25, 440)">
                      <rect x="0" y="0" width="280" height="28" rx="7" fill="#0B1320" stroke="#334155" strokeWidth="1" opacity="0.92" />
                      <text x="8" y="12" fill="#94A3B8" fontSize="7.5" fontWeight="800" fontFamily="JetBrains Mono">
                        AIR QUALITY LEVEL KEY:
                      </text>
                      <g transform="translate(8, 17)">
                        <circle cx="4" cy="4" r="3.5" fill="#10B981" />
                        <text x="11" y="6.5" fill="#10B981" fontSize="7" fontWeight="bold">Good</text>

                        <circle cx="48" cy="4" r="3.5" fill="#EAB308" />
                        <text x="55" y="6.5" fill="#EAB308" fontSize="7" fontWeight="bold">Moderate</text>

                        <circle cx="106" cy="4" r="3.5" fill="#F97316" />
                        <text x="113" y="6.5" fill="#F97316" fontSize="7" fontWeight="bold">Poor</text>

                        <circle cx="150" cy="4" r="3.5" fill="#EF4444" />
                        <text x="157" y="6.5" fill="#EF4444" fontSize="7" fontWeight="bold">Severe (Harm)</text>

                        <circle cx="225" cy="4" r="3.5" fill="#7F1D1D" />
                        <text x="232" y="6.5" fill="#F87171" fontSize="7" fontWeight="bold">Hazard</text>
                      </g>
                    </g>

                    {/* Station Markers */}
                    {snapshot.stations.map((s) => {
                      const x = 380 + ((s.lon - 76.8) / 0.7) * 200;
                      const y = 180 + ((29.0 - s.lat) / 0.7) * 220;
                      const isSel = s.station_id === selectedStationId;
                      return (
                        <g 
                          key={s.station_id} 
                          data-station="true"
                          transform={`translate(${x}, ${y})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStationClick(s);
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            handleStationClick(s);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Giant transparent touch target (r=32) so fingers can easily tap on mobile */}
                          <circle r="32" fill="transparent" pointerEvents="all" data-station="true" />
                          {isSel && (
                            <>
                              <circle r="26" fill={s.category_color} opacity="0.3" className="animate-ping" pointerEvents="none" />
                              <circle r="22" fill={s.category_color} opacity="0.25" stroke="#FFFFFF" strokeWidth="1.5" pointerEvents="none" />
                            </>
                          )}
                          <circle 
                            r={isSel ? 16 : 11.5} 
                            fill={s.category_color} 
                            stroke="#FFFFFF" 
                            strokeWidth={isSel ? 2.5 : 1.5} 
                            opacity="0.95"
                            pointerEvents="none"
                          />
                          <text 
                            x="0" y="3.5" 
                            textAnchor="middle" 
                            fill="#FFFFFF" 
                            fontSize={isSel ? 9.5 : 8} 
                            fontWeight="900" 
                            fontFamily="JetBrains Mono"
                            pointerEvents="none"
                          >
                            {s.aqi}
                          </text>
                          <g transform={`translate(0, ${isSel ? -21 : -16})`} pointerEvents="none">
                            <rect 
                              x={-s.name.split(' ')[0].length * 3.4 - 4} 
                              y="-7.5" 
                              width={s.name.split(' ')[0].length * 6.8 + 8} 
                              height="12" 
                              rx="3" 
                              fill="#070E18" 
                              stroke={isSel ? '#22D3EE' : '#334155'} 
                              strokeWidth={isSel ? 1.4 : 0.7}
                              opacity="0.92"
                            />
                            <text 
                              x="0" y="1.5" 
                              textAnchor="middle" 
                              fill={isSel ? '#38BDF8' : '#F1F5F9'} 
                              fontSize="8" 
                              fontWeight="800"
                            >
                              {s.name.split(' ')[0]}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* User's Live GPS Pin on Delhi-NCR Spatial Grid */}
                    {userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number' && (
                      (() => {
                        const ux = 380 + ((userLocation.lon - 76.8) / 0.7) * 200;
                        const uy = 180 + ((29.0 - userLocation.lat) / 0.7) * 220;
                        return (
                          <g transform={`translate(${ux}, ${uy})`} className="cursor-pointer">
                            {/* Animated Pulse Rings */}
                            <circle r="26" fill="#06B6D4" opacity="0.3" className="animate-ping" />
                            <circle r="15" fill="#06B6D4" opacity="0.45" />
                            <circle r="7.5" fill="#22D3EE" stroke="#FFFFFF" strokeWidth="2.5" />
                            {/* Pin Label */}
                            <g transform="translate(0, -20)">
                              <rect x="-35" y="-12" width="70" height="17" rx="5" fill="#07121A" stroke="#22D3EE" strokeWidth="1.2" />
                              <text x="0" y="0" textAnchor="middle" fill="#22D3EE" fontSize="7.5" fontWeight="900" fontFamily="JetBrains Mono">
                                📍 YOU ({userLocation.distanceKm}km)
                              </text>
                            </g>
                          </g>
                        );
                      })()
                    )}
                  </svg>
                </div>

                {/* Floating On-Screen D-Pad Pan Buttons for effortless mobile sliding */}
                {mapZoom > 1 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-cyan-800/60 z-20 shadow-xl">
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, x: p.x + 50 })); }} 
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-center text-xs font-bold active:scale-90 border border-slate-800 cursor-pointer"
                      title="Slide Left">◀</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, y: p.y + 50 })); }} 
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-center text-xs font-bold active:scale-90 border border-slate-800 cursor-pointer"
                      title="Slide Up">▲</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, y: p.y - 50 })); }} 
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-center text-xs font-bold active:scale-90 border border-slate-800 cursor-pointer"
                      title="Slide Down">▼</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, x: p.x - 50 })); }} 
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 flex items-center justify-center text-xs font-bold active:scale-90 border border-slate-800 cursor-pointer"
                      title="Slide Right">▶</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); resetZoom(); }} 
                      className="px-2 h-7 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700 text-[11px] font-bold active:scale-90 flex items-center justify-center cursor-pointer">
                      100%
                    </button>
                  </div>
                )}

                {/* Mobile Touch Pan Hint */}
                {mapZoom > 1 && (
                  <div className="absolute bottom-2 right-2 text-[10px] text-cyan-300 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-cyan-800/60 shadow-md font-medium pointer-events-none flex items-center gap-1">
                    <span>👆 {language === 'hi' ? 'खिसकाने के लिए स्वाइप करें' : 'Swipe to slide map'}</span>
                  </div>
                )}
              </div>

              {/* Station Flyout */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-cyan-400 font-mono">{currSt.station_id}</span> • <span className="font-bold text-white">{currSt.name}</span>
                  <div className="text-slate-400 mt-0.5">{currSt.region} • {currSt.city}</div>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <div>AQI: <b style={{ color: currSt.category_color }}>{currSt.aqi}</b></div>
                  <div>PM2.5: <b className="text-slate-200">{currSt.pm25}</b></div>
                  <div>Stubble: <b className="text-orange-400">{currSt.stubble_share_ugm3} μg/m³</b></div>
                </div>
                <button
                  onClick={() => setStationModal(currSt)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 text-xs font-semibold transition flex items-center gap-1">
                  Full Detail <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Forecast & Attribution (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <StationForecastCard 
                stationFc={stationFc}
                selectedStationId={selectedStationId}
                stations={snapshot?.stations || []}
                onSelectStation={handleSelectAndScrollStation}
                language={language}
                theme={theme}
              />

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-orange-400" /> {t('source_apportionment', language)}
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { name: t('source_stubble', language), pct: snapshot.source_attribution.stubble_burning, color: "#F97316" },
                    { name: t('source_vehicles', language), pct: snapshot.source_attribution.vehicular_emissions, color: "#EF4444" },
                    { name: t('source_dust', language), pct: snapshot.source_attribution.road_construction_dust, color: "#EAB308" },
                    { name: t('source_industry', language), pct: snapshot.source_attribution.industrial_energy, color: "#8B5CF6" },
                    { name: t('source_domestic', language), pct: snapshot.source_attribution.secondary_and_domestic, color: "#06B6D4" },
                  ].map(item => (
                    <div key={item.name} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{item.name}</span>
                        <span className="font-mono font-bold" style={{ color: item.color }}>{item.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ==================== PREDICTIVE GRAP TAB ==================== */}
        {activeTab === 'grap' && grapData && (
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">THE CORE SIH INNOVATION</span>
                <h2 className="text-xl font-bold text-white mt-1">Predictive Graded Response Action Plan Engine</h2>
                <p className="text-xs text-slate-400 mt-0.5">Forecast-triggered interventions giving 24-72 hours of pre-emptive lead time.</p>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">MAX LEAD TIME GAINED</div>
                <div className="text-2xl font-black text-cyan-400">{grapData.max_lead_time_gained_hours} Hours</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="p-3">Stage & Severity</th>
                    <th className="p-3">Target Sector</th>
                    <th className="p-3">Forecast Lead Time</th>
                    <th className="p-3">Triggered Action</th>
                    <th className="p-3">Responsible Agency</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {grapData.rules.map(r => (
                    <tr key={r.id} className={`hover:bg-slate-800/40 ${r.is_triggered ? 'bg-cyan-950/20' : ''}`}>
                      <td className="p-3">
                        <div className="font-bold text-slate-200">{r.stage}</div>
                        <div className="text-[10px] text-slate-400 font-mono">AQI {r.aqi_min}-{r.aqi_max}</div>
                      </td>
                      <td className="p-3 text-slate-300">{r.target_sector}</td>
                      <td className="p-3 font-mono font-bold text-cyan-400">+{r.forecast_lead_time_hours} Hours Lead</td>
                      <td className="p-3 text-slate-300 max-w-md">{r.triggered_action}</td>
                      <td className="p-3 font-semibold text-slate-300">{r.responsible_agency}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                          r.status_type === 'PRE_EMPTIVE' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                          r.status_type === 'ACTIVE' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== DISPATCHES TAB ==================== */}
        {activeTab === 'dispatches' && dispatches && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">LIVE MULTI-AGENCY DISPATCH</span>
                <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" /> Stakeholder Action Dispatch Center
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Role-specific pre-emptive orders dispatched to all agencies based on 72h forecast.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">T-Hour {currentStep} of 167</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">{snapshot.category} — AQI {snapshot.delhi_ncr_avg_aqi}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dispatches.dispatches && dispatches.dispatches.map((d, i) => {
                const icons = {
                  'ROLE_AGRI': <Leaf className="w-5 h-5" />,
                  'ROLE_POLICE': <AlertTriangle className="w-5 h-5" />,
                  'ROLE_INDUSTRY': <Building2 className="w-5 h-5" />,
                  'ROLE_SCHOOLS': <GraduationCap className="w-5 h-5" />,
                  'ROLE_HOSPITALS': <Heart className="w-5 h-5" />,
                  'ROLE_CITIZENS': <Users className="w-5 h-5" />,
                  'ROLE_MCD': <Truck className="w-5 h-5" />,
                };
                const urgColors = {
                  'EMERGENCY': { 
                    card: 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 shadow-sm',
                    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold',
                    icon: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-slate-950 border border-rose-200 dark:border-slate-800'
                  },
                  'CRITICAL': { 
                    card: 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-orange-500 shadow-sm',
                    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold',
                    icon: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-slate-950 border border-orange-200 dark:border-slate-800'
                  },
                  'HIGH': { 
                    card: 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm',
                    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold',
                    icon: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-slate-950 border border-amber-200 dark:border-slate-800'
                  },
                  'MODERATE': { 
                    card: 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 border-l-4 border-l-cyan-500 shadow-sm',
                    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 font-bold',
                    icon: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-slate-950 border border-cyan-200 dark:border-slate-800'
                  },
                };
                const urg = d.urgency || 'HIGH';
                const clr = urgColors[urg] || urgColors['HIGH'];
                return (
                  <div 
                    key={i} 
                    onClick={() => {
                      sound.playTap();
                      setActiveDispatchModal(d);
                    }}
                    className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${clr.card}`}
                    title="Tap to open executive dispatch order"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${clr.icon}`}>
                          {icons[d.role_id] || <Send className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{d.role_id}</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{d.role_label || d.agency}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${clr.badge}`}>{urg}</span>
                        <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5">
                          Open Order ↗
                        </span>
                      </div>
                    </div>

                    {/* Actions list */}
                    <div className="flex flex-col gap-1.5">
                      {(d.action_items || d.actions || d.orders || [d.action]).filter(Boolean).map((action, j) => (
                        <div key={j} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono border-t border-slate-200 dark:border-slate-800 pt-2">
                      <span>{d.deadline ? `⏰ Deadline: ${d.deadline}` : '⚡ 72h Pre-emptive Lead'}</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold underline decoration-dotted">
                        {language === 'hi' ? 'आदेश विवरण ↗' : 'View Protocol ↗'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Fallback if dispatches.dispatches is not an array */}
              {!dispatches.dispatches && (
                <div className="col-span-full">
                  <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                    <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono overflow-auto">{JSON.stringify(dispatches, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== WHAT-IF SIM TAB ==================== */}
        {activeTab === 'whatif' && (
          <div className="flex flex-col gap-5">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800">COUNTERFACTUAL POLICY SIMULATOR</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" /> What-If Policy Impact Simulator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adjust intervention sliders to see real-time AQI reduction projections.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Sliders */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Policy Intervention Controls</h3>
                {[
                  { label: 'Stubble Burning Reduction', val: stubbleVal, set: setStubbleVal, color: '#F97316', hint: 'Punjab/Haryana farm fire suppression' },
                  { label: 'Truck & Heavy Vehicle Bypass', val: truckVal, set: setTruckVal, color: '#EF4444', hint: 'EPE/WPE rerouting enforcement' },
                  { label: 'Dust Suppression (Misting)', val: dustVal, set: setDustVal, color: '#EAB308', hint: 'Anti-smog gun deployment' },
                  { label: 'Industrial Stack Switchover', val: industryVal, set: setIndustryVal, color: '#8B5CF6', hint: 'Cleaner fuel mandate compliance' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.label}</span>
                      <span className="font-mono font-bold" style={{ color: s.color }}>{s.val}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={s.val}
                      onChange={(e) => {
                        sound.playSlider();
                        s.set(parseInt(e.target.value));
                      }}
                      className="w-full cursor-pointer"
                      style={{ accentColor: s.color }}
                    />
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.hint}</div>
                  </div>
                ))}
              </div>

              {/* Results */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {whatIfData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 text-center shadow-sm">
                        <div className="text-xs text-rose-700 dark:text-rose-400 font-mono font-bold uppercase">Baseline AQI (No Action)</div>
                        <div className="text-4xl font-black font-mono text-rose-600 dark:text-rose-300 my-2">{whatIfData.baseline_peak_aqi}</div>
                        <div className="text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700 inline-block">{whatIfData.baseline_category}</div>
                      </div>
                      <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-center shadow-sm">
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold uppercase">Mitigated AQI (With Policy)</div>
                        <div className="text-4xl font-black font-mono text-emerald-600 dark:text-emerald-300 my-2">{whatIfData.mitigated_peak_aqi}</div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 inline-block">{whatIfData.mitigated_category}</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">AQI Reduction Breakdown</span>
                        <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">-{whatIfData.aqi_reduction} AQI</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Stubble Reduction Impact', val: whatIfData.stubble_reduction_impact, color: '#F97316' },
                          { label: 'Truck Bypass Impact', val: whatIfData.truck_reduction_impact, color: '#EF4444' },
                          { label: 'Dust Suppression Impact', val: whatIfData.dust_reduction_impact, color: '#EAB308' },
                          { label: 'Industry Switchover Impact', val: whatIfData.industry_reduction_impact, color: '#8B5CF6' },
                        ].filter(x => x.val !== undefined).map(item => (
                          <div key={item.label} className="text-xs">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-slate-700 dark:text-slate-400 font-medium">{item.label}</span>
                              <span className="font-mono font-bold" style={{ color: item.color }}>-{item.val} AQI</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(item.val * 2, 100)}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {whatIfData.policy_verdict && (
                      <div className="bg-emerald-50/80 dark:bg-slate-900/80 border border-emerald-300 dark:border-emerald-800/50 rounded-2xl p-4 shadow-sm">
                        <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 mb-1">POLICY VERDICT</div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{whatIfData.policy_verdict}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading simulation...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== INTER-STATE GRID TAB ==================== */}
        {activeTab === 'interstate' && interstate && (
          <div className="flex flex-col gap-5">
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">CROSS-STATE COORDINATION</span>
              <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-sky-400" /> Inter-State Early Warning Grid
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-xs text-slate-400">Multi-state command matrix: Delhi, Punjab, Haryana, UP, Rajasthan</p>
                <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  Wind: {interstate.wind_vector}
                </span>
                <span className="text-xs font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  {interstate.inversion_status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {interstate.states && interstate.states.map((state, i) => {
                const urgClr = {
                  'EMERGENCY': { ring: 'border-rose-600', badge: 'bg-rose-950 text-rose-300 border-rose-700', icon: '🆘' },
                  'CRITICAL': { ring: 'border-orange-600', badge: 'bg-orange-950 text-orange-300 border-orange-700', icon: '🚨' },
                  'HIGH': { ring: 'border-amber-600', badge: 'bg-amber-950 text-amber-300 border-amber-700', icon: '⚠️' },
                  'ELEVATED': { ring: 'border-cyan-700', badge: 'bg-cyan-950 text-cyan-300 border-cyan-800', icon: '📡' },
                  'MODERATE': { ring: 'border-slate-700', badge: 'bg-slate-800 text-slate-300 border-slate-700', icon: '✅' },
                  'LOW': { ring: 'border-emerald-800', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800', icon: '🟢' },
                }[state.coordination_urgency] || { ring: 'border-slate-700', badge: 'bg-slate-800 text-slate-300 border-slate-700', icon: '📋' };

                return (
                  <div key={i} className={`bg-slate-900/80 border-2 ${urgClr.ring} rounded-2xl p-4 flex flex-col gap-3`}>
                    {/* State Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-slate-400 font-mono">{state.role}</div>
                        <div className="text-base font-bold text-white mt-0.5">{state.state}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgClr.badge} flex items-center gap-1`}>
                        {urgClr.icon} {state.coordination_urgency}
                      </span>
                    </div>

                    {/* Status + Forecast Risk */}
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">Current Status</span>
                        <div className="text-slate-200 font-medium mt-0.5">{state.current_status}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950 border border-amber-800/50">
                        <span className="text-amber-400 text-[10px] uppercase font-mono">Forecast Risk</span>
                        <div className="text-amber-200 font-medium mt-0.5">{state.forecast_risk}</div>
                      </div>
                    </div>

                    {/* Active Mandates */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono mb-1.5">Active Mandates</div>
                      <div className="flex flex-col gap-1">
                        {state.active_mandates.map((m, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-xs text-slate-300">
                            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ==================== STATION DETAIL MODAL ==================== */}
      {stationModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setStationModal(null); }}>
          <div className="bg-[#0B1320] border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-black/80 flex flex-col gap-4 animate-[fadeIn_0.2s_ease]">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg font-mono text-white"
                  style={{ backgroundColor: stationModal.category_color + '33', border: `2px solid ${stationModal.category_color}` }}>
                  {stationModal.aqi}
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-400">{stationModal.station_id}</div>
                  <div className="text-lg font-bold text-white">{stationModal.name}</div>
                  <div className="text-xs text-slate-400">{stationModal.region} • {stationModal.city}</div>
                </div>
              </div>
              <button onClick={() => setStationModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AQI Badge */}
            <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: stationModal.category_color + '15', border: `1px solid ${stationModal.category_color}55` }}>
              <div className="text-5xl font-black font-mono my-1" style={{ color: stationModal.category_color }}>{stationModal.aqi}</div>
              <div className="text-sm font-bold" style={{ color: stationModal.category_color }}>{stationModal.category}</div>
            </div>

            {/* Pollutant Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'PM2.5', val: stationModal.pm25, unit: 'μg/m³', color: '#F97316' },
                { label: 'PM10', val: stationModal.pm10, unit: 'μg/m³', color: '#EAB308' },
                { label: 'NO₂', val: stationModal.no2, unit: 'ppb', color: '#8B5CF6' },
                { label: 'SO₂', val: stationModal.so2, unit: 'ppb', color: '#EC4899' },
                { label: 'CO', val: stationModal.co, unit: 'ppm', color: '#06B6D4' },
                { label: 'O₃', val: stationModal.o3, unit: 'ppb', color: '#10B981' },
              ].map(p => (
                <div key={p.label} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 font-mono">{p.label}</div>
                  <div className="text-lg font-black font-mono" style={{ color: p.color }}>{p.val ?? '--'}</div>
                  <div className="text-[9px] text-slate-500">{p.unit}</div>
                </div>
              ))}
            </div>

            {/* Stubble Share */}
            <div className="p-3 rounded-2xl bg-orange-950/30 border border-orange-800/60">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-orange-200">Stubble Burning Contribution</span>
                </div>
                <span className="font-mono font-black text-orange-300">{stationModal.stubble_share_ugm3} μg/m³</span>
              </div>
              {stationModal.stubble_share_pct !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${stationModal.stubble_share_pct}%` }} />
                  </div>
                  <div className="text-[10px] text-orange-400 font-mono mt-0.5">{stationModal.stubble_share_pct}% of total PM2.5</div>
                </div>
              )}
            </div>

            {/* Forecast button */}
            <button
              type="button"
              onClick={() => { 
                const sid = stationModal.station_id;
                setStationModal(null);
                handleSelectAndScrollStation(sid);
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-cyan-900/40"
            >
              <TrendingUp className="w-4 h-4" /> View 72h Forecast for {stationModal.name}
            </button>
          </div>
        </div>
      )}

      {/* ==================== OFFICIAL DISPATCH TRANSMISSION MODAL ==================== */}
      {activeDispatchModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveDispatchModal(null); }}
        >
          <div className="bg-[#0B1320] border border-slate-700 dark:border-cyan-800/80 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl shadow-black/90 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {activeDispatchModal.role_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeDispatchModal.urgency === 'EMERGENCY' ? 'bg-rose-900 text-rose-300 border border-rose-700' :
                      activeDispatchModal.urgency === 'CRITICAL'  ? 'bg-orange-900 text-orange-300 border border-orange-700' :
                      activeDispatchModal.urgency === 'HIGH'      ? 'bg-amber-900 text-amber-300 border border-amber-700' :
                                                                   'bg-cyan-900 text-cyan-300 border border-cyan-700'
                    }`}>
                      {activeDispatchModal.urgency} PROTOCOL
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {activeDispatchModal.role_label || activeDispatchModal.agency}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {activeDispatchModal.role_name || activeDispatchModal.description}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveDispatchModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gov-to-Gov Transmission Channel */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">TRANSMISSION GATEWAY:</span>
                <span className="text-cyan-400 font-bold">{activeDispatchModal.mock_payload?.channel || 'National Disaster Alert (Gov-to-Gov Gateway)'}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">RECIPIENT AUTHORITY:</span>
                <span className="text-slate-200 font-semibold">{activeDispatchModal.mock_payload?.recipient || activeDispatchModal.agency}</span>
              </div>
              {activeDispatchModal.mock_payload?.subject && (
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-cyan-300 text-[11px] leading-relaxed">
                  📌 {activeDispatchModal.mock_payload.subject}
                </div>
              )}
            </div>

            {/* Atmospheric Meteorological Evidence */}
            {snapshot?.meteorology && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  Coupled Atmospheric Forecast Evidence (72h Lead Time)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Ventilation</div>
                    <div className="text-sm font-bold text-cyan-300 font-mono">{snapshot.meteorology.ventilation_index_m2s || 1420} m²/s</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Inversion</div>
                    <div className="text-sm font-bold text-amber-300 font-mono">{snapshot.meteorology.inversion_strength_c || 4.2} °C</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Wind Vector</div>
                    <div className="text-sm font-bold text-blue-300 font-mono">{snapshot.meteorology.wind_speed_kmh || 8.3} km/h</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-mono">Active Fires</div>
                    <div className="text-sm font-bold text-orange-400 font-mono">{snapshot.nasa_firms?.total_active_fires || 1457}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Mandatory Action Items / Orders */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Mandatory Directives ({ (activeDispatchModal.action_items || activeDispatchModal.actions || []).length } Tasks)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Pre-Emptive Protocol Active</span>
              </div>
              <div className="flex flex-col gap-2">
                {(activeDispatchModal.action_items || activeDispatchModal.actions || activeDispatchModal.orders || [activeDispatchModal.action]).filter(Boolean).map((act, k) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed shadow-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Directive Body */}
            {activeDispatchModal.mock_payload?.body && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
                <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Official Dispatch Body:</div>
                {activeDispatchModal.mock_payload.body}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  alert(language === 'hi' ? 'आदेश सफलतापूर्वक ट्रांसमिट और अभिस्वीकृत हो गया!' : 'Dispatch Order Acknowledged & Transmitted to Agency Command Center!');
                  setActiveDispatchModal(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-cyan-900/40"
              >
                <Send className="w-4 h-4" /> {language === 'hi' ? 'आदेश ट्रांसमिट करें (Acknowledge)' : 'Acknowledge & Transmit Dispatch'}
              </button>
              <button
                type="button"
                onClick={() => setActiveDispatchModal(null)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== MOBILE & TABLET BOTTOM NAVIGATION DOCK (Animated Floating Dock) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07121A]/95 border-t border-cyan-800/40 backdrop-blur-2xl px-1 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] safe-area-pb">
        <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-md mx-auto">
          
          {/* Tab 1: Overview */}
          <button
            type="button"
            onClick={() => switchTab('overview')}
            className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-90 ${
              activeTab === 'overview' && !isAiOpen 
                ? 'text-cyan-300 font-bold bg-gradient-to-b from-cyan-950/80 to-slate-900/70 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/80 border border-transparent hover:border-cyan-800/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            }`}
          >
            <div className="relative">
              <LayoutDashboard className="w-5 h-5 mb-0.5 transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 text-cyan-400 group-hover:text-cyan-300" />
              {activeTab === 'overview' && !isAiOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"></span>
              )}
            </div>
            <span className="text-[9px] font-semibold tracking-tight transition-all duration-200 group-hover:tracking-normal text-center truncate max-w-full px-1">{t('tab_overview', language)}</span>
          </button>

          {/* Tab 2: GRAP */}
          <button
            type="button"
            onClick={() => switchTab('grap')}
            className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-90 ${
              activeTab === 'grap' && !isAiOpen 
                ? 'text-cyan-300 font-bold bg-gradient-to-b from-cyan-950/80 to-slate-900/70 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/80 border border-transparent hover:border-cyan-800/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            }`}
          >
            <div className="relative">
              <ShieldAlert className="w-5 h-5 mb-0.5 transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 text-cyan-400 group-hover:text-cyan-300" />
              {activeTab === 'grap' && !isAiOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"></span>
              )}
            </div>
            <span className="text-[9px] font-semibold tracking-tight transition-all duration-200 group-hover:tracking-normal text-center truncate max-w-full px-1">{t('tab_grap', language)}</span>
          </button>

          {/* Tab 3: CENTER PROMINENT VAYUAI COPILOT (MATHEMATICALLY CENTERED AT 50% WIDTH) */}
          <div className="flex flex-col items-center justify-center w-full">
            <button
              type="button"
              onClick={openAi}
              className="relative -top-4 flex flex-col items-center justify-center group active:scale-90 transition-all duration-300 cursor-pointer"
            >
              {/* Pulsing Ambient Aurora Glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-3xl blur-md opacity-75 group-hover:opacity-100 group-hover:scale-115 transition-all duration-300 animate-pulse -z-10"></div>
              
              <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-500/50 border-2 border-white/95 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
                <Bot className="w-6 h-6 stroke-[2.5] transition-transform duration-300 group-hover:scale-115" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950"></span>
              </div>
              <span className="text-[10px] font-black text-cyan-300 mt-1 tracking-wider uppercase group-hover:text-white transition-colors flex items-center gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                VayuAI
              </span>
            </button>
          </div>

          {/* Tab 4: What-If */}
          <button
            type="button"
            onClick={() => switchTab('whatif')}
            className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-90 ${
              activeTab === 'whatif' && !isAiOpen 
                ? 'text-indigo-300 font-bold bg-gradient-to-b from-indigo-950/80 to-slate-900/70 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.35)]' 
                : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900/80 border border-transparent hover:border-indigo-800/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]'
            }`}
          >
            <div className="relative">
              <Sliders className="w-5 h-5 mb-0.5 transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 text-indigo-400 group-hover:text-indigo-300" />
              {activeTab === 'whatif' && !isAiOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8]"></span>
              )}
            </div>
            <span className="text-[9px] font-semibold tracking-tight transition-all duration-200 group-hover:tracking-normal text-center truncate max-w-full px-1">{t('tab_whatif', language)}</span>
          </button>

          {/* Tab 5: Dispatches */}
          <button
            type="button"
            onClick={() => switchTab('dispatches')}
            className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-90 ${
              activeTab === 'dispatches' && !isAiOpen 
                ? 'text-amber-300 font-bold bg-gradient-to-b from-amber-950/80 to-slate-900/70 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]' 
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900/80 border border-transparent hover:border-amber-800/50 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
          >
            <div className="relative">
              <Send className="w-5 h-5 mb-0.5 transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 text-amber-400 group-hover:text-amber-300" />
              {activeTab === 'dispatches' && !isAiOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></span>
              )}
            </div>
            <span className="text-[9px] font-semibold tracking-tight transition-all duration-200 group-hover:tracking-normal text-center truncate max-w-full px-1">{t('tab_dispatches', language)}</span>
          </button>

        </div>
      </nav>

      {/* Floating / Full-Screen VayuAI Copilot Assistant */}
      <VayuAIChat 
        currentStep={currentStep} 
        snapshot={snapshot} 
        userLocation={userLocation}
        onSelectStation={handleSelectAndScrollStation}
        language={language}
        theme={theme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isAiOpen}
        onToggleOpen={setIsAiOpen}
      />

      {/* System Settings Modal (Theme & Language) */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        theme={theme} 
        setTheme={setTheme}
        language={language} 
        setLanguage={setLanguage}
      />
    </div>
  );
}
