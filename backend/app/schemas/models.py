"""
Pydantic Schemas for the FastAPI REST interface.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class WhatIfRequest(BaseModel):
    step_hour: int = Field(default=72, ge=0, le=167)
    stubble_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    truck_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    dust_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    industry_switch_pct: float = Field(default=0.0, ge=0.0, le=100.0)

class RuleCreateUpdate(BaseModel):
    id: str
    stage: str
    severity_band: str
    aqi_min: int
    aqi_max: int
    forecast_lead_time_hours: int
    target_sector: str
    triggered_action: str
    responsible_agency: str
    reactive_lead_time_gained: str
    notes: Optional[str] = ""
    priority: str = "HIGH"
    icon: Optional[str] = "shield-alert"
