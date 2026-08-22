from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FollowUp
from app.schemas import FollowUpResponse

router = APIRouter(prefix="/followups", tags=["High-Risk Follow-Up Scheduler"])

@router.get("", response_model=List[FollowUpResponse])
def get_followups(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(FollowUp).order_by(FollowUp.follow_up_date.asc())
    if status:
        query = query.filter(FollowUp.status == status)
    
    followups = query.all()
    results = []
    now = datetime.datetime.utcnow()

    # Automatically evaluate and flag MISSED status dynamically
    for f in followups:
        current_status = f.status
        if current_status == "PENDING" and f.follow_up_date < now:
            current_status = "MISSED"
            # Update in DB
            f.status = "MISSED"
            db.commit()
            db.refresh(f)

        results.append({
            "id": f.id,
            "patient_name": f.patient_name,
            "abha_id": f.abha_id,
            "category": f.category,
            "follow_up_date": f.follow_up_date,
            "status": current_status,
            "created_at": f.created_at
        })
    return results

@router.post("/schedule", response_model=FollowUpResponse)
def schedule_followup(
    patient_name: str,
    category: str, # MATERNAL, CHILD, CHRONIC
    abha_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if category not in ["MATERNAL", "CHILD", "CHRONIC"]:
        raise HTTPException(status_code=400, detail="Invalid category. Must be MATERNAL, CHILD, or CHRONIC")

    # Determine next follow up date based on protocol intervals
    now = datetime.datetime.utcnow()
    if category == "MATERNAL":
        # 30 days
        follow_up_date = now + datetime.timedelta(days=30)
    elif category == "CHILD":
        # 45 days
        follow_up_date = now + datetime.timedelta(days=45)
    else:
        # CHRONIC: 60 days
        follow_up_date = now + datetime.timedelta(days=60)

    follow_up = FollowUp(
        patient_name=patient_name,
        abha_id=abha_id,
        category=category,
        follow_up_date=follow_up_date,
        status="PENDING"
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up

@router.post("/{id}/complete", response_model=FollowUpResponse)
def complete_followup(id: int, db: Session = Depends(get_db)):
    follow_up = db.query(FollowUp).filter(FollowUp.id == id).first()
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up record not found")

    follow_up.status = "COMPLETED"
    db.commit()
    db.refresh(follow_up)
    return follow_up
