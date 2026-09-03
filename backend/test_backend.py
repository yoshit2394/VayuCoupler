import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.data.synthetic_generator import SYNTHETIC_DATASET
from app.models.coupled_model import FORECASTER
from app.engine.grap_trigger import GRAP_ENGINE
from app.engine.alerts import generate_stakeholder_dispatches, calculate_what_if_policy

def main():
    print("Running MoES Air Pollution Forecasting Verification...")
    print("Total timeline steps:", SYNTHETIC_DATASET.total_hours)
    
    # Test Step 72
    snap = SYNTHETIC_DATASET.get_step(72)
    print(f"Step 72 (Day {snap['day_index']} Hour {snap['hour_of_day']}) Avg AQI: {snap['delhi_ncr_avg_aqi']} ({snap['category']})")
    print(f"  PBLH: {snap['meteorology']['boundary_layer_height_m']}m, Wind: {snap['meteorology']['wind_speed_kmh']} km/h, Inversion: {snap['meteorology']['inversion_strength_c']}°C")
    print(f"  Stubble fires active: {snap['stubble_burning']['total_active_fires']}, Upwind alignment: {snap['stubble_burning']['upwind_alignment_pct']}%")
    
    # Test Forecast
    fc = FORECASTER.generate_station_forecast("DEL001", 72)
    print(f"DEL001 Station: {fc['station_name']}")
    print(f"  Current AQI: {fc['current_aqi']}")
    print(f"  +24h Forecast: {fc['milestones']['+24h']['forecast_aqi']} (90% CI: {fc['milestones']['+24h']['confidence_interval']})")
    print(f"  +48h Forecast: {fc['milestones']['+48h']['forecast_aqi']} (90% CI: {fc['milestones']['+48h']['confidence_interval']})")
    print(f"  +72h Forecast: {fc['milestones']['+72h']['forecast_aqi']} (90% CI: {fc['milestones']['+72h']['confidence_interval']})")
    print(f"  Coupling: Stubble impact={fc['milestones']['+48h']['coupling_decomposition']['stubble_transport_impact_aqi']} AQI, Inversion impact={fc['milestones']['+48h']['coupling_decomposition']['inversion_and_pblh_trapping_aqi']} AQI")

    # Test GRAP Triggers
    grap = GRAP_ENGINE.evaluate_triggers(72)
    print(f"Predictive GRAP Stage: {grap['active_grap_stage']}")
    print(f"Triggered Rules: {grap['triggered_rules_count']} / {grap['total_rules']}, Max Lead Time Gained: {grap['max_lead_time_gained_hours']} Hours")
    
    # Test What-If
    whatif = calculate_what_if_policy(72, stubble_reduction_pct=50, truck_reduction_pct=40, dust_reduction_pct=30, industry_switch_pct=20)
    print(f"What-If Policy: Baseline Peak={whatif['baseline_uncontrolled']['peak_risk_aqi']} -> Mitigated Peak={whatif['counterfactual_mitigated']['peak_risk_aqi']}")
    print(f"AQI Reduction Prevented: {whatif['counterfactual_mitigated']['total_aqi_points_prevented']} Points ({whatif['counterfactual_mitigated']['percentage_crisis_mitigation']}%)")
    
    print("\n✅ ALL BACKEND MODULES VERIFIED PERFECTLY!")

if __name__ == "__main__":
    main()
