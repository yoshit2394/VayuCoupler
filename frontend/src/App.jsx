import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, ShieldAlert, Send, Sliders, GitMerge, LayoutDashboard, 
  RotateCcw, Play, Pause, Activity, Gauge, Layers, Thermometer, 
  Compass, Flame, MapPin, TrendingUp, PieChart, CheckCircle, Radio,
  ZoomIn, ZoomOut, X, AlertTriangle, Building2, Truck, GraduationCap,
  Heart, Users, Leaf, AlertCircle, ArrowRight, ChevronDown, ChevronRight, Settings,
  Bot, Sparkles, Navigation, Crosshair
} from 'lucide-react';
import { 
  fetchStations, fetchSnapshot, fetchStationForecast, 
  fetchGrapTriggers, fetchDispatches, fetchInterstateGrid, runWhatIfSimulation,
  getInterpolatedSnapshot
} from './services/api';
import offlineBundle from './data/offline_bundle.json';
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
  const [checkedDispatchTasks, setCheckedDispatchTasks] = useState({});
  const [activeInterstateModal, setActiveInterstateModal] = useState(null);

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
  const bannerTimerRef = useRef(null);

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

  const [snapshot, setSnapshot] = useState(() => getInterpolatedSnapshot(72));
  const [stationFc, setStationFc] = useState(() => offlineBundle?.stations_forecast?.['DEL001_72'] || null);
  const [grapData, setGrapData] = useState(() => offlineBundle?.steps?.['72']?.grap || null);
  const [dispatches, setDispatches] = useState(() => offlineBundle?.steps?.['72']?.dispatches || null);
  const [interstate, setInterstate] = useState(() => offlineBundle?.steps?.['72']?.interstate || null);
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

  // Auto-detect user's live GPS location on startup & automatically set local station (runs once)
  useEffect(() => {
    let isMounted = true;
    // Delay slightly to let snapshot load first
    const initTimer = setTimeout(() => {
      if (hasRequestedLocation.current) return;
      hasRequestedLocation.current = true;

      const stations = getInterpolatedSnapshot(72)?.stations || [];
      requestUserLocation(stations).then((loc) => {
        if (!isMounted) return;
        if (loc.success && loc.closestStation) {
          setUserLocation(loc);
          setLocationStatus('detected');
          setSelectedStationId(loc.closestStation.station_id);
          if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
          setLocationBannerVisible(false);
          requestAnimationFrame(() => {
            setLocationBannerVisible(true);
            sound.playTap();
            bannerTimerRef.current = setTimeout(() => {
              if (isMounted) setLocationBannerVisible(false);
            }, 3500);
          });
        } else {
          setLocationStatus('denied');
        }
      });
    }, 800);

    return () => { isMounted = false; clearTimeout(initTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDetectLocation = async () => {
    setLocationStatus('detecting');
    sound.playTap();
    // Cancel any existing auto-dismiss timer
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    // Force-hide banner first so it re-mounts fresh (fixes re-trigger bug)
    setLocationBannerVisible(false);
    const loc = await requestUserLocation(snapshot?.stations || []);
    if (loc.success && loc.closestStation) {
      setUserLocation(loc);
      setLocationStatus('detected');
      setSelectedStationId(loc.closestStation.station_id);
      // Small delay to ensure React unmounts old banner before showing new one
      requestAnimationFrame(() => {
        setLocationBannerVisible(true);
        bannerTimerRef.current = setTimeout(() => setLocationBannerVisible(false), 3500);
      });
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

  const activeSnapshot = snapshot || safeSnapshot;
  const met = activeSnapshot?.meteorology || {};
  const fires = activeSnapshot?.stubble_burning || {};
  const currSt = activeSnapshot?.stations?.find(s => s.station_id === selectedStationId) || activeSnapshot?.stations?.[0] || {
    station_id: 'DEL001',
    name: 'Mandir Marg',
    aqi: 285,
    category: 'Poor',
    category_color: '#F97316',
    pm25: 128
  };

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
    <div className="min-h-screen bg-[#050912] text-slate-100 flex flex-col font-sans">
      
      {/* ===== TOP NAVIGATION ===== */}
      <header className="sticky top-0 z-50 bg-[#030608]/95 backdrop-blur-2xl border-b border-cyan-500/10 px-4 md:px-6 py-2.5 md:py-3 safe-area-pt shadow-[0_4px_40px_rgba(0,0,0,0.6),0_1px_0_rgba(0,240,255,0.06)]">
        {/* Desktop Navbar */}
        <div className="hidden md:flex max-w-[1720px] mx-auto items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00F0FF]/80 via-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.45)] border border-[#00F0FF]/40 orb-glow">
              <Wind className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-mono shadow-[0_0_10px_rgba(0,240,255,0.2)] tracking-widest">
                  SIH26082 • MoES
                </span>
                <span className="text-xs text-slate-400 font-medium tracking-wide">Delhi NCR Coupled Forecasting System</span>
              </div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight flex items-center gap-2.5 mt-0.5" style={{color:'#e2f8ff'}}>
                Air Pollution–Weather Coupled Early Warning System
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00FF88] bg-[#00FF88]/10 px-2.5 py-0.5 rounded-full border border-[#00FF88]/35 shadow-[0_0_16px_rgba(0,255,136,0.3)] font-mono tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF88]"></span>
                  </span>
                  PREDICTIVE GRAP ACTIVE
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <nav className="flex items-center bg-[#050912]/90 p-1 rounded-2xl border border-cyan-500/12 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl">
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
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer font-mono tracking-wide ${
                    activeTab === tab.id
                      ? 'text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/40 font-bold shadow-[0_0_14px_rgba(0,240,255,0.18)] drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>

            {/* Live GPS Location Button with Pulsating Beacon */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer active:scale-95 backdrop-blur-xl font-mono tracking-wide ${
                userLocation 
                  ? 'bg-[#00F0FF]/08 hover:bg-[#00F0FF]/12 text-[#00F0FF] border-[#00F0FF]/40 shadow-[0_0_16px_rgba(0,240,255,0.18)]'
                  : 'bg-white/4 hover:bg-white/8 text-slate-400 hover:text-slate-200 border-white/8'
              }`}
              title={userLocation ? `Live Station: ${userLocation.closestStation.name} (${userLocation.distanceKm} km)` : "Detect My Location"}
            >
              <div className="relative flex items-center justify-center">
                <Navigation className={`w-3.5 h-3.5 ${userLocation ? 'text-[#00F0FF]' : 'text-slate-400'} ${locationStatus === 'detecting' ? 'animate-spin' : ''}`} />
                {userLocation && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00FF88]"></span>
                  </span>
                )}
              </div>
              {userLocation ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{userLocation.closestStation.name.split(' ')[0]}</span>
                  <span className="text-[#00F0FF]/80 text-[11px]">({userLocation.distanceKm}km)</span>
                </span>
              ) : (
                <span>{locationStatus === 'detecting' ? 'Detecting...' : (language === 'hi' ? 'मेरी लोकेशन' : 'Detect Location')}</span>
              )}
            </button>

            {/* Desktop Local Station AQI Pill */}
            <button
              type="button"
              onClick={() => handleSelectAndScrollStation(currSt.station_id)}
              className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono transition cursor-pointer active:scale-95 shadow-sm backdrop-blur-md"
              style={{
                backgroundColor: (currSt?.category_color || snapshot.category_color) + '1f',
                color: currSt?.category_color || snapshot.category_color,
                borderColor: (currSt?.category_color || snapshot.category_color) + '55',
                boxShadow: `0 0 12px ${(currSt?.category_color || snapshot.category_color)}20`
              }}
              title={`Selected Station: ${currSt?.name} • AQI ${currSt?.aqi}`}
            >
              <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ backgroundColor: currSt?.category_color || snapshot.category_color }}></span>
              <span>{currSt?.name?.split(' ')[0]}: AQI {currSt?.aqi ?? snapshot.delhi_ncr_avg_aqi}</span>
            </button>

            {/* Settings Trigger Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/4 hover:bg-white/8 text-slate-400 hover:text-[#00F0FF] border border-white/8 hover:border-[#00F0FF]/30 flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 font-mono tracking-wide"
              title="System Preferences (Theme & Language)"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('settings_btn', language)}</span>
            </button>
          </div>
        </div>

        {/* Mobile Native App Bar */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00F0FF]/70 via-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(0,240,255,0.4)] border border-[#00F0FF]/35">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight" style={{color:'#e2f8ff'}}>VayuCoupler</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 font-mono tracking-widest">MoES</span>
              </div>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider">DELHI-NCR COUPLED AQI</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Live GPS Location Button / Badge */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold active:scale-95 transition backdrop-blur-xl font-mono ${
                userLocation 
                  ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
              title="Detect My Location"
            >
              <Navigation className={`w-3 h-3 ${userLocation ? 'text-[#00F0FF]' : 'text-slate-400'} ${locationStatus === 'detecting' ? 'animate-spin' : ''}`} />
              {userLocation ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse"></span>
                  <span className="truncate max-w-[85px] font-bold text-white">{userLocation.closestStation.name.split(' ')[0]}</span>
                  <span className="text-[9px] text-[#00F0FF]/80">({userLocation.distanceKm}km)</span>
                </span>
              ) : (
                <span className="text-[9px]">{locationStatus === 'detecting' ? 'GPS...' : (language === 'hi' ? 'लोकेशन' : 'GPS')}</span>
              )}
            </button>

            <button 
              type="button"
              onClick={() => handleSelectAndScrollStation(currSt.station_id)}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border active:scale-95 transition cursor-pointer"
              style={{
                backgroundColor: (currSt?.category_color || snapshot.category_color) + '22',
                color: currSt?.category_color || snapshot.category_color,
                borderColor: (currSt?.category_color || snapshot.category_color) + '66'
              }}
              title={`Local Station: ${currSt?.name} • AQI ${currSt?.aqi}`}
            >
              AQI {currSt?.aqi ?? snapshot.delhi_ncr_avg_aqi}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-[#00F0FF] border border-white/8 active:scale-95 transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
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
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-2xl p-3 flex flex-col gap-2 max-w-md w-[94%] cursor-pointer active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-top-3 hud-corners"
          style={{
            background:'linear-gradient(135deg,rgba(0,240,255,0.08),rgba(0,255,136,0.05))',
            backdropFilter:'blur(28px)',
            border:'1px solid rgba(0,240,255,0.35)',
            boxShadow:'0 8px 40px rgba(0,0,0,0.7),0 0 30px rgba(0,240,255,0.12)'
          }}
          title="Click to view forecast for your local station"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:'rgba(0,240,255,0.12)',border:'1px solid rgba(0,240,255,0.45)',boxShadow:'0 0 14px rgba(0,240,255,0.3)'}}>
              <Navigation className="w-4 h-4 text-[#00F0FF] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate font-mono">
                <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></span>
                <span>{language === 'hi' ? 'आपकी लाइव लोकेशन सेट हो गई है' : 'Local Air Quality Set to Your Location'}</span>
              </div>
              <div className="text-[11px] font-mono truncate mt-0.5" style={{color:'rgba(0,240,255,0.8)'}}>
                {userLocation.closestStation.name} • {userLocation.distanceKm} km away • AQI {userLocation.closestStation.aqi}
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocationBannerVisible(false);
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer active:scale-95 transition"
              title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Auto-dismiss timer bar */}
          <div className="w-full h-0.5 rounded-full overflow-hidden" style={{background:'rgba(0,240,255,0.08)'}}>
            <div className="h-full rounded-full animate-[shrinkWidth_3.5s_linear_forwards]" style={{ width: '100%', background:'linear-gradient(90deg,#00F0FF,#00FF88)' }} />
          </div>
        </div>
      )}

      {/* ===== TIME SCRUBBER (Simplified 7-Day Forecast Timeline) ===== */}
      <section className="border-b border-cyan-500/8 px-4 sm:px-6 py-3" style={{background:'rgba(3,6,8,0.96)',backdropFilter:'blur(20px)'}}>
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-4">
          
          {/* Play/Pause & Simple Day Badge */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button 
              onClick={togglePlay}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer font-mono"
              style={{background:'rgba(0,240,255,0.15)',border:'1px solid rgba(0,240,255,0.4)',boxShadow:'0 0 14px rgba(0,240,255,0.2)',color:'#00F0FF'}}
              title={isPlaying ? "Pause Timeline" : "Play 7-Day Forecast"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <span className="font-bold" style={{color:'#00F0FF'}}>
                📅 {t('scrubber_day', language)} {Math.min(7, Math.max(1, Math.floor(currentStep / 24) + 1))}
              </span>
              <span className="text-slate-500 text-[10px]">({currentStep}h)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                currentStep >= 144 ? 'text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30' :
                currentStep >= 96  ? 'text-[#FF2E54] bg-[#FF2E54]/10 border border-[#FF2E54]/30' :
                currentStep >= 48  ? 'text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/30' :
                                     'text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/30'
              }`}>
                {currentStep >= 144 ? t('scrubber_badge_relief', language) :
                 currentStep >= 96  ? t('scrubber_badge_peak', language) :
                 currentStep >= 48  ? t('scrubber_badge_alert', language) : t('scrubber_badge_normal', language)}
              </span>
            </div>
          </div>

          {/* Slider & Simple Milestone Labels */}
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-500 px-0.5 tracking-wider uppercase">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] inline-block"></span>
                {t('scrubber_d1', language)}
              </span>
              <span className="flex items-center gap-1" style={{color:'#FFB800'}}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{backgroundColor:'#FFB800'}}></span>
                {t('scrubber_d3', language)}
              </span>
              <span className="font-bold flex items-center gap-1" style={{color:'#FF2E54'}}>
                <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{backgroundColor:'#FF2E54'}}></span>
                {t('scrubber_d5', language)}
              </span>
              <span className="flex items-center gap-1" style={{color:'#00FF88'}}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{backgroundColor:'#00FF88'}}></span>
                {t('scrubber_d7', language)}
              </span>
            </div>
            <input 
              type="range" min="0" max="167" value={currentStep}
              onChange={(e) => {
                sound.playSlider();
                setCurrentStep(parseInt(e.target.value));
              }}
              className="w-full cursor-pointer h-2 rounded-lg appearance-none"
              style={{ accentColor: '#00F0FF' }}
            />
          </div>

          {/* Simple 4 Quick Day Buttons */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 shrink-0 text-xs w-full md:w-auto">
            <button 
              type="button"
              onClick={() => changeStep(24)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-mono font-semibold tracking-wide ${
                currentStep <= 36 
                  ? 'text-[#00F0FF] border-[#00F0FF]/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                  : 'text-slate-500 border-white/8 hover:text-slate-300 hover:border-white/15'
              }`}
              style={currentStep <= 36 ? {background:'rgba(0,240,255,0.10)'} : {background:'rgba(255,255,255,0.03)'}}
            >
              {t('scrubber_btn_d1', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(72)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-mono font-semibold tracking-wide ${
                currentStep >= 48 && currentStep <= 84 
                  ? 'border-[#FFB800]/50 shadow-[0_0_10px_rgba(255,184,0,0.2)]' 
                  : 'text-slate-500 border-white/8 hover:text-slate-300 hover:border-white/15'
              }`}
              style={currentStep >= 48 && currentStep <= 84 ? {background:'rgba(255,184,0,0.10)',color:'#FFB800'} : {background:'rgba(255,255,255,0.03)'}}
            >
              {t('scrubber_btn_d3', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(120)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-mono font-bold tracking-wide ${
                currentStep >= 96 && currentStep <= 132 
                  ? 'border-[#FF2E54]/50 shadow-[0_0_10px_rgba(255,46,84,0.2)]' 
                  : 'text-slate-500 border-white/8 hover:text-slate-300 hover:border-white/15'
              }`}
              style={currentStep >= 96 && currentStep <= 132 ? {background:'rgba(255,46,84,0.10)',color:'#FF2E54'} : {background:'rgba(255,255,255,0.03)'}}
            >
              {t('scrubber_btn_d5', language)}
            </button>
            <button 
              type="button"
              onClick={() => changeStep(156)} 
              className={`px-2.5 py-1.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-[11px] font-mono font-semibold tracking-wide ${
                currentStep >= 144 
                  ? 'border-[#00FF88]/50 shadow-[0_0_10px_rgba(0,255,136,0.2)]' 
                  : 'text-slate-500 border-white/8 hover:text-slate-300 hover:border-white/15'
              }`}
              style={currentStep >= 144 ? {background:'rgba(0,255,136,0.10)',color:'#00FF88'} : {background:'rgba(255,255,255,0.03)'}}
            >
              {t('scrubber_btn_d7', language)}
            </button>
          </div>

        </div>
      </section>

      {/* ===== MAIN CONTENT TABS ===== */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3.5 md:p-6 pb-28 md:pb-8 flex flex-col gap-6" style={{background:'transparent'}}>

        {/* ==================== OVERVIEW / COMMAND CENTER TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5 md:gap-6">

            {/* 6 Key Atmospheric Coupling Telemetry HUD Cards */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Local Station Hero AQI */}
              <div 
                onClick={() => handleSelectAndScrollStation(currSt.station_id)}
                className="glass-pod hud-corners p-4 rounded-2xl cursor-pointer select-none relative overflow-hidden flex flex-col justify-between card-interactive border-l-4" 
                style={{ borderLeftColor: currSt?.category_color || snapshot.category_color }}
                title={`Click to view 72h Coupled Forecast for ${currSt?.name}`}
              >
                <div className="text-xs font-semibold flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 font-bold truncate max-w-[140px] font-mono tracking-wider uppercase text-[10px]" style={{color:'#00F0FF'}}>
                    <MapPin className="w-3.5 h-3.5 shrink-0 animate-pulse" style={{color:'#00F0FF'}} />
                    <span className="truncate">{currSt?.name?.toUpperCase()}</span>
                  </span>
                  {userLocation ? (
                    <span className="text-[10px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0" style={{color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)'}}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor:'#00FF88'}}></span>
                      <span>{userLocation.distanceKm} km</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">{t('local_aqi', language)}</span>
                  )}
                </div>

                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight drop-shadow-[0_0_10px_currentColor]" style={{ color: currSt?.category_color || '#FFFFFF' }}>
                    {currSt?.aqi}
                  </span>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono tracking-widest uppercase border" 
                    style={{ 
                      backgroundColor: (currSt?.category_color || '#FBBF24') + '22', 
                      color: currSt?.category_color || '#FBBF24',
                      borderColor: (currSt?.category_color || '#FBBF24') + '55'
                    }}
                  >
                    {language === 'hi' 
                      ? (currSt?.category === 'Severe' ? 'गंभीर' : currSt?.category === 'Very Poor' ? 'बहुत खराब' : currSt?.category === 'Poor' ? 'खराब' : currSt?.category === 'Moderate' ? 'मध्यम' : currSt?.category === 'Satisfactory' ? 'संतोषजनक' : 'अच्छा')
                      : currSt?.category}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono pt-1.5" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <span>PM2.5: <b className="text-slate-300 font-bold">{currSt?.pm25}</b> <span className="text-[9px] text-slate-600">μg/m³</span></span>
                  <span>NCR: <b style={{color:'#00F0FF'}}>{snapshot.delhi_ncr_avg_aqi}</b></span>
                </div>
              </div>

              {/* Card 2: Ventilation Index */}
              <div className="glass-pod hud-corners p-4 rounded-2xl flex flex-col justify-between border-l-4 border-l-[#00F0FF] card-interactive">
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-between" style={{color:'#00F0FF'}}>
                  <span>{t('ventilation_idx', language)}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#00F0FF',boxShadow:'0 0 6px #00F0FF'}}></span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" style={{color:'#00F0FF'}}>
                  {met.ventilation_index_m2s} <span className="text-xs text-slate-500 font-sans font-medium">m²/s</span>
                </div>
                <div className={`text-[10px] font-mono pt-1.5 flex items-center gap-1 uppercase tracking-wider font-semibold`} style={{borderTop:'1px solid rgba(255,255,255,0.06)',color: met.ventilation_index_m2s < 2000 ? '#FF2E54' : '#00FF88'}}>
                  <span>{met.ventilation_index_m2s < 2000 ? '⚠' : '✓'}</span>
                  <span className="truncate">{language === 'hi' ? 'गंभीर ट्रैपिंग (<1200 m²/s)' : met.ventilation_status}</span>
                </div>
              </div>

              {/* Card 3: Boundary Layer Height (PBLH) */}
              <div className="glass-pod hud-corners p-4 rounded-2xl flex flex-col justify-between border-l-4 border-l-violet-500 card-interactive">
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-between text-slate-400">
                  <span>{t('pblh_height', language)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80" style={{boxShadow:'0 0 5px rgba(167,139,250,0.6)'}}></span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black font-mono text-violet-300 tracking-tight drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                  {met.boundary_layer_height_m} <span className="text-xs text-slate-500 font-sans font-medium">m</span>
                </div>
                <div className="text-[10px] text-violet-300/80 font-mono pt-1.5 truncate uppercase tracking-wider" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  {met.boundary_layer_height_m < 500 ? t('severe_trapping', language) : t('normal_dispersion', language)}
                </div>
              </div>

              {/* Card 4: Temperature Inversion */}
              <div className="glass-pod hud-corners p-4 rounded-2xl flex flex-col justify-between border-l-4 card-interactive" style={{borderLeftColor:'#FFB800'}}>
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-between text-slate-400">
                  <span>{t('inversion_delta', language)}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#FFB800',boxShadow:'0 0 5px #FFB800'}}></span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]" style={{color:'#FFB800'}}>
                  {met.inversion_strength_c} <span className="text-xs text-slate-500 font-sans font-medium">°C</span>
                </div>
                <div className="text-[10px] font-mono pt-1.5 truncate uppercase tracking-wider" style={{borderTop:'1px solid rgba(255,255,255,0.06)',color:'rgba(255,184,0,0.8)'}}>
                  {t('nocturnal_trapping', language)}
                </div>
              </div>

              {/* Card 5: Wind Vector */}
              <div className="glass-pod hud-corners p-4 rounded-2xl flex flex-col justify-between border-l-4 border-l-blue-400 card-interactive">
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-between text-slate-400">
                  <span>{t('wind_vector', language)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{boxShadow:'0 0 5px rgba(96,165,250,0.7)'}}></span>
                </div>
                <div className="my-2 text-xl sm:text-2xl font-black font-mono text-blue-300 tracking-tight drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]">
                  {met.wind_speed_kmh} <span className="text-xs text-slate-500 font-sans font-medium">km/h</span>
                </div>
                <div className="text-[10px] text-blue-300/80 font-mono pt-1.5 truncate uppercase tracking-wider" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  {met.wind_direction_cardinal} ({met.wind_direction_deg}°)
                </div>
              </div>

              {/* Card 6: Stubble Fires */}
              <div className="glass-pod hud-corners p-4 rounded-2xl flex flex-col justify-between border-l-4 card-interactive" style={{borderLeftColor:'#F97316'}}>
                <div className="text-[10px] font-mono tracking-widest uppercase flex items-center justify-between text-slate-400">
                  <span>{t('active_fires', language)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{boxShadow:'0 0 6px rgba(249,115,22,0.8)'}}></span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black font-mono text-orange-400 tracking-tight drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
                  {fires.total_active_fires} <span className="text-xs text-slate-500 font-sans font-medium">{language === 'hi' ? 'आग' : 'fires'}</span>
                </div>
                <div className="text-[10px] text-orange-300/80 font-mono flex items-center justify-between pt-1.5 uppercase tracking-wider" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <span>{t('stubble_share_label', language)}: <b>{snapshot.source_attribution.stubble_burning}%</b></span>
                  {currSt?.stubble_share_ugm3 !== undefined && (
                    <span className="text-[9px] text-orange-400/70">({currSt.name.split(' ')[0]}: {currSt.stubble_share_ugm3}μg)</span>
                  )}
                </div>
              </div>
            </section>

            {/* Map & Station Forecast (2-Column Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Map (7 Cols) */}
            <div className="lg:col-span-7 glass-pod hud-corners p-5 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3" style={{borderBottom:'1px solid rgba(0,240,255,0.1)'}}>
                <h2 className="text-base font-bold flex items-center gap-2 font-mono tracking-wider" style={{color:'#e2f8ff'}}>
                  <MapPin className="w-5 h-5" style={{color:'#00F0FF'}} /> {t('spatial_grid_title', language)}
                </h2>
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">{t('realtime_stations', language)}</span>
              </div>

              {/* Zoom Slider Controls */}
              <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2.5 rounded-xl" style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(0,240,255,0.10)'}}>
                <button
                  type="button"
                  onClick={() => {
                    const nextZoom = Math.max(1, +(mapZoom - 0.25).toFixed(2));
                    setMapZoom(nextZoom);
                    if (nextZoom <= 1) setMapPan({ x: 0, y: 0 });
                  }}
                  className="p-1.5 rounded-lg active:scale-95 shrink-0 cursor-pointer transition"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8'}}
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4 shrink-0" />
                </button>

                <input
                  type="range" min="1" max="3" step="0.05" value={mapZoom}
                  onChange={(e) => {
                    const z = parseFloat(e.target.value);
                    setMapZoom(z);
                    if (z <= 1) setMapPan({ x: 0, y: 0 });
                  }}
                  className="flex-1 cursor-pointer h-2 py-1.5 rounded-lg appearance-none"
                  style={{ accentColor: '#00F0FF' }}
                />

                <button
                  type="button"
                  onClick={() => {
                    const nextZoom = Math.min(3, +(mapZoom + 0.25).toFixed(2));
                    setMapZoom(nextZoom);
                  }}
                  className="p-1.5 rounded-lg active:scale-95 shrink-0 cursor-pointer transition"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8'}}
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4 shrink-0" />
                </button>

                <span className="text-[11px] font-mono font-bold px-2 py-1 rounded shrink-0" style={{color:'#00F0FF',background:'rgba(0,240,255,0.08)',border:'1px solid rgba(0,240,255,0.25)'}}>
                  {Math.round(mapZoom * 100)}%
                </span>

                {mapZoom > 1 && (
                  <button 
                    type="button"
                    onClick={resetZoom} 
                    className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition shrink-0 cursor-pointer"
                    style={{color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)'}}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Quick Station Selection Chips Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar select-none">
                <span className="text-[10px] font-bold text-slate-500 font-mono shrink-0 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3" style={{color:'#00F0FF'}} /> {language === 'hi' ? 'स्टेशन:' : 'STN:'}
                </span>
                {snapshot.stations.map((st) => {
                  const isSelected = st.station_id === selectedStationId;
                  return (
                    <button
                      key={st.station_id}
                      type="button"
                      data-station="true"
                      onClick={() => handleStationClick(st)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer border tracking-wide`}
                      style={isSelected ? {
                        background:'rgba(0,240,255,0.12)',
                        color:'#00F0FF',
                        border:'1px solid rgba(0,240,255,0.45)',
                        boxShadow:'0 0 12px rgba(0,240,255,0.18)'
                      } : {
                        background:'rgba(255,255,255,0.03)',
                        color:'#94a3b8',
                        border:'1px solid rgba(255,255,255,0.07)'
                      }}
                      title={`Select ${st.name} (${st.aqi} AQI)`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: st.category_color, boxShadow:`0 0 5px ${st.category_color}` }}
                      />
                      <span>{st.name.split(' ')[0]}</span>
                      <span className="text-[9px] opacity-70">({st.aqi})</span>
                    </button>
                  );
                })}
              </div>

              <div
                ref={mapContainerRef}
                className="w-full aspect-[16/10] rounded-xl relative overflow-hidden flex items-center justify-center select-none hud-scanline"
                style={{
                  background: '#040810',
                  border: '1px solid rgba(0,240,255,0.15)',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6),0 0 20px rgba(0,240,255,0.05)',
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
                        <circle r="12" fill="#EF4444" opacity="0.35" className="animate-pulse" />
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
                              <circle r="24" fill={s.category_color} opacity="0.35" className="animate-pulse" pointerEvents="none" />
                              <circle r="20" fill={s.category_color} opacity="0.25" stroke="#FFFFFF" strokeWidth="1.5" pointerEvents="none" />
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
                            <circle r="22" fill="#06B6D4" opacity="0.35" className="animate-pulse" />
                            <circle r="14" fill="#06B6D4" opacity="0.45" />
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

                {/* Floating On-Screen D-Pad Pan Buttons */}
                {mapZoom > 1 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 p-1 rounded-xl z-20 shadow-xl backdrop-blur-xl" style={{background:'rgba(3,6,8,0.92)',border:'1px solid rgba(0,240,255,0.25)'}}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, x: p.x + 50 })); }} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold active:scale-90 cursor-pointer transition" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.20)'}}
                      title="Slide Left">◀</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, y: p.y + 50 })); }} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold active:scale-90 cursor-pointer transition" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.20)'}}
                      title="Slide Up">▲</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, y: p.y - 50 })); }} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold active:scale-90 cursor-pointer transition" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.20)'}}
                      title="Slide Down">▼</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setMapPan(p => ({ ...p, x: p.x - 50 })); }} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold active:scale-90 cursor-pointer transition" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.20)'}}
                      title="Slide Right">▶</button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); resetZoom(); }} 
                      className="px-2 h-7 rounded-lg text-[11px] font-mono font-bold active:scale-90 flex items-center justify-center cursor-pointer transition" style={{background:'rgba(0,240,255,0.12)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.35)'}}>
                      100%
                    </button>
                  </div>
                )}

                {/* Mobile Touch Pan Hint */}
                {mapZoom > 1 && (
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono pointer-events-none flex items-center gap-1 px-2.5 py-1 rounded-lg backdrop-blur-xl" style={{color:'#00F0FF',background:'rgba(0,240,255,0.08)',border:'1px solid rgba(0,240,255,0.20)'}}>
                    <span>👆 {language === 'hi' ? 'खिसकाने के लिए स्वाइप करें' : 'Swipe to slide map'}</span>
                  </div>
                )}
              </div>

              {/* Station Flyout */}
              <div className="mt-4 p-3 rounded-xl flex items-center justify-between text-xs font-mono" style={{background:'rgba(0,0,0,0.5)',border:'1px solid rgba(0,240,255,0.12)'}}>
                <div>
                  <span className="font-bold font-mono" style={{color:'#00F0FF'}}>{currSt.station_id}</span> <span className="text-slate-500">•</span> <span className="font-bold" style={{color:'#e2f8ff'}}>{currSt.name}</span>
                  <div className="text-slate-500 mt-0.5 uppercase tracking-wider text-[10px]">{currSt.region} • {currSt.city}</div>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <div className="text-slate-400">AQI: <b style={{ color: currSt.category_color }}>{currSt.aqi}</b></div>
                  <div className="text-slate-400">PM2.5: <b className="text-slate-200">{currSt.pm25}</b></div>
                  <div className="text-slate-400">Stubble: <b className="text-orange-400">{currSt.stubble_share_ugm3} μg/m³</b></div>
                </div>
                <button
                  onClick={() => setStationModal(currSt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1 active:scale-95"
                  style={{color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)'}}>
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

              <div className="glass-pod hud-corners p-5 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3" style={{borderBottom:'1px solid rgba(0,240,255,0.10)'}}>
                  <h2 className="text-base font-bold flex items-center gap-2 font-mono tracking-wider" style={{color:'#e2f8ff'}}>
                    <PieChart className="w-5 h-5 text-orange-400" /> {t('source_apportionment', language)}
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { name: t('source_stubble', language), pct: snapshot.source_attribution.stubble_burning, color: "#F97316" },
                    { name: t('source_vehicles', language), pct: snapshot.source_attribution.vehicular_emissions, color: "#FF2E54" },
                    { name: t('source_dust', language), pct: snapshot.source_attribution.road_construction_dust, color: "#FFB800" },
                    { name: t('source_industry', language), pct: snapshot.source_attribution.industrial_energy, color: "#A855F7" },
                    { name: t('source_domestic', language), pct: snapshot.source_attribution.secondary_and_domestic, color: "#00F0FF" },
                  ].map(item => (
                    <div key={item.name} className="p-2.5 rounded-xl text-xs" style={{background:'rgba(0,0,0,0.35)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-semibold tracking-wide text-slate-300 text-[10px] uppercase">{item.name}</span>
                        <span className="font-mono font-black text-sm" style={{ color: item.color, textShadow:`0 0 8px ${item.color}80` }}>{item.pct}%</span>
                      </div>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.pct}%`, backgroundColor: item.color, boxShadow:`0 0 6px ${item.color}` }} />
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
          <div className="glass-pod hud-corners p-6 rounded-2xl">
            <div className="flex items-center justify-between pb-4 mb-4" style={{borderBottom:'1px solid rgba(0,240,255,0.10)'}}>
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded tracking-widest uppercase" style={{color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)'}}>THE CORE SIH INNOVATION</span>
                <h2 className="text-xl font-bold mt-1 font-mono tracking-tight" style={{color:'#e2f8ff'}}>Predictive Graded Response Action Plan Engine</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">Forecast-triggered interventions giving 24-72 hours of pre-emptive lead time.</p>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-500 tracking-widest uppercase">MAX LEAD TIME GAINED</div>
                <div className="text-2xl font-black" style={{color:'#00F0FF',textShadow:'0 0 16px rgba(0,240,255,0.5)'}}>{grapData.max_lead_time_gained_hours} Hours</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="font-mono text-[10px] uppercase tracking-widest" style={{background:'rgba(0,0,0,0.5)',color:'#475569'}}>
                  <tr>
                    <th className="p-3">Stage & Severity</th>
                    <th className="p-3">Target Sector</th>
                    <th className="p-3">Forecast Lead Time</th>
                    <th className="p-3">Triggered Action</th>
                    <th className="p-3">Responsible Agency</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody style={{divideColor:'rgba(255,255,255,0.05)'}}>
                  {grapData.rules.map(r => (
                    <tr key={r.id} className={`transition-colors ${
                      r.is_triggered 
                        ? 'bg-[#00F0FF]/04' 
                        : 'hover:bg-white/02'
                    }`} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <td className="p-3">
                        <div className="font-bold text-slate-200 font-mono">{r.stage}</div>
                        <div className="text-[10px] text-slate-500 font-mono tracking-wider">AQI {r.aqi_min}-{r.aqi_max}</div>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{r.target_sector}</td>
                      <td className="p-3 font-mono font-bold" style={{color:'#00F0FF'}}>+{r.forecast_lead_time_hours} Hours Lead</td>
                      <td className="p-3 text-slate-400 max-w-md font-mono">{r.triggered_action}</td>
                      <td className="p-3 font-mono font-semibold text-slate-400">{r.responsible_agency}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                          r.status_type === 'PRE_EMPTIVE' 
                            ? '' 
                            : r.status_type === 'ACTIVE' 
                              ? '' 
                              : ''
                        }`} style={
                          r.status_type === 'PRE_EMPTIVE' 
                            ? {color:'#00F0FF',background:'rgba(0,240,255,0.12)',border:'1px solid rgba(0,240,255,0.35)'} 
                            : r.status_type === 'ACTIVE' 
                              ? {color:'#FF2E54',background:'rgba(255,46,84,0.12)',border:'1px solid rgba(255,46,84,0.35)'} 
                              : {color:'#64748b',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.10)'}
                        }>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                    LIVE MULTI-AGENCY DISPATCH
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                    6 Coordinated Agencies
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" /> Stakeholder Action Dispatch Center
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-emptive directives dispatched with 72h lead time. Tap any agency card to view the official protocol & evidence.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <div className="text-xs text-slate-400 font-mono">T-Hour {currentStep} of 167</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">{snapshot.category} — AQI {snapshot.delhi_ncr_avg_aqi}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dispatches.dispatches && dispatches.dispatches.map((d, i) => {
                const icons = {
                  'ROLE_AGRI': <Leaf className="w-4 h-4" />,
                  'ROLE_POLICE': <AlertTriangle className="w-4 h-4" />,
                  'ROLE_INDUSTRY': <Building2 className="w-4 h-4" />,
                  'ROLE_SCHOOLS': <GraduationCap className="w-4 h-4" />,
                  'ROLE_HOSPITALS': <Heart className="w-4 h-4" />,
                  'ROLE_CITIZENS': <Users className="w-4 h-4" />,
                  'ROLE_MCD': <Truck className="w-4 h-4" />,
                };
                const urgColors = {
                  'EMERGENCY': { 
                    card: 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-rose-500/80 border-l-4 border-l-rose-500 shadow-rose-950/20',
                    badge: 'bg-rose-950 text-rose-300 border border-rose-800 font-bold',
                    icon: 'text-rose-400 bg-rose-950/60 border border-rose-900/70',
                    dot: 'bg-rose-400 animate-pulse'
                  },
                  'CRITICAL': { 
                    card: 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-orange-500/80 border-l-4 border-l-orange-500 shadow-orange-950/20',
                    badge: 'bg-orange-950 text-orange-300 border border-orange-800 font-bold',
                    icon: 'text-orange-400 bg-orange-950/60 border border-orange-900/70',
                    dot: 'bg-orange-400 animate-pulse'
                  },
                  'HIGH': { 
                    card: 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-amber-500/80 border-l-4 border-l-amber-500 shadow-amber-950/20',
                    badge: 'bg-amber-950 text-amber-300 border border-amber-800 font-bold',
                    icon: 'text-amber-400 bg-amber-950/60 border border-amber-900/70',
                    dot: 'bg-amber-400'
                  },
                  'MODERATE': { 
                    card: 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-cyan-500/80 border-l-4 border-l-cyan-500 shadow-cyan-950/20',
                    badge: 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold',
                    icon: 'text-cyan-400 bg-cyan-950/60 border border-cyan-900/70',
                    dot: 'bg-cyan-400'
                  },
                };
                const urg = d.urgency || 'HIGH';
                const clr = urgColors[urg] || urgColors['HIGH'];
                const allActions = (d.action_items || d.actions || d.orders || [d.action]).filter(Boolean);
                const actionCount = allActions.length;

                return (
                  <div 
                    key={i} 
                    onClick={() => {
                      sound.playModalOpen();
                      setActiveDispatchModal(d);
                    }}
                    className={`group rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer card-interactive hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] animate-subtle-up ${clr.card}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    title="Tap to inspect full official directives, action checklist & coupled atmospheric evidence"
                  >
                    {/* Top Executive Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${clr.icon}`}>
                          {icons[d.role_id] || <Send className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold text-slate-400 tracking-wider truncate uppercase">
                            {d.role_id}
                          </div>
                          <div className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {d.role_label || d.agency}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 tracking-wide font-mono flex items-center gap-1 ${clr.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${clr.dot}`}></span>
                        {urg}
                      </span>
                    </div>

                    {/* Bottom Status & Clean Trigger */}
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2.5 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold text-[10px]">
                          <CheckCircle className="w-3 h-3 text-cyan-400" />
                          {actionCount} {language === 'hi' ? 'आदेश' : 'Orders'}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • ⚡ 72h Pre-emptive Lead
                        </span>
                      </div>
                      <span className="text-cyan-400 group-hover:text-cyan-300 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-all">
                        {language === 'hi' ? 'आदेश देखें' : 'View Protocol'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Fallback if dispatches.dispatches is not an array */}
              {!dispatches.dispatches && (
                <div className="col-span-full">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    No active dispatches available for this time step.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== WHAT-IF SIM TAB ==================== */}
        {activeTab === 'whatif' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-md border border-purple-700/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  COUNTERFACTUAL POLICY SIMULATOR
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1.5 flex items-center gap-2.5 tracking-tight">
                  <Sliders className="w-5 h-5 text-purple-400" /> What-If Policy Impact Simulator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Adjust intervention sliders to calculate real-time aerosol dispersion & AQI reduction projections.</p>
              </div>
              <div className="sm:text-right font-mono">
                <span className="text-[11px] text-slate-400">Atmospheric Episode: <b>T+{currentStep}h</b></span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Sliders Card */}
              <div className="lg:col-span-2 bg-[#0F172A]/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 flex flex-col gap-5 shadow-xl hover:border-slate-700 transition-all duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-bold text-white tracking-wide">Policy Intervention Controls</h3>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/70 px-2 py-0.5 rounded border border-purple-800/50">4 Active Levers</span>
                </div>
                {[
                  { label: 'Stubble Burning Reduction', val: stubbleVal, set: setStubbleVal, color: '#F97316', hint: 'Punjab/Haryana farm fire suppression via ex-situ baling' },
                  { label: 'Truck & Heavy Vehicle Bypass', val: truckVal, set: setTruckVal, color: '#EF4444', hint: 'Eastern/Western Peripheral Expressway rerouting' },
                  { label: 'Dust Suppression (Misting)', val: dustVal, set: setDustVal, color: '#EAB308', hint: 'Anti-smog gun deployment & mechanized road washing' },
                  { label: 'Industrial Stack Switchover', val: industryVal, set: setIndustryVal, color: '#8B5CF6', hint: 'PNG/cleaner fuel mandate compliance in industrial hubs' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 transition hover:border-slate-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{s.label}</span>
                      <span className="font-mono font-extrabold px-2 py-0.5 rounded-md border text-xs" style={{ color: s.color, backgroundColor: `${s.color}15`, borderColor: `${s.color}40` }}>
                        {s.val}%
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={s.val}
                      onChange={(e) => {
                        sound.playSlider();
                        s.set(parseInt(e.target.value));
                      }}
                      className="w-full cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none transition"
                      style={{ accentColor: s.color }}
                    />
                    <div className="text-[10px] text-slate-400 leading-tight">{s.hint}</div>
                  </div>
                ))}
              </div>

              {/* Results Column */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {whatIfData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-rose-500/5 border-2 border-rose-500/30 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden backdrop-blur-md">
                        <div className="text-xs text-rose-400 font-mono font-bold tracking-wider uppercase">Baseline AQI (No Action)</div>
                        <div className="text-4xl sm:text-5xl font-black font-mono text-rose-400 my-2.5 tracking-tight">{whatIfData.baseline_peak_aqi}</div>
                        <div className="text-xs font-bold text-rose-300 bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/30 inline-block font-mono">
                          {whatIfData.baseline_category}
                        </div>
                      </div>
                      <div className="bg-emerald-500/5 border-2 border-emerald-500/30 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden backdrop-blur-md">
                        <div className="text-xs text-emerald-400 font-mono font-bold tracking-wider uppercase">Mitigated AQI (With Policy)</div>
                        <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 my-2.5 tracking-tight">{whatIfData.mitigated_peak_aqi}</div>
                        <div className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 inline-block font-mono">
                          {whatIfData.mitigated_category}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0F172A]/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                        <span className="text-sm font-bold text-white tracking-wide">AQI Reduction Breakdown</span>
                        <span className="text-lg font-black text-cyan-400 font-mono bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-800/60">
                          -{whatIfData.aqi_reduction} AQI
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {[
                          { label: 'Stubble Reduction Impact', val: whatIfData.stubble_reduction_impact, color: '#F97316' },
                          { label: 'Truck Bypass Impact', val: whatIfData.truck_reduction_impact, color: '#EF4444' },
                          { label: 'Dust Suppression Impact', val: whatIfData.dust_reduction_impact, color: '#EAB308' },
                          { label: 'Industry Switchover Impact', val: whatIfData.industry_reduction_impact, color: '#8B5CF6' },
                        ].filter(x => x.val !== undefined).map(item => (
                          <div key={item.label} className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-slate-300 font-medium">{item.label}</span>
                              <span className="font-mono font-bold" style={{ color: item.color }}>-{item.val} AQI</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                              <div className="h-full rounded-full transition-all duration-500 shadow-sm" style={{ width: `${Math.min(item.val * 2, 100)}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {whatIfData.policy_verdict && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4.5 shadow-xl backdrop-blur-md">
                        <div className="text-xs font-mono font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> POLICY VERDICT
                        </div>
                        <p className="text-sm text-slate-100 font-semibold leading-relaxed">{whatIfData.policy_verdict}</p>
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
                  'EMERGENCY': { ring: 'border-rose-600/80', badge: 'bg-rose-950 text-rose-300 border-rose-700', icon: '🆘' },
                  'CRITICAL': { ring: 'border-orange-600/80', badge: 'bg-orange-950 text-orange-300 border-orange-700', icon: '🚨' },
                  'HIGH': { ring: 'border-amber-600/80', badge: 'bg-amber-950 text-amber-300 border-amber-700', icon: '⚠️' },
                  'ELEVATED': { ring: 'border-cyan-700/80', badge: 'bg-cyan-950 text-cyan-300 border-cyan-800', icon: '📡' },
                  'MODERATE': { ring: 'border-slate-700/80', badge: 'bg-slate-800 text-slate-300 border-slate-700', icon: '✅' },
                  'LOW': { ring: 'border-emerald-800/80', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800', icon: '🟢' },
                }[state.coordination_urgency] || { ring: 'border-slate-700', badge: 'bg-slate-800 text-slate-300 border-slate-700', icon: '📋' };

                return (
                  <div 
                    key={i} 
                    onClick={() => {
                      sound.playModalOpen();
                      setActiveInterstateModal(state);
                    }}
                    className={`bg-slate-900/90 border-2 ${urgClr.ring} rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer card-interactive hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] animate-subtle-up group`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    title="Tap to inspect full interstate coordination protocol and action checklist"
                  >
                    {/* State Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">{state.role}</div>
                        <div className="text-base font-bold text-white mt-0.5 group-hover:text-cyan-300 transition-colors">{state.state}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${urgClr.badge} flex items-center gap-1 shrink-0 font-mono`}>
                        {urgClr.icon} {state.coordination_urgency}
                      </span>
                    </div>

                    {/* Status + Forecast Risk */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-mono font-semibold">Status</span>
                        <div className="text-slate-200 font-medium mt-0.5 line-clamp-1">{state.current_status}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-900/40">
                        <span className="text-amber-400 text-[10px] uppercase font-mono font-semibold">Forecast Risk</span>
                        <div className="text-amber-200 font-medium mt-0.5 line-clamp-1">{state.forecast_risk}</div>
                      </div>
                    </div>

                    {/* Clean Footer */}
                    <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] font-mono">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold text-[10px]">
                        <CheckCircle className="w-3 h-3 text-cyan-400" />
                        {state.active_mandates.length} {language === 'hi' ? 'कार्य' : 'Tasks Active'}
                      </span>
                      <span className="text-cyan-400 group-hover:text-cyan-300 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-all">
                        {language === 'hi' ? 'प्रोटोकॉल देखें' : 'View Protocol'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
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

            {/* Mandatory Action Items / Orders (Interactive Checklist) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Mandatory Directives ({ (activeDispatchModal.action_items || activeDispatchModal.actions || []).length } Tasks)
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {language === 'hi' ? 'क्लिक करके टास्क पूरा मार्क करें' : 'Tap item to mark completed'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {(activeDispatchModal.action_items || activeDispatchModal.actions || activeDispatchModal.orders || [activeDispatchModal.action]).filter(Boolean).map((act, k) => {
                  const taskId = `${activeDispatchModal.role_id}_${k}`;
                  const isDone = !!checkedDispatchTasks[taskId];
                  return (
                    <div 
                      key={k} 
                      onClick={() => {
                        sound.playTap();
                        setCheckedDispatchTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
                      }}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-xs transition-all duration-200 cursor-pointer select-none card-interactive ${
                        isDone 
                          ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200 shadow-sm' 
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                        isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-950'
                      }`}>
                        {isDone && <CheckCircle className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </div>
                      <span className={`leading-relaxed ${isDone ? 'line-through opacity-85 text-emerald-300' : ''}`}>
                        {act}
                      </span>
                    </div>
                  );
                })}
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

      {/* ==================== INTERSTATE COORDINATION MODAL ==================== */}
      {activeInterstateModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveInterstateModal(null); }}
        >
          <div className="bg-[#0B1320] border border-slate-700 dark:border-sky-800/80 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl shadow-black/90 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-700/60 flex items-center justify-center text-sky-400 shadow-md shrink-0">
                  <GitMerge className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                      {activeInterstateModal.role}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900 text-sky-300 border border-sky-700">
                      {activeInterstateModal.coordination_urgency}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {activeInterstateModal.state} — Cross-Border Action Grid
                  </h3>
                  <div className="text-xs text-slate-400">
                    Status: {activeInterstateModal.current_status}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveInterstateModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cross-Border Atmospheric Transport Context */}
            <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800/50 flex flex-col gap-2">
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                Cross-Border Transboundary Transport Context
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Current Status</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">{activeInterstateModal.current_status}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-900/40">
                  <div className="text-[10px] text-amber-400 font-mono">Forecast Downwind Risk</div>
                  <div className="text-xs font-semibold text-amber-300 mt-0.5">{activeInterstateModal.forecast_risk}</div>
                </div>
              </div>
            </div>

            {/* Mandatory Cross-State Directives (Interactive Checklist) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Cross-State Directives ({activeInterstateModal.active_mandates.length} Mandates)
                </span>
                <span className="text-[10px] text-sky-400 font-mono">
                  {language === 'hi' ? 'क्लिक करके टास्क पूरा मार्क करें' : 'Tap to toggle completion'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {activeInterstateModal.active_mandates.map((mandate, idx) => {
                  const stateTaskId = `state_${activeInterstateModal.state}_${idx}`;
                  const isDone = !!checkedDispatchTasks[stateTaskId];
                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        sound.playTap();
                        setCheckedDispatchTasks(prev => ({ ...prev, [stateTaskId]: !prev[stateTaskId] }));
                      }}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-xs transition-all duration-200 cursor-pointer select-none card-interactive ${
                        isDone 
                          ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200 shadow-sm' 
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                        isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-950'
                      }`}>
                        {isDone && <CheckCircle className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </div>
                      <span className={`leading-relaxed ${isDone ? 'line-through opacity-85 text-emerald-300' : ''}`}>
                        {mandate}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  alert(language === 'hi' ? 'अंतरराज्यीय समन्वय अभिस्वीकृत हो गया!' : 'Interstate Coordination Mandate Acknowledged & Synchronized!');
                  setActiveInterstateModal(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-sky-900/40"
              >
                <CheckCircle className="w-4 h-4" /> {language === 'hi' ? 'अभिस्वीकृत करें (Acknowledge)' : 'Acknowledge Mandates'}
              </button>
              <button
                type="button"
                onClick={() => setActiveInterstateModal(null)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition cursor-pointer active:scale-95"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== MOBILE & TABLET BOTTOM FLOATING CYBER DOCK ===== */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 safe-area-pb pointer-events-none">
        <nav className="pointer-events-auto max-w-md mx-auto rounded-2xl px-2 py-1.5" style={{background:'rgba(3,6,8,0.96)',backdropFilter:'blur(32px) saturate(180%)',border:'1px solid rgba(0,240,255,0.12)',boxShadow:'0 12px 40px rgba(0,0,0,0.9),0 0 30px rgba(0,240,255,0.06),inset 0 1px 0 rgba(255,255,255,0.04)'}}>
          <div className="grid grid-cols-5 items-center justify-items-center w-full">
            
            {/* Tab 1: Overview */}
            <button
              type="button"
              onClick={() => switchTab('overview')}
              className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-90`}
              style={activeTab === 'overview' && !isAiOpen ? {color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)',boxShadow:'0 0 12px rgba(0,240,255,0.15)'} : {color:'#64748b'}}
            >
              <div className="relative">
                <LayoutDashboard className="w-5 h-5 mb-0.5 transition-transform group-hover:scale-110" />
                {activeTab === 'overview' && !isAiOpen && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{background:'#00F0FF',boxShadow:'0 0 8px #00F0FF'}}></span>
                )}
              </div>
              <span className="text-[9px] font-mono font-semibold tracking-tight truncate max-w-full px-1 uppercase">{t('tab_overview', language)}</span>
            </button>

            {/* Tab 2: GRAP */}
            <button
              type="button"
              onClick={() => switchTab('grap')}
              className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-90`}
              style={activeTab === 'grap' && !isAiOpen ? {color:'#00F0FF',background:'rgba(0,240,255,0.10)',border:'1px solid rgba(0,240,255,0.30)',boxShadow:'0 0 12px rgba(0,240,255,0.15)'} : {color:'#64748b'}}
            >
              <div className="relative">
                <ShieldAlert className="w-5 h-5 mb-0.5 transition-transform group-hover:scale-110" />
                {activeTab === 'grap' && !isAiOpen && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{background:'#00F0FF',boxShadow:'0 0 8px #00F0FF'}}></span>
                )}
              </div>
              <span className="text-[9px] font-mono font-semibold tracking-tight truncate max-w-full px-1 uppercase">{t('tab_grap', language)}</span>
            </button>

            {/* Tab 3: CENTER HERO ELEVATED VAYUAI COPILOT ORB */}
            <div className="flex flex-col items-center justify-center w-full relative">
              <button
                type="button"
                onClick={openAi}
                className="relative -top-5 flex flex-col items-center justify-center group active:scale-95 transition-all duration-300 cursor-pointer"
              >
                {/* Pulsing conic glow ring */}
                <div className="absolute -inset-2 rounded-3xl opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10 blur-lg" style={{background:'conic-gradient(from 0deg, rgba(0,240,255,0.6), rgba(0,255,136,0.6), rgba(0,240,255,0.6))',animation:'border-trace 3s linear infinite'}}></div>
                
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-105" style={{background:'linear-gradient(135deg,#00F0FF,#00FF88)',color:'#030608',borderColor:'rgba(255,255,255,0.9)',boxShadow:'0 0 25px rgba(0,240,255,0.7),0 0 60px rgba(0,255,136,0.3)'}}>
                  <Bot className="w-6 h-6 stroke-[2.5] transition-transform duration-300 group-hover:scale-110" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 animate-pulse" style={{background:'#00FF88',borderColor:'#030608'}}></span>
                </div>
                <span className="text-[10px] font-black mt-1 tracking-wider uppercase group-hover:text-white transition-colors flex items-center gap-1" style={{color:'#00F0FF',textShadow:'0 0 10px rgba(0,240,255,0.6)',filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'}}>
                  VayuAI
                </span>
              </button>
            </div>

            {/* Tab 4: What-If */}
            <button
              type="button"
              onClick={() => switchTab('whatif')}
              className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-90`}
              style={activeTab === 'whatif' && !isAiOpen ? {color:'#A855F7',background:'rgba(168,85,247,0.10)',border:'1px solid rgba(168,85,247,0.30)',boxShadow:'0 0 12px rgba(168,85,247,0.15)'} : {color:'#64748b'}}
            >
              <div className="relative">
                <Sliders className="w-5 h-5 mb-0.5 transition-transform group-hover:scale-110" />
                {activeTab === 'whatif' && !isAiOpen && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{background:'#A855F7',boxShadow:'0 0 8px #A855F7'}}></span>
                )}
              </div>
              <span className="text-[9px] font-mono font-semibold tracking-tight truncate max-w-full px-1 uppercase">{t('tab_whatif', language)}</span>
            </button>

            {/* Tab 5: Dispatches */}
            <button
              type="button"
              onClick={() => switchTab('dispatches')}
              className={`w-full relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-90`}
              style={activeTab === 'dispatches' && !isAiOpen ? {color:'#FFB800',background:'rgba(255,184,0,0.10)',border:'1px solid rgba(255,184,0,0.30)',boxShadow:'0 0 12px rgba(255,184,0,0.15)'} : {color:'#64748b'}}
            >
              <div className="relative">
                <Send className="w-5 h-5 mb-0.5 transition-transform group-hover:scale-110" />
                {activeTab === 'dispatches' && !isAiOpen && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{background:'#FFB800',boxShadow:'0 0 8px #FFB800'}}></span>
                )}
              </div>
              <span className="text-[9px] font-mono font-semibold tracking-tight truncate max-w-full px-1 uppercase">{t('tab_dispatches', language)}</span>
            </button>

          </div>
        </nav>
      </div>

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
