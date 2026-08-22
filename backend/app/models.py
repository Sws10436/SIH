import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str):
    PATIENT = "PATIENT"
    HOSPITAL_STAFF = "HOSPITAL_STAFF"
    GOVT_ADMIN = "GOVT_ADMIN"

class BedType(str):
    GENERAL = "GENERAL"
    ICU = "ICU"
    PICU = "PICU"
    NICU = "NICU"
    CARDIAC_ICU = "CARDIAC_ICU"
    OXYGEN_SUPPORTED = "OXYGEN_SUPPORTED"
    VENTILATOR = "VENTILATOR"

class BedStatus(str):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    RESERVED = "RESERVED"
    CLEANING = "CLEANING"

class TreatmentStage(str):
    ADMITTED = "ADMITTED"
    ICU_CRITICAL = "ICU_CRITICAL"
    STEP_DOWN = "STEP_DOWN"
    ORAL_MEDS = "ORAL_MEDS"
    DISCHARGE_READY = "DISCHARGE_READY"
    DISCHARGED = "DISCHARGED"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False) # Bcrypt hashed
    full_name = Column(String(120), nullable=False)
    role = Column(String(30), default=UserRole.PATIENT, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    abha_id = Column(String(50), unique=True, index=True, nullable=True) # 14-digit ABHA ID
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="staff_users")

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    state = Column(String(100), default="Tamil Nadu", nullable=False)
    population = Column(Integer, default=500000)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    alert_status = Column(String(20), default="NORMAL") # NORMAL, WARNING, CRITICAL
    icu_threshold_pct = Column(Float, default=10.0) # Flag if ICU < 10%
    oxygen_threshold_days = Column(Float, default=3.0)

    hospitals = relationship("Hospital", back_populates="district")
    alerts = relationship("DistrictAlert", back_populates="district")

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    address = Column(String(300), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    is_empanelled_pmjay = Column(Boolean, default=True) # Ayushman Bharat
    is_empanelled_cghs = Column(Boolean, default=True)
    has_hms = Column(Boolean, default=True)
    rating = Column(Float, default=4.5)
    specialties_json = Column(Text, default="[]") # JSON list of strings
    
    district = relationship("District", back_populates="hospitals")
    beds = relationship("Bed", back_populates="hospital", cascade="all, delete-orphan")
    oxygen_inventory = relationship("OxygenInventory", back_populates="hospital", uselist=False, cascade="all, delete-orphan")
    blood_inventories = relationship("BloodInventory", back_populates="hospital", cascade="all, delete-orphan")
    ambulances = relationship("Ambulance", back_populates="hospital", cascade="all, delete-orphan")
    patient_stays = relationship("PatientStay", back_populates="hospital")
    staff_users = relationship("User", back_populates="hospital")
    snapshots = relationship("ResourceSnapshot", back_populates="hospital")

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    ward_name = Column(String(100), nullable=False)
    bed_number = Column(String(50), nullable=False)
    bed_type = Column(String(30), default=BedType.GENERAL, nullable=False)
    status = Column(String(30), default=BedStatus.AVAILABLE, nullable=False)
    is_iot_enabled = Column(Boolean, default=False)
    iot_sensor_id = Column(String(100), nullable=True)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="beds")
    current_stay = relationship("PatientStay", back_populates="bed", uselist=False)

class OxygenInventory(Base):
    __tablename__ = "oxygen_inventories"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), unique=True, nullable=False)
    bulk_tank_capacity_kl = Column(Float, default=20.0) # Kiloliters
    bulk_tank_current_kl = Column(Float, default=15.0)
    cylinder_d_type_count = Column(Integer, default=50)
    cylinder_b_type_count = Column(Integer, default=30)
    daily_consumption_kl = Column(Float, default=3.2)
    last_refill_date = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="oxygen_inventory")

class BloodInventory(Base):
    __tablename__ = "blood_inventories"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_group = Column(String(10), nullable=False) # A+, A-, B+, B-, AB+, AB-, O+, O-
    units_available = Column(Integer, default=15)
    units_critical_threshold = Column(Integer, default=5)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="blood_inventories")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    abha_id = Column(String(50), unique=True, index=True, nullable=True) # ABHA / ABDM ID
    full_name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), default="Other")
    contact = Column(String(30), nullable=True)
    blood_group = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stays = relationship("PatientStay", back_populates="patient")

class PatientStay(Base):
    __tablename__ = "patient_stays"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    admission_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    diagnosis_category = Column(String(100), nullable=False) # e.g. Cardiac, Respiratory, Post-Op, Trauma, Dengue
    diagnosis_detail = Column(String(255), nullable=True)
    co_morbidities = Column(String(255), default="None")
    treatment_stage = Column(String(50), default=TreatmentStage.ADMITTED)
    
    # Clinical Vitals Indicators for ML
    current_spo2 = Column(Float, default=98.0) # %
    current_hr = Column(Float, default=78.0)   # bpm
    current_map = Column(Float, default=88.0)  # Mean Arterial Pressure mmHg
    current_rr = Column(Float, default=16.0)   # Respiratory rate
    current_temp = Column(Float, default=98.6) # Fahrenheit
    vitals_stability_score = Column(Float, default=0.85) # 0.0 - 1.0 (Trend stability)
    
    is_active = Column(Boolean, default=True)
    discharge_date = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="stays")
    hospital = relationship("Hospital", back_populates="patient_stays")
    bed = relationship("Bed", back_populates="current_stay")
    predictions = relationship("BedTurnoverPrediction", back_populates="patient_stay", cascade="all, delete-orphan")

class BedTurnoverPrediction(Base):
    __tablename__ = "bed_turnover_predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_stay_id = Column(Integer, ForeignKey("patient_stays.id"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    discharge_prob_12h = Column(Float, nullable=False) # Probability in [0.0, 1.0]
    discharge_prob_24h = Column(Float, nullable=False)
    expected_discharge_hours = Column(Float, nullable=False)
    confidence_score = Column(Float, default=0.85)
    key_factors_json = Column(Text, default="[]") # Explainability factor list
    predicted_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient_stay = relationship("PatientStay", back_populates="predictions")

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String(50), unique=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    ambulance_type = Column(String(50), default="ADVANCED_CARDIAC") # BASIC, ADVANCED_CARDIAC, NEONATAL
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    status = Column(String(30), default="AVAILABLE") # AVAILABLE, DISPATCHED, ON_TRIP, MAINTENANCE
    driver_name = Column(String(100), default="Ramesh Kumar")
    driver_phone = Column(String(30), default="+91 98765 43210")
    current_referral_id = Column(Integer, ForeignKey("referral_requests.id"), nullable=True)

    hospital = relationship("Hospital", back_populates="ambulances")
    active_referral = relationship("ReferralRequest", back_populates="ambulance", uselist=False)

class ReferralRequest(Base):
    __tablename__ = "referral_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String(120), nullable=False)
    patient_age = Column(Integer, default=45)
    abha_id = Column(String(50), nullable=True)
    required_specialty = Column(String(100), nullable=False)
    required_bed_type = Column(String(50), default=BedType.ICU)
    originating_lat = Column(Float, nullable=False)
    originating_lng = Column(Float, nullable=False)
    destination_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    status = Column(String(30), default="created") # created, in_transit, arrived, treated, closed, overdue, lost
    urgency_level = Column(String(20), default="HIGH") # NORMAL, HIGH, CRITICAL
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    destination_hospital = relationship("Hospital")
    ambulance = relationship("Ambulance", back_populates="active_referral", uselist=False)

class TriageEncounter(Base):
    __tablename__ = "triage_encounters"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String(120), nullable=False)
    patient_age = Column(Integer, nullable=False)
    abha_id = Column(String(50), nullable=True)
    danger_signs = Column(Text, nullable=True) # JSON string representation
    fever = Column(Boolean, default=False)
    chronic_flags = Column(Text, nullable=True) # JSON string representation
    recommendation = Column(String(30), nullable=False) # REFER, OBSERVE, TREAT
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String(120), nullable=False)
    abha_id = Column(String(50), nullable=True)
    category = Column(String(30), nullable=False) # MATERNAL, CHILD, CHRONIC
    follow_up_date = Column(DateTime, nullable=False)
    status = Column(String(30), default="PENDING") # PENDING, MISSED, COMPLETED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DistrictAlert(Base):
    __tablename__ = "district_alerts"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    alert_type = Column(String(50), nullable=False) # CRITICAL_ICU_SHORTAGE, OXYGEN_DEPLETION, SURGE
    severity = Column(String(20), default="CRITICAL") # WARNING, CRITICAL, EMERGENCY
    message = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_role = Column(String(30), default="SYSTEM")
    actor_email = Column(String(120), default="system@medflow.in")
    hospital_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False) # BED_STATUS_TOGGLE, OXYGEN_UPDATE, REFERRAL_DISPATCH
    resource_type = Column(String(50), nullable=False) # BED, OXYGEN, BLOOD, REFERRAL
    resource_id = Column(String(50), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    prev_hash = Column(String(64), nullable=False) # Blockchain-style SHA-256 hash chaining
    curr_hash = Column(String(64), nullable=False)
    signature = Column(String(128), nullable=True)

class ResourceSnapshot(Base):
    __tablename__ = "resource_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    general_total = Column(Integer, default=0)
    general_occupied = Column(Integer, default=0)
    icu_total = Column(Integer, default=0)
    icu_occupied = Column(Integer, default=0)
    ventilator_total = Column(Integer, default=0)
    ventilator_occupied = Column(Integer, default=0)
    oxygen_supported_total = Column(Integer, default=0)
    oxygen_supported_occupied = Column(Integer, default=0)
    oxygen_tank_pct = Column(Float, default=75.0)

    hospital = relationship("Hospital", back_populates="snapshots")
