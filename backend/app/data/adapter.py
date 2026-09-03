"""
Data Adapter Layer.
Supports dual-mode execution: Offline/Synthetic Mode (100% demo reliability)
and Live API Mode (CPCB/IMD/NASA FIRMS stubs).
"""

from typing import Dict, Any, List, Optional
from .synthetic_generator import SYNTHETIC_DATASET, STUBBLE_CLUSTERS
from .stations import STATIONS, get_station_by_id

class DataAdapter:
    def __init__(self, mode: str = "synthetic"):
        self.mode = mode # 'synthetic' or 'live'
        self.synthetic_engine = SYNTHETIC_DATASET

    def set_mode(self, mode: str):
        if mode in ["synthetic", "live"]:
            self.mode = mode

    def get_timeline_status(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "total_steps": self.synthetic_engine.total_hours,
            "start_time": self.synthetic_engine.timeline_data[0]["timestamp"],
            "end_time": self.synthetic_engine.timeline_data[-1]["timestamp"]
        }

    def get_snapshot_at_step(self, step_hour: int) -> Dict[str, Any]:
        """
        Retrieves complete coupled snapshot at a specific hour of the 7-day episode.
        """
        return self.synthetic_engine.get_step(step_hour)

    def get_station_history(self, station_id: str, up_to_step: int, lookback_hours: int = 24) -> List[Dict[str, Any]]:
        """
        Returns the preceding N hours of pollutant & weather history for a station.
        """
        start_step = max(0, up_to_step - lookback_hours)
        history = []
        for h in range(start_step, up_to_step + 1):
            step_data = self.synthetic_engine.get_step(h)
            station_info = next((s for s in step_data["stations"] if s["station_id"] == station_id), None)
            if station_info:
                history.append({
                    "step_hour": h,
                    "timestamp": step_data["timestamp"],
                    "aqi": station_info["aqi"],
                    "pm25": station_info["pm25"],
                    "pm10": station_info["pm10"],
                    "wind_speed_kmh": step_data["meteorology"]["wind_speed_kmh"],
                    "wind_direction_deg": step_data["meteorology"]["wind_direction_deg"],
                    "boundary_layer_height_m": step_data["meteorology"]["boundary_layer_height_m"],
                    "inversion_strength_c": step_data["meteorology"]["inversion_strength_c"],
                    "ventilation_index_m2s": step_data["meteorology"]["ventilation_index_m2s"]
                })
        return history

    def get_active_fires(self, step_hour: int) -> Dict[str, Any]:
        """
        NASA FIRMS style satellite active fire counts and hotspot coordinates.
        """
        step_data = self.synthetic_engine.get_step(step_hour)
        return step_data["stubble_burning"]

# Global Adapter instance
ADAPTER = DataAdapter(mode="synthetic")
