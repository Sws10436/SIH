from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TriageEncounter, ReferralRequest, Hospital, Ambulance
from app.schemas import TriageEncounterCreate, TriageEncounterResponse, ReferralResponse
from app.routes.ws import manager

router = APIRouter(prefix="/triage", tags=["Frontline Worker Triage"])

@router.post("/submit", response_model=TriageEncounterResponse)
async def submit_triage(
    payload: TriageEncounterCreate,
    db: Session = Depends(get_db)
):
    encounter = TriageEncounter(
        patient_name=payload.patient_name,
        patient_age=payload.patient_age,
        abha_id=payload.abha_id,
        danger_signs=payload.danger_signs,
        fever=payload.fever,
        chronic_flags=payload.chronic_flags,
        recommendation=payload.recommendation
    )
    db.add(encounter)
    db.commit()
    db.refresh(encounter)

    # If referral recommended, trigger automatic emergency escalation
    if payload.recommendation == "REFER":
        # Find first hospital in DB as fallback
        hosp = db.query(Hospital).first()
        if hosp:
            # Create a ReferralRequest
            referral = ReferralRequest(
                patient_name=payload.patient_name,
                patient_age=payload.patient_age,
                abha_id=payload.abha_id,
                required_specialty="Trauma", # Default generic specialty for emergency triage
                required_bed_type="ICU",
                originating_lat=hosp.latitude - 0.015, # Mock nearby origin
                originating_lng=hosp.longitude + 0.012,
                destination_hospital_id=hosp.id,
                urgency_level="CRITICAL",
                status="created",
                notes=f"Auto-generated from frontline triage encounter #{encounter.id}. Danger signs: {payload.danger_signs}"
            )
            db.add(referral)
            db.commit()
            db.refresh(referral)

            # Assign ambulance
            amb = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").first()
            if amb:
                amb.status = "DISPATCHED"
                amb.current_referral_id = referral.id
                db.commit()

            # Live WS Broadcast
            await manager.broadcast("REFERRAL_DISPATCHED", {
                "referral_id": referral.id,
                "patient_name": referral.patient_name,
                "destination_hospital_name": hosp.name,
                "specialty": referral.required_specialty,
                "bed_type": referral.required_bed_type,
                "urgency_level": referral.urgency_level,
                "ambulance": {
                    "id": amb.id,
                    "registration_number": amb.registration_number,
                    "driver_name": amb.driver_name,
                    "driver_phone": amb.driver_phone
                } if amb else None
            })

    return encounter

@router.get("", response_model=List[TriageEncounterResponse])
def get_triage_encounters(abha_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TriageEncounter).order_by(TriageEncounter.id.desc())
    if abha_id:
        query = query.filter(TriageEncounter.abha_id == abha_id)
    return query.all()
