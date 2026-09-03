"""
Realistic 7-Day Coupled Smog Episode Synthetic Data Generator.
Demonstrates the meteorology-pollution coupling and predictive GRAP lead-time value.
"""

import math
import numpy as np
from datetime import datetime, timedelta
from .stations import STATIONS

# Major Stubble Burning Clusters in Punjab & Haryana
STUBBLE_CLUSTERS = [
    {"name": "Sangrur Central", "state": "Punjab", "lat": 30.2458, "lon": 75.8421, "weight": 0.22},
    {"name": "Bhatinda South", "state": "Punjab", "lat": 30.2110, "lon": 74.9455, "weight": 0.18},
    {"name": "Mansa Belt", "state": "Punjab", "lat": 29.9880, "lon": 75.3980, "weight": 0.14},
    {"name": "Tarn Taran North", "state": "Punjab", "lat": 31.4520, "lon": 74.9250, "weight": 0.12},
    {"name": "Patiala Rural", "state": "Punjab", "lat": 30.3398, "lon": 76.3869, "weight": 0.10},
    {"name": "Kaithal Cluster", "state": "Haryana", "lat": 29.8015, "lon": 76.3996, "weight": 0.09},
    {"name": "Fatehabad West", "state": "Haryana", "lat": 29.5150, "lon": 75.4550, "weight": 0.08},
    {"name": "Jind Agro Corridor", "state": "Haryana", "lat": 29.3140, "lon": 76.3150, "weight": 0.07},
]

def calculate_indian_aqi(pm25, pm10):
    """
    CPCB Indian National Air Quality Index (NAQI) formula for PM2.5 and PM10.
    """
    # PM2.5 breakpoints
    pm25_bp = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500)
    ]
    
    aqi_pm25 = 0
    for c_low, c_high, i_low, i_high in pm25_bp:
        if c_low <= pm25 <= c_high:
            aqi_pm25 = ((i_high - i_low) / (c_high - c_low)) * (pm25 - c_low) + i_low
            break
    if pm25 > 500:
        aqi_pm25 = 500 + (pm25 - 500) * 0.5

    # PM10 breakpoints
    pm10_bp = [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 600, 401, 500)
    ]
    aqi_pm10 = 0
    for c_low, c_high, i_low, i_high in pm10_bp:
        if c_low <= pm10 <= c_high:
            aqi_pm10 = ((i_high - i_low) / (c_high - c_low)) * (pm10 - c_low) + i_low
            break
    if pm10 > 600:
        aqi_pm10 = 500 + (pm10 - 600) * 0.4

    return int(round(max(aqi_pm25, aqi_pm10)))

def get_aqi_category(aqi):
    if aqi <= 50:
        return "Good", "#10B981"
    elif aqi <= 100:
        return "Satisfactory", "#84CC16"
    elif aqi <= 200:
        return "Moderate", "#EAB308"
    elif aqi <= 300:
        return "Poor", "#F97316"
    elif aqi <= 400:
        return "Very Poor", "#EF4444"
    else:
        return "Severe", "#7F1D1D"

class SyntheticCoupledEpisode:
    """
    Generates 168 hours (7 days) of coupled meteorology, satellite stubble fires,
    and station pollutant records with a dramatic pollution surge scenario.
    """
    def __init__(self, start_date=None):
        if start_date is None:
            # Base start: 3 days before current date or standard mock start
            self.base_time = datetime(2026, 11, 1, 0, 0, 0)
        else:
            self.base_time = start_date
        
        self.total_hours = 168
        self.timeline_data = self._generate_full_timeline()

    def _generate_full_timeline(self):
        timeline = []
        
        for hour in range(self.total_hours):
            current_dt = self.base_time + timedelta(hours=hour)
            day = hour // 24
            time_of_day = hour % 24
            
            # --- 1. METEOROLOGICAL EVOLUTION ---
            # Day 0-1 (hrs 0-47): Moderate weather, breezy SE winds
            # Day 2-3 (hrs 48-95): Stagnation begins, wind turns NW, PBLH compresses, Inversion forms
            # Day 4-5 (hrs 96-143): Peak coupled disaster! Stagnant, severe inversion, high stubble transport
            # Day 6 (hrs 144-167): Western Disturbance arrives, wind speeds up, dispersal
            
            # Diurnal temperature cycle
            temp_base = 22.0 - 2.5 * (day / 6.0)
            temp = temp_base + 6.0 * math.sin((time_of_day - 9) * math.pi / 12) + np.random.normal(0, 0.4)
            
            # Relative humidity (higher at night)
            rh = 60.0 + 20.0 * math.cos((time_of_day - 4) * math.pi / 12)
            if 96 <= hour <= 143:
                rh += 12.0 # Fog / Smog enhancement
            rh = min(98.0, max(30.0, rh + np.random.normal(0, 1.5)))

            # Wind speed (km/h)
            if hour < 48:
                wind_speed = 13.0 + 3.0 * math.sin(time_of_day * math.pi / 12) + np.random.normal(0, 1.0)
            elif hour < 96:
                # Transition to calm
                progress = (hour - 48) / 48.0
                wind_speed = (13.0 * (1 - progress) + 3.8 * progress) + np.random.normal(0, 0.6)
            elif hour < 144:
                # Critical stagnation
                wind_speed = 2.8 + 1.2 * math.sin(time_of_day * math.pi / 12) + np.random.normal(0, 0.4)
                wind_speed = max(1.2, wind_speed)
            else:
                # Western Disturbance recovery
                progress = (hour - 144) / 24.0
                wind_speed = 3.5 + 14.0 * progress + np.random.normal(0, 1.0)

            # Wind direction (degrees)
            # 0=N, 90=E, 180=S, 270=W, 315=NW (Punjab/Haryana alignment!)
            if hour < 48:
                wind_dir = 110.0 + np.random.normal(0, 10.0) # SE/Easterly
            elif hour < 96:
                progress = (hour - 48) / 48.0
                wind_dir = 110.0 + progress * (315.0 - 110.0) + np.random.normal(0, 8.0)
            elif hour < 144:
                wind_dir = 315.0 + np.random.normal(0, 7.0) # Aligned NW stubble smoke corridor!
            else:
                wind_dir = 280.0 + np.random.normal(0, 15.0) # Westerly gust

            wind_dir = (wind_dir + 360) % 360

            # Planetary Boundary Layer Height (PBLH in meters)
            # Normal daytime: 1200-1500m, normal night: 500-700m
            # Inversion daytime: 600-800m, inversion night: 200-350m
            diurnal_pblh = 0.5 * (1.0 + math.sin((time_of_day - 8) * math.pi / 12)) # 0 at night, 1 at noon
            if hour < 48:
                pblh = 600.0 + 800.0 * diurnal_pblh + np.random.normal(0, 30.0)
                inversion_strength = 0.5 if (time_of_day < 7 or time_of_day > 20) else 0.0
            elif hour < 96:
                progress = (hour - 48) / 48.0
                max_pblh = 1400.0 * (1 - 0.45 * progress)
                min_pblh = 600.0 * (1 - 0.55 * progress)
                pblh = min_pblh + (max_pblh - min_pblh) * diurnal_pblh + np.random.normal(0, 20.0)
                inversion_strength = (progress * 3.5) if (time_of_day < 8 or time_of_day > 19) else (progress * 0.8)
            elif hour < 144:
                # Severe inversion
                pblh = 240.0 + 420.0 * diurnal_pblh + np.random.normal(0, 15.0)
                inversion_strength = 4.8 + 0.8 * math.cos(time_of_day * math.pi / 12) + np.random.normal(0, 0.2)
            else:
                progress = (hour - 144) / 24.0
                pblh = 240.0 + progress * 800.0 + 500.0 * diurnal_pblh + np.random.normal(0, 30.0)
                inversion_strength = max(0.0, 4.8 * (1 - progress))

            pblh = max(180.0, pblh)

            # Ventilation Index = Wind Speed (m/s) * PBLH (m)
            wind_speed_ms = (wind_speed * 1000.0) / 3600.0
            ventilation_index = wind_speed_ms * pblh # in m^2/s

            # --- 2. UPWIND STUBBLE BURNING SATELLITE FIRES ---
            if hour < 48:
                total_fire_count = int(320 + np.random.normal(0, 40))
            elif hour < 96:
                progress = (hour - 48) / 48.0
                total_fire_count = int(320 + progress * (2900 - 320) + np.random.normal(0, 80))
            elif hour < 144:
                total_fire_count = int(3100 + 350 * math.sin(hour * 0.1) + np.random.normal(0, 100))
            else:
                progress = (hour - 144) / 24.0
                total_fire_count = int(3100 * (1 - 0.7 * progress) + np.random.normal(0, 60))

            total_fire_count = max(50, total_fire_count)

            # Upwind alignment factor: how closely wind aligns with 315° (North-West)
            # Perfect alignment = 1.0, Opposite (SE 135°) = 0.0
            angle_diff = abs(((wind_dir - 315) + 180) % 360 - 180)
            alignment_factor = max(0.0, math.cos(math.radians(angle_diff)))

            # Stubble smoke reaching Delhi (micrograms/m3 potential)
            stubble_smoke_raw = (total_fire_count / 12.0) * alignment_factor
            # Trapping effect: lower ventilation index amplifies smoke concentration
            trapping_multiplier = max(1.0, 3800.0 / max(ventilation_index, 600.0))
            stubble_pm25_contrib = stubble_smoke_raw * (0.4 + 0.6 * (trapping_multiplier - 1.0) / 4.0)

            # --- 3. STATION LEVEL POLLUTANTS ---
            stations_data = []
            station_aqi_list = []

            for st in STATIONS:
                # Local base traffic & industrial emission diurnal cycle
                traffic_rush = 1.6 if (7 <= time_of_day <= 11 or 17 <= time_of_day <= 22) else 0.8
                base_local_pm25 = (45.0 + st["base_pm25_bias"]) * traffic_rush
                
                # Trapping of local emissions by low PBLH & Inversion
                local_trapped_pm25 = base_local_pm25 * (1.0 + 0.8 * (inversion_strength / 4.0) + (1000.0 / max(pblh, 250.0)) * 0.4)

                # Geographic exposure to NW stubble plume (North/West stations get hit first)
                nw_exposure = 1.0 + 0.18 * ((st["lat"] - 28.5) / 0.3) - 0.12 * ((st["lon"] - 77.1) / 0.3)
                stubble_station_pm25 = stubble_pm25_contrib * max(0.7, nw_exposure)

                total_pm25 = local_trapped_pm25 + stubble_station_pm25 + np.random.normal(0, 4.0)
                total_pm25 = max(25.0, total_pm25)

                # PM10 is roughly 1.6x to 2.1x of PM2.5 with road dust
                dust_factor = 1.75 if not st["industrial_zone"] else 1.95
                total_pm10 = total_pm25 * dust_factor + np.random.normal(0, 8.0)

                # Secondary gases
                no2 = 25.0 + 0.35 * local_trapped_pm25 + np.random.normal(0, 2.0)
                so2 = 12.0 + 0.18 * local_trapped_pm25 + np.random.normal(0, 1.5)
                co = round(0.8 + (total_pm25 / 100.0) * 0.9, 2)
                o3 = max(10.0, 35.0 - 0.05 * total_pm25 + 15.0 * diurnal_pblh)

                aqi = calculate_indian_aqi(total_pm25, total_pm10)
                category, cat_color = get_aqi_category(aqi)

                station_aqi_list.append(aqi)

                stations_data.append({
                    "station_id": st["id"],
                    "name": st["name"],
                    "city": st["city"],
                    "region": st["region"],
                    "lat": st["lat"],
                    "lon": st["lon"],
                    "pm25": round(total_pm25, 1),
                    "pm10": round(total_pm10, 1),
                    "no2": round(no2, 1),
                    "so2": round(so2, 1),
                    "co": co,
                    "o3": round(o3, 1),
                    "aqi": aqi,
                    "category": category,
                    "category_color": cat_color,
                    "stubble_share_ugm3": round(stubble_station_pm25, 1),
                    "local_share_ugm3": round(local_trapped_pm25, 1)
                })

            avg_delhi_aqi = int(round(np.mean(station_aqi_list)))
            avg_cat, avg_color = get_aqi_category(avg_delhi_aqi)

            # Generate satellite active fire locations for visualizer
            active_fire_hotspots = []
            for cl in STUBBLE_CLUSTERS:
                cluster_fires = int(total_fire_count * cl["weight"])
                # Sample 2-4 visual points per cluster
                num_pts = min(cluster_fires // 40 + 1, 5)
                for i in range(num_pts):
                    active_fire_hotspots.append({
                        "id": f"FIRE_{cl['name'][:3]}_{hour}_{i}",
                        "cluster_name": cl["name"],
                        "state": cl["state"],
                        "lat": round(cl["lat"] + np.random.normal(0, 0.06), 4),
                        "lon": round(cl["lon"] + np.random.normal(0, 0.06), 4),
                        "frp_mw": round(25.0 + 70.0 * np.random.random(), 1), # Fire Radiative Power (MW)
                        "confidence": int(np.random.randint(75, 100)),
                        "cluster_total_fires": cluster_fires
                    })

            # Calculate source attribution percentages for Delhi NCR aggregate
            total_stubble_mass = sum(s["stubble_share_ugm3"] for s in stations_data)
            total_local_mass = sum(s["local_share_ugm3"] for s in stations_data)
            total_mass = total_stubble_mass + total_local_mass

            stubble_pct = round((total_stubble_mass / total_mass) * 100.0, 1)
            # Partition remaining local share into realistic sectors
            remaining = 100.0 - stubble_pct
            vehicular_pct = round(remaining * 0.42, 1)
            dust_pct = round(remaining * 0.28, 1)
            industrial_pct = round(remaining * 0.20, 1)
            other_pct = round(max(0.0, 100.0 - (stubble_pct + vehicular_pct + dust_pct + industrial_pct)), 1)

            step_record = {
                "step_hour": hour,
                "timestamp": current_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "iso_timestamp": current_dt.isoformat(),
                "day_index": day + 1,
                "hour_of_day": time_of_day,
                "delhi_ncr_avg_aqi": avg_delhi_aqi,
                "category": avg_cat,
                "category_color": avg_color,
                "meteorology": {
                    "temperature_c": round(temp, 1),
                    "relative_humidity_pct": round(rh, 1),
                    "wind_speed_kmh": round(wind_speed, 1),
                    "wind_direction_deg": round(wind_dir, 1),
                    "wind_direction_cardinal": self._deg_to_cardinal(wind_dir),
                    "boundary_layer_height_m": round(pblh, 1),
                    "inversion_strength_c": round(inversion_strength, 2),
                    "ventilation_index_m2s": round(ventilation_index, 1),
                    "ventilation_status": "Favorable" if ventilation_index > 3500 else ("Moderate" if ventilation_index > 2000 else "Critical Trapping (<1200 m²/s)")
                },
                "stubble_burning": {
                    "total_active_fires": total_fire_count,
                    "upwind_alignment_pct": round(alignment_factor * 100.0, 1),
                    "stubble_transport_potential": "High" if (total_fire_count > 1500 and alignment_factor > 0.6) else ("Moderate" if total_fire_count > 800 else "Low"),
                    "hotspots": active_fire_hotspots
                },
                "source_attribution": {
                    "stubble_burning": stubble_pct,
                    "vehicular_emissions": vehicular_pct,
                    "road_construction_dust": dust_pct,
                    "industrial_energy": industrial_pct,
                    "secondary_and_domestic": other_pct
                },
                "stations": stations_data
            }

            timeline.append(step_record)

        return timeline

    def _deg_to_cardinal(self, d):
        dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        ix = int((d + 11.25) / 22.5)
        return dirs[ix % 16]

    def get_step(self, hour):
        hour = max(0, min(self.total_hours - 1, hour))
        return self.timeline_data[hour]

    def get_full_timeline(self):
        return self.timeline_data

# Singleton instance for quick access
SYNTHETIC_DATASET = SyntheticCoupledEpisode()
