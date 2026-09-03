"""
Predictive GRAP (Graded Response Action Plan) Trigger Engine.
Matches coupled forecasts against the configurable rules table to fire
pre-emptive cross-agency interventions with 24h to 72h lead time.
"""

import os
import json
from typing import Dict, Any, List
from ..models.coupled_model import FORECASTER
from ..data.adapter import ADAPTER

RULES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "rules.json")

def load_rules() -> List[Dict[str, Any]]:
    with open(RULES_PATH, "r") as f:
        return json.load(f)

class PredictiveGRAPEngine:
    def __init__(self):
        self.rules = load_rules()

    def evaluate_triggers(self, current_step_hour: int) -> Dict[str, Any]:
        """
        Evaluates current and 72-hour forecasted regional AQI against the GRAP rules.
        """
        regional_fc = FORECASTER.generate_regional_forecast(current_step_hour)
        current_aqi = regional_fc["regional_current_aqi"]
        fc_24 = regional_fc["regional_forecast_24h"]["aqi"]
        fc_48 = regional_fc["regional_forecast_48h"]["aqi"]
        fc_72 = regional_fc["regional_forecast_72h"]["aqi"]
        peak_fc_72h = regional_fc["peak_risk_aqi_72h"]

        # Effective max forecasted AQI in the next 72 hours
        max_forecast_aqi = max(current_aqi, fc_24, fc_48, fc_72)

        evaluated_rules = []
        triggered_count = 0
        hours_lead_time_secured = 0

        for rule in self.rules:
            lead_h = rule["forecast_lead_time_hours"]
            aqi_min = rule["aqi_min"]
            
            # Check what the forecast was at that specific lead time window
            if lead_h >= 72:
                target_fc_aqi = max(fc_72, peak_fc_72h)
            elif lead_h >= 48:
                target_fc_aqi = max(fc_48, fc_72)
            elif lead_h >= 36:
                target_fc_aqi = max(fc_24, fc_48)
            else: # 24h
                target_fc_aqi = max(current_aqi, fc_24)

            is_triggered = target_fc_aqi >= aqi_min

            # Calculate if this would have been missed by standard reactive GRAP
            reactive_status = "TRIGGERED" if current_aqi >= aqi_min else "NOT TRIGGERED (Waiting for AQI to cross threshold)"
            
            if is_triggered:
                triggered_count += 1
                if current_aqi < aqi_min:
                    status = f"PRE-EMPTIVE TRIGGER ({lead_h}h Lead Time)"
                    status_type = "PRE_EMPTIVE"
                    hours_lead_time_secured = max(hours_lead_time_secured, lead_h)
                else:
                    status = "ACTIVE ENFORCEMENT"
                    status_type = "ACTIVE"
            else:
                status = "STANDBY / MONITORING"
                status_type = "STANDBY"

            evaluated_rules.append({
                **rule,
                "is_triggered": is_triggered,
                "status": status,
                "status_type": status_type,
                "target_forecast_aqi": target_fc_aqi,
                "current_monitored_aqi": current_aqi,
                "reactive_grap_comparison": {
                    "reactive_action_time": "Immediate (Smog already present)" if current_aqi >= aqi_min else "Delayed / Inactive",
                    "predictive_lead_time_gained_hours": lead_h if (is_triggered and current_aqi < aqi_min) else 0,
                    "lead_time_text": f"+{lead_h} Hours in advance" if (is_triggered and current_aqi < aqi_min) else "Enforced",
                }
            })

        # Summary classification
        active_grap_stage = "Stage 0 (Normal)"
        if max_forecast_aqi >= 450:
            active_grap_stage = "Predictive GRAP Stage IV (Severe+ / Emergency)"
        elif max_forecast_aqi >= 401:
            active_grap_stage = "Predictive GRAP Stage III (Severe)"
        elif max_forecast_aqi >= 301:
            active_grap_stage = "Predictive GRAP Stage II (Very Poor)"
        elif max_forecast_aqi >= 201:
            active_grap_stage = "Predictive GRAP Stage I (Poor)"

        return {
            "current_step_hour": current_step_hour,
            "timestamp": regional_fc["timestamp"],
            "current_aqi": current_aqi,
            "max_72h_forecast_aqi": max_forecast_aqi,
            "active_grap_stage": active_grap_stage,
            "total_rules": len(self.rules),
            "triggered_rules_count": triggered_count,
            "max_lead_time_gained_hours": hours_lead_time_secured,
            "rules": evaluated_rules
        }

# Global GRAP Engine
GRAP_ENGINE = PredictiveGRAPEngine()
