"""
Delhi NCR Monitoring Stations Metadata
Realistic coordinates and geographic classifications for coupled forecasting.
"""

STATIONS = [
    {
        "id": "DEL001",
        "name": "Anand Vihar",
        "city": "Delhi",
        "region": "East Delhi",
        "lat": 28.6469,
        "lon": 77.3160,
        "type": "Industrial & Heavy Traffic Hotspot",
        "base_pm25_bias": 35.0,
        "traffic_density": "Very High",
        "industrial_zone": True
    },
    {
        "id": "DEL002",
        "name": "Punjabi Bagh",
        "city": "Delhi",
        "region": "West Delhi",
        "lat": 28.6740,
        "lon": 77.1310,
        "type": "Commercial & High Density Residential",
        "base_pm25_bias": 20.0,
        "traffic_density": "High",
        "industrial_zone": False
    },
    {
        "id": "DEL003",
        "name": "R.K. Puram",
        "city": "Delhi",
        "region": "South Delhi",
        "lat": 28.5632,
        "lon": 77.1869,
        "type": "Residential & Institutional",
        "base_pm25_bias": 15.0,
        "traffic_density": "Moderate",
        "industrial_zone": False
    },
    {
        "id": "DEL004",
        "name": "ITO",
        "city": "Delhi",
        "region": "Central Delhi",
        "lat": 28.6289,
        "lon": 77.2410,
        "type": "High Traffic & Administrative Corridor",
        "base_pm25_bias": 25.0,
        "traffic_density": "Very High",
        "industrial_zone": False
    },
    {
        "id": "DEL005",
        "name": "Jahangirpuri",
        "city": "Delhi",
        "region": "North Delhi",
        "lat": 28.7328,
        "lon": 77.1706,
        "type": "Industrial & North Inflow Corridor",
        "base_pm25_bias": 40.0,
        "traffic_density": "High",
        "industrial_zone": True
    },
    {
        "id": "DEL006",
        "name": "IGI Airport (T3)",
        "city": "Delhi",
        "region": "South West Delhi",
        "lat": 28.5562,
        "lon": 77.0999,
        "type": "Aviation & Open Basin",
        "base_pm25_bias": 5.0,
        "traffic_density": "Moderate",
        "industrial_zone": False
    },
    {
        "id": "DEL007",
        "name": "Dwarka Sector 8",
        "city": "Delhi",
        "region": "South West Delhi",
        "lat": 28.5710,
        "lon": 77.0673,
        "type": "Planned Suburb & Dust Hotspot",
        "base_pm25_bias": 12.0,
        "traffic_density": "Moderate",
        "industrial_zone": False
    },
    {
        "id": "DEL008",
        "name": "Bawana",
        "city": "Delhi",
        "region": "North West Delhi",
        "lat": 28.7762,
        "lon": 77.0511,
        "type": "Major Industrial Cluster (NW Entry)",
        "base_pm25_bias": 42.0,
        "traffic_density": "High",
        "industrial_zone": True
    },
    {
        "id": "DEL009",
        "name": "Mundka",
        "city": "Delhi",
        "region": "West Delhi",
        "lat": 28.6830,
        "lon": 77.0270,
        "type": "Industrial & Logistics Corridor",
        "base_pm25_bias": 38.0,
        "traffic_density": "High",
        "industrial_zone": True
    },
    {
        "id": "NCR001",
        "name": "Noida Sector 62",
        "city": "Noida",
        "region": "Uttar Pradesh",
        "lat": 28.6245,
        "lon": 77.3639,
        "type": "IT & Construction Corridor",
        "base_pm25_bias": 22.0,
        "traffic_density": "High",
        "industrial_zone": False
    },
    {
        "id": "NCR002",
        "name": "Vasundhara",
        "city": "Ghaziabad",
        "region": "Uttar Pradesh",
        "lat": 28.6603,
        "lon": 77.3573,
        "type": "Dense Urban & Downwind Trapping",
        "base_pm25_bias": 32.0,
        "traffic_density": "High",
        "industrial_zone": True
    },
    {
        "id": "NCR003",
        "name": "Vikas Sadan",
        "city": "Gurugram",
        "region": "Haryana",
        "lat": 28.4506,
        "lon": 77.0266,
        "type": "Commercial & Construction Corridor",
        "base_pm25_bias": 18.0,
        "traffic_density": "High",
        "industrial_zone": False
    },
    {
        "id": "NCR004",
        "name": "Sector 16A",
        "city": "Faridabad",
        "region": "Haryana",
        "lat": 28.4089,
        "lon": 77.3178,
        "type": "Heavy Industrial Belt",
        "base_pm25_bias": 28.0,
        "traffic_density": "High",
        "industrial_zone": True
    },
    {
        "id": "NCR005",
        "name": "Murthal Road",
        "city": "Sonipat",
        "region": "Haryana",
        "lat": 28.9931,
        "lon": 77.0151,
        "type": "North Inflow & Highway Corridor",
        "base_pm25_bias": 16.0,
        "traffic_density": "Moderate",
        "industrial_zone": False
    },
    {
        "id": "NCR006",
        "name": "Ganga Nagar",
        "city": "Meerut",
        "region": "Uttar Pradesh",
        "lat": 28.9845,
        "lon": 77.7064,
        "type": "Regional NCR Urban",
        "base_pm25_bias": 14.0,
        "traffic_density": "Moderate",
        "industrial_zone": False
    },
    {
        "id": "NCR007",
        "name": "Moti Doongri",
        "city": "Alwar",
        "region": "Rajasthan",
        "lat": 27.5530,
        "lon": 76.6346,
        "type": "South-West NCR Regional Baseline",
        "base_pm25_bias": -5.0,
        "traffic_density": "Low",
        "industrial_zone": False
    }
]

def get_all_stations():
    return STATIONS

def get_station_by_id(station_id: str):
    for s in STATIONS:
        if s["id"] == station_id:
            return s
    return STATIONS[0]
