import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, ShieldAlert, Send, Sliders, GitMerge, LayoutDashboard, 
  RotateCcw, Play, Pause, Activity, Gauge, Layers, Thermometer, 
  Compass, Flame, MapPin, TrendingUp, PieChart, CheckCircle, Radio,
  ZoomIn, ZoomOut, X, AlertTriangle, Building2, Truck, GraduationCap,
  Heart, Users, Leaf, AlertCircle, ArrowRight, ChevronDown, Settings,
  Bot, Sparkles
} from 'lucide-react';
import { 
  fetchStations, fetchSnapshot, fetchStationForecast, 
  fetchGrapTriggers, fetchDispatches, fetchInterstateGrid, runWhatIfSimulation 
} from './services/api';
import VayuAIChat from './components/VayuAIChat';
import SettingsModal from './components/SettingsModal';
import StationForecastCard from './components/StationForecastCard';
import { t } from './utils/i18n';

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

  // Map drag handlers
  const handleMouseDown = (e) => {
    if (mapZoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...mapPan };
  };
  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setMapPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => { isDragging.current = false; };

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
    setSelectedStationId(station.station_id);
    setStationModal(station);
  };

  // Location redirect handler: switches tab and scrolls right to forecast card with flash animation
  const handleSelectAndScrollStation = (stationId) => {
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
                  onClick={() => setActiveTab(tab.id)}
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

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              snapshot.delhi_ncr_avg_aqi > 400 ? 'bg-red-950/80 text-red-300 border-red-700/80' :
              snapshot.delhi_ncr_avg_aqi > 300 ? 'bg-orange-950/80 text-orange-300 border-orange-700/80' :
              'bg-amber-950/80 text-amber-300 border-amber-700/80'
            }`}>
              AQI {snapshot.delhi_ncr_avg_aqi}
            </span>
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

      {/* ===== TIME SCRUBBER ===== */}
      <section className="bg-slate-950 border-b border-slate-800 px-6 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              T-Hour: {currentStep} / 167
            </span>
          </div>

          <div className="flex-1 w-full flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Day 1: Moderate</span>
              <span className="text-amber-400">Day 3: Inversion Alerts (T-72h)</span>
              <span className="text-rose-400 font-bold">Day 5: Peak Smog Crisis</span>
              <span className="text-emerald-400">Day 7: Dispersal</span>
            </div>
            <input 
              type="range" min="0" max="167" value={currentStep}
              onChange={(e) => setCurrentStep(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
              style={{ accentColor: '#06B6D4' }}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <button onClick={() => setCurrentStep(24)} className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800">T-24h</button>
            <button onClick={() => setCurrentStep(72)} className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">T-72h ⚡</button>
            <button onClick={() => setCurrentStep(96)} className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">T-96h 🚨</button>
            <button onClick={() => setCurrentStep(120)} className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">Peak</button>
            <button onClick={() => setCurrentStep(156)} className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Recovery</button>
          </div>
        </div>
      </section>

      {/* ===== TELEMETRY BAR ===== */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-6 flex flex-col gap-6">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4" style={{ borderLeftColor: snapshot.category_color }}>
            <div className="text-xs text-slate-400 font-semibold">{t('avg_aqi', language)}</div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono">{snapshot.delhi_ncr_avg_aqi}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: snapshot.category_color + '33', color: snapshot.category_color }}>
                {snapshot.category}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">PM2.5: {currSt?.pm25} μg/m³</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4 border-cyan-500">
            <div className="text-xs text-cyan-400 font-semibold">{t('ventilation_idx', language)}</div>
            <div className="my-1.5 text-2xl font-black font-mono text-cyan-300">
              {met.ventilation_index_m2s} <span className="text-xs text-slate-400">m²/s</span>
            </div>
            <div className={`text-[11px] font-medium ${met.ventilation_index_m2s < 2000 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {met.ventilation_status}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4 border-indigo-500">
            <div className="text-xs text-slate-400 font-semibold">{t('pblh_height', language)}</div>
            <div className="my-1.5 text-2xl font-black font-mono text-indigo-200">
              {met.boundary_layer_height_m} <span className="text-xs text-slate-400">m</span>
            </div>
            <div className="text-[11px] text-slate-400">{met.boundary_layer_height_m < 500 ? "Severe Trapping" : "Normal Dispersion"}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4 border-amber-500">
            <div className="text-xs text-slate-400 font-semibold">{t('inversion_delta', language)}</div>
            <div className="my-1.5 text-2xl font-black font-mono text-amber-300">
              {met.inversion_strength_c} <span className="text-xs text-slate-400">°C</span>
            </div>
            <div className="text-[11px] text-slate-400">Nocturnal Trapping</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4 border-blue-500">
            <div className="text-xs text-slate-400 font-semibold">WIND VECTOR</div>
            <div className="my-1.5 text-xl font-bold font-mono text-blue-200">{met.wind_speed_kmh} km/h</div>
            <div className="text-[11px] text-slate-400">{met.wind_direction_cardinal} ({met.wind_direction_deg}°)</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl border-l-4 border-orange-500">
            <div className="text-xs text-slate-400 font-semibold">{t('active_fires', language)}</div>
            <div className="my-1.5 text-2xl font-black font-mono text-orange-400">
              {fires.total_active_fires} <span className="text-xs text-slate-400">fires</span>
            </div>
            <div className="text-[11px] text-orange-400 font-mono">Stubble Share: {snapshot.source_attribution.stubble_burning}%</div>
          </div>
        </section>

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Map (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" /> Delhi NCR Spatial Grid & Stubble Corridor
                </h2>
                <span className="text-xs font-mono text-slate-400">16 Real-time Monitoring Stations</span>
              </div>

              {/* Zoom Slider Controls */}
              <div className="flex items-center gap-3 mb-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range" min="1" max="3" step="0.1" value={mapZoom}
                  onChange={(e) => { setMapZoom(parseFloat(e.target.value)); if (parseFloat(e.target.value) <= 1) setMapPan({ x: 0, y: 0 }); }}
                  className="flex-1 accent-cyan-500 cursor-pointer h-1.5"
                  style={{ accentColor: '#06B6D4' }}
                />
                <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-[11px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                  {Math.round(mapZoom * 100)}%
                </span>
                {mapZoom > 1 && (
                  <button onClick={resetZoom} className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition shrink-0">
                    Reset
                  </button>
                )}
              </div>

              <div
                ref={mapContainerRef}
                className="w-full aspect-[16/10] bg-[#070B11] rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center"
                style={{ cursor: mapZoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div
                  style={{
                    transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging.current ? 'none' : 'transform 0.2s ease',
                    width: '100%', height: '100%'
                  }}
                >
                  <svg viewBox="0 0 800 500" className="w-full h-full select-none">
                    {/* Punjab/Haryana background */}
                    <path d="M 40 40 L 320 40 L 340 240 L 40 220 Z" fill="#111B2B" stroke="#1E2E48" strokeWidth="1.5" opacity="0.6"/>
                    <text x="70" y="70" fill="#64748B" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono">PUNJAB &amp; HARYANA UPWIND SECTOR</text>

                    {/* Delhi NCR Basin */}
                    <path d="M 380 180 C 420 160, 560 160, 600 200 C 630 240, 620 360, 580 420 C 520 450, 420 440, 370 380 C 340 320, 350 220, 380 180 Z" fill="#131C2E" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 4" opacity="0.8"/>
                    <text x="450" y="205" fill="#38BDF8" fontSize="13" fontWeight="800" fontFamily="JetBrains Mono">DELHI NCR BASIN</text>

                    {/* Smoke corridor arrow */}
                    <defs>
                      <linearGradient id="smokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F97316" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    <path d="M 220 130 Q 340 220, 470 290" fill="none" stroke="url(#smokeGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 6" opacity="0.85"/>

                    {/* Station Markers */}
                    {snapshot.stations.map((s) => {
                      const x = 380 + ((s.lon - 76.8) / 0.7) * 200;
                      const y = 180 + ((29.0 - s.lat) / 0.7) * 220;
                      const isSel = s.station_id === selectedStationId;
                      return (
                        <g key={s.station_id} transform={`translate(${x}, ${y})`}
                          onClick={() => handleStationClick(s)}
                          style={{ cursor: 'pointer' }}>
                          {isSel && <circle r="22" fill={s.category_color} opacity="0.2"/>}
                          <circle r={isSel ? 16 : 11} fill={s.category_color} stroke="#FFFFFF" strokeWidth={isSel ? 2.5 : 1.5} opacity="0.95"/>
                          <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize={isSel ? 9 : 8} fontWeight="900" fontFamily="JetBrains Mono">{s.aqi}</text>
                          <text x="0" y={isSel ? -20 : -15} textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="700">{s.name.split(' ')[0]}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Zoom hint */}
                {mapZoom > 1 && (
                  <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-700">
                    Drag to pan
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
                    <PieChart className="w-5 h-5 text-orange-400" /> Source Apportionment
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { name: "Stubble Burning", pct: snapshot.source_attribution.stubble_burning, color: "#F97316" },
                    { name: "Vehicular Exhaust", pct: snapshot.source_attribution.vehicular_emissions, color: "#EF4444" },
                    { name: "Road & Construction Dust", pct: snapshot.source_attribution.road_construction_dust, color: "#EAB308" },
                    { name: "Industrial Clusters", pct: snapshot.source_attribution.industrial_energy, color: "#8B5CF6" },
                    { name: "Secondary & Domestic", pct: snapshot.source_attribution.secondary_and_domestic, color: "#06B6D4" },
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
                  'EMERGENCY': { bg: 'bg-rose-950/60', border: 'border-rose-700', badge: 'bg-rose-900 text-rose-300', icon: 'text-rose-400' },
                  'CRITICAL': { bg: 'bg-orange-950/50', border: 'border-orange-700', badge: 'bg-orange-900 text-orange-300', icon: 'text-orange-400' },
                  'HIGH': { bg: 'bg-amber-950/40', border: 'border-amber-700', badge: 'bg-amber-900 text-amber-300', icon: 'text-amber-400' },
                  'MODERATE': { bg: 'bg-slate-900/80', border: 'border-slate-700', badge: 'bg-slate-800 text-slate-300', icon: 'text-slate-400' },
                };
                const urg = d.urgency || 'HIGH';
                const clr = urgColors[urg] || urgColors['HIGH'];
                return (
                  <div key={i} className={`rounded-2xl border p-4 flex flex-col gap-3 ${clr.bg} ${clr.border}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl bg-slate-900 ${clr.icon}`}>
                          {icons[d.role_id] || <Send className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-mono text-slate-400">{d.role_id}</div>
                          <div className="text-sm font-bold text-white">{d.role_label || d.agency}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${clr.badge}`}>{urg}</span>
                    </div>

                    {/* Actions list */}
                    <div className="flex flex-col gap-1.5">
                      {(d.actions || d.orders || [d.action]).filter(Boolean).map((action, j) => (
                        <div key={j} className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300">{action}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    {d.deadline && (
                      <div className="text-[11px] text-slate-400 font-mono border-t border-slate-800 pt-2">
                        ⏰ Deadline: <span className="text-cyan-400 font-semibold">{d.deadline}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Fallback if dispatches.dispatches is not an array */}
              {!dispatches.dispatches && (
                <div className="col-span-full">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                    <pre className="text-xs text-slate-300 font-mono overflow-auto">{JSON.stringify(dispatches, null, 2)}</pre>
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
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">COUNTERFACTUAL POLICY SIMULATOR</span>
              <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" /> What-If Policy Impact Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Adjust intervention sliders to see real-time AQI reduction projections.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Sliders */}
              <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
                <h3 className="text-sm font-bold text-white">Policy Intervention Controls</h3>
                {[
                  { label: 'Stubble Burning Reduction', val: stubbleVal, set: setStubbleVal, color: '#F97316', hint: 'Punjab/Haryana farm fire suppression' },
                  { label: 'Truck & Heavy Vehicle Bypass', val: truckVal, set: setTruckVal, color: '#EF4444', hint: 'EPE/WPE rerouting enforcement' },
                  { label: 'Dust Suppression (Misting)', val: dustVal, set: setDustVal, color: '#EAB308', hint: 'Anti-smog gun deployment' },
                  { label: 'Industrial Stack Switchover', val: industryVal, set: setIndustryVal, color: '#8B5CF6', hint: 'Cleaner fuel mandate compliance' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{s.label}</span>
                      <span className="font-mono font-bold" style={{ color: s.color }}>{s.val}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={s.val}
                      onChange={(e) => s.set(parseInt(e.target.value))}
                      className="w-full cursor-pointer"
                      style={{ accentColor: s.color }}
                    />
                    <div className="text-[10px] text-slate-500">{s.hint}</div>
                  </div>
                ))}
              </div>

              {/* Results */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {whatIfData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 text-center">
                        <div className="text-xs text-rose-400 font-mono uppercase">Baseline AQI (No Action)</div>
                        <div className="text-4xl font-black font-mono text-rose-300 my-2">{whatIfData.baseline_peak_aqi}</div>
                        <div className="text-xs text-rose-400 font-semibold">{whatIfData.baseline_category}</div>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-4 text-center">
                        <div className="text-xs text-emerald-400 font-mono uppercase">Mitigated AQI (With Policy)</div>
                        <div className="text-4xl font-black font-mono text-emerald-300 my-2">{whatIfData.mitigated_peak_aqi}</div>
                        <div className="text-xs text-emerald-400 font-semibold">{whatIfData.mitigated_category}</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-white">AQI Reduction Breakdown</span>
                        <span className="text-lg font-black text-cyan-400 font-mono">-{whatIfData.aqi_reduction} AQI</span>
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
                              <span className="text-slate-400">{item.label}</span>
                              <span className="font-mono font-bold" style={{ color: item.color }}>-{item.val} AQI</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(item.val * 2, 100)}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {whatIfData.policy_verdict && (
                      <div className="bg-slate-900/80 border border-emerald-800/50 rounded-2xl p-4">
                        <div className="text-xs font-mono text-emerald-400 mb-1">POLICY VERDICT</div>
                        <p className="text-sm text-slate-200 font-semibold">{whatIfData.policy_verdict}</p>
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
              onClick={() => { setSelectedStationId(stationModal.station_id); setStationModal(null); setActiveTab('overview'); }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" /> View 72h Forecast for {stationModal.name}
            </button>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM NAVIGATION DOCK (Native Phone Dock) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07121A]/95 border-t border-cyan-900/40 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        {/* Tab 1: Overview */}
        <button
          onClick={() => { setActiveTab('overview'); setIsAiOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-95 ${
            activeTab === 'overview' && !isAiOpen ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[9px] font-medium">{t('tab_overview', language)}</span>
        </button>

        {/* Tab 2: GRAP */}
        <button
          onClick={() => { setActiveTab('grap'); setIsAiOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-95 ${
            activeTab === 'grap' && !isAiOpen ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-5 h-5 mb-0.5" />
          <span className="text-[9px] font-medium">{t('tab_grap', language)}</span>
        </button>

        {/* CENTER PROMINENT VAYUAI COPILOT LAUNCHER */}
        <button
          onClick={() => setIsAiOpen(prev => !prev)}
          className="relative -top-3.5 flex flex-col items-center justify-center group active:scale-95 transition-transform"
        >
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/40 border-2 border-white/90">
            <Bot className="w-6 h-6 stroke-[2.5]" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950"></span>
          </div>
          <span className="text-[10px] font-black text-cyan-300 mt-0.5 tracking-tight flex items-center gap-1">
            VayuAI
          </span>
        </button>

        {/* Tab 3: What-If */}
        <button
          onClick={() => { setActiveTab('whatif'); setIsAiOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-95 ${
            activeTab === 'whatif' && !isAiOpen ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Sliders className="w-5 h-5 mb-0.5" />
          <span className="text-[9px] font-medium">{t('tab_whatif', language)}</span>
        </button>

        {/* Tab 4: Dispatches */}
        <button
          onClick={() => { setActiveTab('dispatches'); setIsAiOpen(false); }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition active:scale-95 ${
            activeTab === 'dispatches' && !isAiOpen ? 'text-cyan-400 font-bold bg-cyan-950/60' : 'text-slate-400'
          }`}
        >
          <Send className="w-5 h-5 mb-0.5" />
          <span className="text-[9px] font-medium">{t('tab_dispatches', language)}</span>
        </button>
      </nav>

      {/* Floating / Full-Screen VayuAI Copilot Assistant */}
      <VayuAIChat 
        currentStep={currentStep} 
        snapshot={snapshot} 
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
