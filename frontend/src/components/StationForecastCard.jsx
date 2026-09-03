import React, { useState } from 'react';
import { 
  TrendingUp, AlertTriangle, ShieldCheck, Flame, Wind, 
  Layers, Thermometer, Info, ChevronRight, Activity, Clock
} from 'lucide-react';
import { t } from '../utils/i18n';

export default function StationForecastCard({ 
  stationFc, 
  selectedStationId, 
  stations = [], 
  onSelectStation,
  language = 'hinglish',
  theme = 'dark'
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!stationFc) {
    return (
      <div id="station-forecast-panel" className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center min-h-[260px] text-slate-400">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-mono">Loading Coupled 72h Trajectory...</span>
      </div>
    );
  }

  const trajectory = stationFc.hourly_forecast_trajectory || [];
  const milestones = stationFc.milestones || {};
  const currentAqi = stationFc.current_aqi || 300;
  const currentCategory = stationFc.current_category || 'Poor';
  const currentCatColor = stationFc.current_category_color || '#EF4444';
  const stationName = stationFc.station_name || selectedStationId;
  const region = stationFc.region || 'Delhi NCR';

  // SVG Chart Geometry
  const chartW = 500;
  const chartH = 140;
  const padX = 25;
  const padY = 20;
  const maxAqi = 500;

  // Coordinate mapping function
  const getX = (i) => {
    if (trajectory.length <= 1) return padX;
    return padX + (i / (trajectory.length - 1)) * (chartW - padX * 2);
  };

  const getY = (aqi) => {
    const clamped = Math.max(0, Math.min(maxAqi, aqi));
    return (chartH - padY) - (clamped / maxAqi) * (chartH - padY * 2);
  };

  // Build SVG Path for Mean Line
  const linePoints = trajectory.map((pt, i) => `${getX(i)},${getY(pt.forecast_aqi)}`).join(' L ');
  const linePath = trajectory.length > 0 ? `M ${linePoints}` : '';

  // Build SVG Path for 90% CI shaded envelope
  const upperPoints = trajectory.map((pt, i) => `${getX(i)},${getY(pt.upper_bound_90ci || pt.forecast_aqi)}`).join(' L ');
  const lowerPoints = trajectory.slice().reverse().map((pt, idx) => {
    const origIdx = trajectory.length - 1 - idx;
    return `${getX(origIdx)},${getY(pt.lower_bound_90ci || pt.forecast_aqi)}`;
  }).join(' L ');
  const ciAreaPath = trajectory.length > 0 ? `M ${upperPoints} L ${lowerPoints} Z` : '';

  // Area under the mean curve
  const areaPath = trajectory.length > 0 
    ? `M ${getX(0)},${chartH - padY} L ${linePoints} L ${getX(trajectory.length - 1)},${chartH - padY} Z` 
    : '';

  // Critical threshold line at AQI 400 (Severe)
  const y400 = getY(400);

  // Active point for tooltip: hovered point or default to +24h
  const activePoint = hoveredIndex !== null && trajectory[hoveredIndex] 
    ? trajectory[hoveredIndex] 
    : (trajectory[23] || trajectory[trajectory.length - 1] || null);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : (trajectory.length > 23 ? 23 : 0);

  // Physics decomposition from +24h milestone
  const m24 = milestones['+24h'] || {};
  const decomp = m24.coupling_decomposition || {
    stubble_transport_impact_aqi: 220,
    inversion_and_pblh_trapping_aqi: 160,
    baseline_local_urban_aqi: 120
  };
  const physics = m24.physics_telemetry || {};

  return (
    <div 
      id="station-forecast-panel" 
      className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4.5 transition-all duration-300 shadow-xl relative overflow-hidden"
    >
      {/* 1. Header with Full Station Identity & Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {stationName}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                  {selectedStationId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {region} • CPCB Continuous Ambient Telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Current vs Projected Delta Badge */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="px-2 py-0.5 rounded bg-slate-900 text-slate-300">
            Now: <span className="font-bold" style={{ color: currentCatColor }}>{currentAqi}</span>
          </div>
          <span className="text-slate-500">➔</span>
          <div className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold flex items-center gap-1">
            <span>Peak: 500</span>
            <span className="text-[9px] text-rose-400 font-normal">(Severe)</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive 72-Hour Continuous Coupled AQI Trajectory Chart */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800/90 p-3 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400 flex items-center gap-1.5 font-bold">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Coupled 72h Continuous Forecast Curve (WRF-Chem Trajectory)
          </span>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Mean AQI
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-cyan-500/20 border border-cyan-500/40"></span> 90% CI Band
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-0.5 bg-rose-500"></span> Severe (400+)
            </span>
          </div>
        </div>

        {/* SVG Area Chart */}
        <div className="relative w-full aspect-[22/8] select-none">
          <svg 
            viewBox={`0 0 ${chartW} ${chartH}`} 
            className="w-full h-full overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0.65" />
                <stop offset="35%" stopColor="#EF4444" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
              </linearGradient>

              <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="25%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#7F1D1D" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[100, 200, 300, 400, 500].map(val => (
              <g key={val}>
                <line 
                  x1={padX} y1={getY(val)} 
                  x2={chartW - padX} y2={getY(val)} 
                  stroke={val === 400 ? "#EF4444" : "#1E293B"} 
                  strokeWidth={val === 400 ? "1" : "0.7"} 
                  strokeDasharray={val === 400 ? "4 3" : "2 2"} 
                  opacity={val === 400 ? 0.7 : 0.4}
                />
                <text 
                  x={padX - 4} y={getY(val) + 3} 
                  fill={val === 400 ? "#EF4444" : "#64748B"} 
                  fontSize="7" 
                  textAnchor="end" 
                  fontFamily="JetBrains Mono"
                >
                  {val}
                </text>
              </g>
            ))}

            {/* 90% Confidence Interval Envelope Area */}
            {ciAreaPath && (
              <path d={ciAreaPath} fill="#06B6D4" fillOpacity="0.12" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
            )}

            {/* Area Gradient Under Curve */}
            {areaPath && (
              <path d={areaPath} fill="url(#forecastAreaGrad)" />
            )}

            {/* Mean Forecast Trajectory Curve */}
            {linePath && (
              <path d={linePath} fill="none" stroke="url(#curveLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Milestone Markers (+24h, +48h, +72h) */}
            {[23, 47, 71].map(idx => {
              if (!trajectory[idx]) return null;
              const pt = trajectory[idx];
              const cx = getX(idx);
              const cy = getY(pt.forecast_aqi);
              return (
                <g key={idx}>
                  <circle cx={cx} cy={cy} r="4" fill={pt.category_color} stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x={cx} y={cy - 7} fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                    +{idx + 1}h
                  </text>
                </g>
              );
            })}

            {/* Active Hover Crosshair & Dot */}
            {activePoint && (
              <g>
                <line 
                  x1={getX(activeIndex)} y1={padY} 
                  x2={getX(activeIndex)} y2={chartH - padY} 
                  stroke="#22D3EE" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" 
                />
                <circle 
                  cx={getX(activeIndex)} cy={getY(activePoint.forecast_aqi)} 
                  r="5.5" fill="#22D3EE" stroke="#0B0F17" strokeWidth="2" 
                  className="animate-pulse"
                />
              </g>
            )}

            {/* Invisible interactive hover bars across 72 hours */}
            {trajectory.map((pt, i) => (
              <rect
                key={i}
                x={getX(i) - (chartW / trajectory.length) / 2}
                y={padY}
                width={chartW / trajectory.length}
                height={chartH - padY * 2}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            ))}
          </svg>
        </div>

        {/* Hovered Time & Atmospheric Parameter Strip */}
        {activePoint && (
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white">Lead T+{activePoint.lead_hours}h</span>
              <span className="text-[10px] text-slate-400">({activePoint.target_timestamp?.split(' ')[1] || ''})</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">AQI:</span>
                <span className="font-bold" style={{ color: activePoint.category_color }}>
                  {activePoint.forecast_aqi}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold" style={{ color: activePoint.category_color, backgroundColor: activePoint.category_color + '22' }}>
                  {activePoint.category}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-slate-300">
                <span className="text-slate-400">PM2.5:</span>
                <span className="font-bold">{activePoint.projected_pm25}</span>
                <span className="text-[9px] text-slate-500">μg/m³</span>
              </div>

              <div className="hidden md:flex items-center gap-1 text-slate-300">
                <span className="text-slate-400">PBLH:</span>
                <span className="font-bold">{activePoint.projected_pblh_m}m</span>
              </div>

              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3 h-3" />
                <span>{activePoint.projected_stubble_fires} fires</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Physics Coupling Decomposition: Why is AQI jumping to 500? */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Physics Coupling Decomposition (+24h Lead Drivers)</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
            Explainable AI Attribution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* Stubble Influx */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-orange-800/40 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-orange-300 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" /> Farm Stubble Smoke
              </span>
              <span className="font-bold font-mono text-orange-400">+{decomp.stubble_transport_impact_aqi} pts</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(decomp.stubble_transport_impact_aqi / 500) * 100}%` }} />
            </div>
            <span className="text-[9px] text-slate-400">NW Corridor transport at breathing level</span>
          </div>

          {/* Inversion Trapping */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-800/40 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-indigo-300 font-semibold flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-indigo-400" /> Inversion Trapping
              </span>
              <span className="font-bold font-mono text-indigo-400">+{decomp.inversion_and_pblh_trapping_aqi} pts</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(decomp.inversion_and_pblh_trapping_aqi / 500) * 100}%` }} />
            </div>
            <span className="text-[9px] text-slate-400">Thermal lid & compressed boundary layer</span>
          </div>

          {/* Local Baseline */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan-300 font-semibold flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-400" /> Local Urban Baseline
              </span>
              <span className="font-bold font-mono text-cyan-400">+{decomp.baseline_local_urban_aqi} pts</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(decomp.baseline_local_urban_aqi / 500) * 100}%` }} />
            </div>
            <span className="text-[9px] text-slate-400">Vehicles, dust & regional background</span>
          </div>
        </div>
      </div>

      {/* 4. Actionable Local Health & Enforcement Mandate */}
      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-200">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-rose-300 flex items-center gap-2">
            <span>GRAP Stage IV Pre-emptive Alert Triggered (+24h to +72h Lead)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900 border border-rose-700 font-bold">EMERGENCY</span>
          </div>
          <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
            Atmospheric ventilation index collapsing below 1200 m²/s. <strong>Mandatory school hybrid mode</strong>, diesel truck peripheral diversion, and continuous mist sweeps active in <strong>{stationName}</strong> quadrant.
          </p>
        </div>
      </div>

      {/* 5. Clean Milestone Badges (+24h, +48h, +72h) */}
      <div className="grid grid-cols-3 gap-2">
        {['+24h', '+48h', '+72h'].map((key, i) => {
          const m = milestones[key] || {};
          const aqi = m.forecast_aqi || 500;
          const cat = m.category || 'Severe';
          const catCol = m.category_color || '#7F1D1D';
          const ci = m.confidence_interval || [460, 500];

          return (
            <div 
              key={key} 
              className={`p-2.5 rounded-xl bg-slate-950 border text-center transition-all ${
                i === 0 ? 'border-cyan-700/80 shadow-md shadow-cyan-950/40' : 'border-slate-800'
              }`}
            >
              <div className={`text-[10px] uppercase font-mono font-bold ${
                i === 0 ? 'text-cyan-400' : i === 1 ? 'text-amber-400' : 'text-purple-400'
              }`}>
                {key} Lead {i === 0 ? '⚡' : ''}
              </div>
              <div className="text-xl font-black font-mono my-0.5" style={{ color: catCol }}>
                {aqi}
              </div>
              <div className="text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block" style={{ color: catCol, backgroundColor: catCol + '22' }}>
                {cat}
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                CI: {ci[0]}–{ci[1]}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
