"""
Source Attribution & Apportionment Engine.
Calculates percentage shares and concentration masses for Stubble Burning,
Vehicular Traffic, Industrial/Power, Construction Dust, and Secondary Aerosols.
"""

from typing import Dict, Any, List
from ..data.adapter import ADAPTER

def get_source_attribution(step_hour: int) -> Dict[str, Any]:
    """
    Computes regional source apportionment for Delhi NCR at a given episode step.
    """
    snapshot = ADAPTER.get_snapshot_at_step(step_hour)
    raw_attrib = snapshot["source_attribution"]
    fires = snapshot["stubble_burning"]
    met = snapshot["meteorology"]

    # Detailed sub-breakdowns
    sectors = [
        {
            "sector": "Stubble & Biomass Burning",
            "percentage": raw_attrib["stubble_burning"],
            "color": "#F97316", # Orange
            "source_origin": "Punjab & Haryana Upwind Farmlands",
            "active_satellite_fires": fires["total_active_fires"],
            "wind_alignment": f"{raw_attrib['stubble_burning']}% coupling via NW {met['wind_direction_cardinal']} wind",
            "key_mitigation_agency": "State Dept of Agriculture (Punjab / Haryana)"
        },
        {
            "sector": "Vehicular & Traffic Exhaust",
            "percentage": raw_attrib["vehicular_emissions"],
            "color": "#EF4444", # Red
            "source_origin": "Delhi NCR Internal & Inter-state Freight",
            "active_satellite_fires": None,
            "wind_alignment": "Trapped locally during low boundary layer",
            "key_mitigation_agency": "Delhi Traffic Police & Transport Dept"
        },
        {
            "sector": "Road & Construction Dust",
            "percentage": raw_attrib["road_construction_dust"],
            "color": "#EAB308", # Yellow
            "source_origin": "Unpaved corridors & active infrastructure sites",
            "active_satellite_fires": None,
            "wind_alignment": "Resuspended by surface traffic movement",
            "key_mitigation_agency": "MCD / NDMC / PWD / NHAI"
        },
        {
            "sector": "Industrial & Energy Clusters",
            "percentage": raw_attrib["industrial_energy"],
            "color": "#8B5CF6", # Purple
            "source_origin": "Bawana, Narela, Faridabad, Sahibabad",
            "active_satellite_fires": None,
            "wind_alignment": "Continuous point-source emissions",
            "key_mitigation_agency": "DPCC / State Pollution Control Boards"
        },
        {
            "sector": "Secondary Aerosols & Domestic",
            "percentage": raw_attrib["secondary_and_domestic"],
            "color": "#06B6D4", # Cyan
            "source_origin": "Atmospheric gas-to-particle conversion (NH3/SO2/NOx) & Biomass Chulhas",
            "active_satellite_fires": None,
            "wind_alignment": "Enhanced by high humidity and stagnant air",
            "key_mitigation_agency": "CAQM & Urban Local Bodies"
        }
    ]

    return {
        "step_hour": step_hour,
        "timestamp": snapshot["timestamp"],
        "delhi_ncr_avg_aqi": snapshot["delhi_ncr_avg_aqi"],
        "stubble_share_percentage": raw_attrib["stubble_burning"],
        "local_sources_percentage": round(100.0 - raw_attrib["stubble_burning"], 1),
        "sectors": sectors
    }
