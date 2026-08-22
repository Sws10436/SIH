from typing import Optional, List, Any
import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "PATIENT"
    hospital_id: Optional[int] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    abha_id: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    hospital_id: Optional[int] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    abha_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# ----------------- BED & RESOURCE SCHEMAS -----------------
class BedResponse(BaseModel):
    id: int
    hospital_id: int
    ward_name: str
    bed_number: str
    bed_type: str
    status: str
    is_iot_enabled: bool
    iot_sensor_id: Optional[str] = None
    last_updated: datetime.datetime
    patient_stay: Optional[dict] = None

    class Config:
        from_attributes = True

class BedToggleRequest(BaseModel):
    status: str # AVAILABLE, OCCUPIED, RESERVED, CLEANING
    patient_id: Optional[int] = None
    notes: Optional[str] = None

class BedCreateRequest(BaseModel):
    ward_name: str
    bed_number: str
    bed_type: str = "GENERAL"
    is_iot_enabled: bool = False

class OxygenInventoryResponse(BaseModel):
    id: int
    hospital_id: int
    bulk_tank_capacity_kl: float
    bulk_tank_current_kl: float
    cylinder_d_type_count: int
    cylinder_b_type_count: int
    daily_consumption_kl: float
    estimated_days_left: float
    last_refill_date: datetime.datetime

    class Config:
        from_attributes = True

class OxygenUpdateRequest(BaseModel):
    bulk_tank_current_kl: Optional[float] = None
    cylinder_d_type_count: Optional[int] = None
    cylinder_b_type_count: Optional[int] = None
    daily_consumption_kl: Optional[float] = None

class BloodInventoryItem(BaseModel):
    id: int
    hospital_id: int
    blood_group: str
    units_available: int
    units_critical_threshold: int
    last_updated: datetime.datetime

    class Config:
        from_attributes = True

class BloodUpdateRequest(BaseModel):
    blood_group: str
    units_available: int

# ----------------- HOSPITAL SCHEMAS -----------------
class HospitalSummary(BaseModel):
    id: int
    name: str
    district_id: int
    district_name: str
    state: str
    address: str
    latitude: float
    longitude: float
    phone: str
    email: Optional[str] = None
    is_empanelled_pmjay: bool
    is_empanelled_cghs: bool
    has_hms: bool
    rating: float
    specialties: List[str]
    
    # Live Real-time Resource Counts
    general_beds_available: int
    general_beds_total: int
    icu_beds_available: int
    icu_beds_total: int
    ventilators_available: int
    ventilators_total: int
    oxygen_beds_available: int
    oxygen_beds_total: int
    oxygen_status: str # ADEQUATE, WARNING, CRITICAL
    status: str # NORMAL, WARNING, CRITICAL
    
    # ML Predictive Turnover Forecast
    predicted_available_12h: int
    predicted_available_24h: int
    predicted_icu_available_12h: int
    predicted_icu_available_24h: int

    class Config:
        from_attributes = True

class HospitalDetailResponse(HospitalSummary):
    oxygen_inventory: Optional[OxygenInventoryResponse] = None
    blood_inventory: List[BloodInventoryItem] = []
    beds: List[BedResponse] = []

# ----------------- PATIENT & ML PREDICTION SCHEMAS -----------------
class PatientCreate(BaseModel):
    abha_id: Optional[str] = None
    full_name: str
    age: int
    gender: str = "Male"
    contact: Optional[str] = None
    blood_group: Optional[str] = None

class PatientStayCreate(BaseModel):
    patient_id: int
    hospital_id: int
    bed_id: Optional[int] = None
    diagnosis_category: str
    diagnosis_detail: Optional[str] = None
    co_morbidities: Optional[str] = "None"
    treatment_stage: str = "ADMITTED"
    current_spo2: float = 98.0
    current_hr: float = 78.0
    current_map: float = 88.0
    current_rr: float = 16.0
    current_temp: float = 98.6

class PatientStayUpdate(BaseModel):
    treatment_stage: Optional[str] = None
    current_spo2: Optional[float] = None
    current_hr: Optional[float] = None
    current_map: Optional[float] = None
    current_rr: Optional[float] = None
    current_temp: Optional[float] = None
    vitals_stability_score: Optional[float] = None
    is_active: Optional[bool] = None

class PatientStayResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    patient_age: int
    patient_gender: str
    abha_id: Optional[str] = None
    hospital_id: int
    bed_id: Optional[int] = None
    ward_name: Optional[str] = None
    bed_number: Optional[str] = None
    admission_date: datetime.datetime
    diagnosis_category: str
    diagnosis_detail: Optional[str] = None
    co_morbidities: Optional[str] = "None"
    treatment_stage: str
    current_spo2: float
    current_hr: float
    current_map: float
    current_rr: float
    current_temp: float
    vitals_stability_score: float
    is_active: bool

    class Config:
        from_attributes = True

class BedTurnoverPredictionResponse(BaseModel):
    patient_id: str
    patient_stay_id: int
    bed_id: Optional[int] = None
    ward_name: Optional[str] = None
    bed_number: Optional[str] = None
    discharge_probability_12h: float
    discharge_probability_24h: float
    expected_discharge_hours: float
    confidence: float
    clinical_stage: str
    key_factors: List[dict] # e.g. [{"factor": "SpO2 Stability", "weight": "+25%"}, ...]
    recommendation: str

class HospitalPredictionSummary(BaseModel):
    hospital_id: int
    hospital_name: str
    current_free_general: int
    current_free_icu: int
    current_free_ventilator: int
    predicted_general_freed_12h: int
    predicted_general_freed_24h: int
    predicted_icu_freed_12h: int
    predicted_icu_freed_24h: int
    forecast_12h_total_general: int
    forecast_24h_total_general: int
    forecast_12h_total_icu: int
    forecast_24h_total_icu: int
    active_inpatient_predictions: List[BedTurnoverPredictionResponse]

# ----------------- REFERRAL & AMBULANCE SCHEMAS -----------------
class ReferralRecommendationRequest(BaseModel):
    originating_lat: float
    originating_lng: float
    required_specialty: str
    required_bed_type: str = "ICU"
    patient_age: Optional[int] = 45
    insurance_scheme: Optional[str] = None # PMJAY, CGHS, ALL
    urgency_level: str = "HIGH" # NORMAL, HIGH, CRITICAL

class HospitalReferralScore(BaseModel):
    hospital_id: int
    hospital_name: str
    district: str
    distance_km: float
    estimated_travel_minutes: float
    specialty_match: bool
    current_beds_available: int
    predicted_beds_12h: int
    overall_match_score: float # 0 - 100
    recommendation_rank: int
    is_empanelled_pmjay: bool
    phone: str
    address: str
    latitude: float
    longitude: float
    scoring_breakdown: dict

class ReferralRequestCreate(BaseModel):
    patient_name: str
    patient_age: int
    abha_id: Optional[str] = None
    required_specialty: str
    required_bed_type: str = "ICU"
    originating_lat: float
    originating_lng: float
    destination_hospital_id: int
    urgency_level: str = "HIGH"
    notes: Optional[str] = None

class ReferralResponse(BaseModel):
    id: int
    patient_name: str
    patient_age: int
    abha_id: Optional[str] = None
    required_specialty: str
    required_bed_type: str
    destination_hospital_id: int
    destination_hospital_name: str
    status: str
    urgency_level: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    ambulance: Optional[dict] = None

# ----------------- TRIAGE & FOLLOW-UP SCHEMAS -----------------
class TriageEncounterCreate(BaseModel):
    patient_name: str
    patient_age: int
    abha_id: Optional[str] = None
    danger_signs: str  # JSON string
    fever: bool = False
    chronic_flags: str  # JSON string
    recommendation: str  # REFER, OBSERVE, TREAT

class TriageEncounterResponse(BaseModel):
    id: int
    patient_name: str
    patient_age: int
    abha_id: Optional[str] = None
    danger_signs: str
    fever: bool
    chronic_flags: str
    recommendation: str
    created_at: datetime.datetime

class FollowUpResponse(BaseModel):
    id: int
    patient_name: str
    abha_id: Optional[str] = None
    category: str
    follow_up_date: datetime.datetime
    status: str
    created_at: datetime.datetime

class IVRCallRequest(BaseModel):
    language: str # mr (Marathi), hi (Hindi), en (English)
    digits_pressed: Optional[str] = ""

class IVRCallResponse(BaseModel):
    prompt_text: str
    should_hangup: bool
    allowed_digits: List[str]

class AmbulanceResponse(BaseModel):
    id: int
    registration_number: str
    hospital_id: int
    hospital_name: str
    ambulance_type: str
    current_lat: float
    current_lng: float
    status: str
    driver_name: str
    driver_phone: str
    current_referral_id: Optional[int] = None

    class Config:
        from_attributes = True

# ----------------- GOVERNMENT & ADMIN SCHEMAS -----------------
class DistrictOverviewItem(BaseModel):
    district_id: int
    district_name: str
    state: str
    latitude: float
    longitude: float
    population: int
    total_hospitals: int
    total_beds: int
    occupied_beds: int
    occupancy_pct: float
    total_icu: int
    available_icu: int
    icu_occupancy_pct: float
    total_ventilators: int
    available_ventilators: int
    avg_oxygen_days: float
    critical_hospitals_count: int
    alert_status: str # NORMAL, WARNING, CRITICAL

class GovtCommandOverview(BaseModel):
    total_hospitals: int
    total_beds: int
    available_beds: int
    total_icu_beds: int
    available_icu_beds: int
    icu_occupancy_rate: float
    total_ventilators: int
    available_ventilators: int
    avg_state_oxygen_days: float
    critical_districts_count: int
    active_critical_alerts: int
    districts: List[DistrictOverviewItem]
    predicted_statewide_deficit_24h: int

class DistrictAlertResponse(BaseModel):
    id: int
    district_id: int
    district_name: str
    alert_type: str
    severity: str
    message: str
    recommended_action: Optional[str] = None
    is_resolved: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- DIGITAL TWIN SIMULATION SCHEMAS -----------------
class SimulationRequest(BaseModel):
    scenario_type: str # SURGE_PERCENT, MASS_CASUALTY, EPIDEMIC_WAVE
    patient_influx_surge_pct: float = 20.0 # e.g. +20%, +50%
    icu_demand_multiplier: float = 1.3
    oxygen_consumption_multiplier: float = 1.4
    duration_days: int = 7
    target_district_id: Optional[int] = None

class SimulationResult(BaseModel):
    scenario_type: str
    projected_total_admissions: int
    projected_icu_deficit_hours: int # In how many hours ICU runs out
    projected_oxygen_stockout_days: float
    affected_hospitals_count: int
    critical_districts: List[str]
    timeline_forecast: List[dict] # Daily breakdown of load vs capacity
    mitigation_recommendations: List[str]

# ----------------- IOT TELEMETRY SCHEMAS -----------------
class IoTTelemetryItem(BaseModel):
    sensor_id: str
    hospital_id: int
    hospital_name: str
    sensor_type: str # OXYGEN_TANK_PRESSURE, OXYGEN_FLOW_METER, SMART_BED_LOAD_CELL
    device_name: str
    current_value: float
    unit: str
    status: str # NORMAL, WARNING, CRITICAL
    timestamp: datetime.datetime

# ----------------- BLOCKCHAIN AUDIT SCHEMAS -----------------
class AuditLogItem(BaseModel):
    id: int
    actor_email: str
    actor_role: str
    hospital_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime.datetime
    prev_hash: str
    curr_hash: str

    class Config:
        from_attributes = True

class AuditVerificationResponse(BaseModel):
    is_valid: bool
    total_blocks_verified: int
    last_block_hash: str
    chain_integrity_status: str

# ----------------- ABDM / FHIR SCHEMAS -----------------
class ABHAFetchRequest(BaseModel):
    abha_id: str

class ABDMFHIRBundleResponse(BaseModel):
    resourceType: str = "Bundle"
    type: str = "collection"
    total_resources: int
    abha_id: str
    fhir_bundle: dict

# ----------------- RURAL ACCESS (USSD & SMS) SCHEMAS -----------------
class USSDQueryRequest(BaseModel):
    session_id: str
    phone_number: str
    user_input: str # e.g. "*999#", "1", "ICU Chennai"

class USSDQueryResponse(BaseModel):
    session_id: str
    message: str
    should_continue: bool

class SMSQueryRequest(BaseModel):
    sender_phone: str
    message_body: str # e.g. "ICU CHENNAI" or "BEDS COIMBATORE"

class SMSQueryResponse(BaseModel):
    reply_to: str
    sms_text: str
    hospitals_found: int
    should_continue: bool = True  # False when the conversation is complete
