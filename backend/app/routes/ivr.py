from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import ReferralRequest, FollowUp
from app.schemas import IVRCallRequest, IVRCallResponse

router = APIRouter(prefix="/ivr", tags=["Multilingual IVR Call Layer"])

PROMPTS = {
    "en": {
        "menu": "Welcome to MedFlow Emergency Helpline. Press 1 to request an ambulance. Press 2 to track your referral status. Press 3 to check your chronic follow-up date.",
        "amb": "Your ambulance request has been registered and is being routed. The dispatch team will call you shortly. Thank you.",
        "referral_prompt": "Please enter your referral request number followed by the hash key.",
        "followup_prompt": "You have a child immunization follow-up scheduled in 45 days. Press 0 to return to the main menu.",
        "invalid": "Invalid input. Please try again."
    },
    "mr": {
        "menu": "MedFlow आणीबाणी हेल्पलाईनवर आपले स्वागत आहे. रुग्णवाहिकेची विनंती करण्यासाठी 1 दाबा. आपल्या संदर्भ स्थितीचा मागोवा घेण्यासाठी 2 दाबा. आपल्या पुढील तपासणीची तारीख तपासण्यासाठी 3 दाबा.",
        "amb": "तुमची रुग्णवाहिका विनंती यशस्वीरित्या नोंदवली गेली आहे. रुग्णवाहिका लवकरच पाठवली जाईल. धन्यवाद.",
        "referral_prompt": "कृपया आपला संदर्भ क्रमांक प्रविष्ट करा आणि नंतर हॅश दाबा.",
        "followup_prompt": "तुमची बाल लसीकरण तपासणी ४५ दिवसात नियोजित आहे. मुख्य मेनूवर परत येण्यासाठी 0 दाबा.",
        "invalid": "अवैध इनपुट. कृपया पुन्हा प्रयत्न करा."
    },
    "hi": {
        "menu": "मेडफ्लो आपातकालीन हेल्पलाइन में आपका स्वागत है। एम्बुलेंस का अनुरोध करने के लिए 1 दबाएं। अपने रेफ़रल की स्थिति जानने के लिए 2 दबाएं। अपनी अगली जांच की तारीख जानने के लिए 3 दबाएं।",
        "amb": "आपकी एम्बुलेंस अनुरोध दर्ज कर ली गई है। हमारी टीम जल्द ही आपसे संपर्क करेगी। धन्यवाद।",
        "referral_prompt": "कृपया अपना रेफ़रल नंबर दर्ज करें और फिर हैश दबाएं.",
        "followup_prompt": "आपके बच्चे के टीकाकरण की अगली तारीख 45 दिनों में निर्धारित है। मुख्य मेनू पर लौटने के लिए 0 दबाएं।",
        "invalid": "अवैध इनपुट। कृपया फिर से प्रयास करें।"
    }
}

@router.post("/call", response_model=IVRCallResponse)
def handle_ivr_call(
    payload: IVRCallRequest,
    db: Session = Depends(get_db)
):
    lang = payload.language if payload.language in PROMPTS else "en"
    digits = payload.digits_pressed.strip()

    if not digits:
        return {
            "prompt_text": PROMPTS[lang]["menu"],
            "should_hangup": False,
            "allowed_digits": ["1", "2", "3"]
        }

    if digits == "1":
        return {
            "prompt_text": PROMPTS[lang]["amb"],
            "should_hangup": True,
            "allowed_digits": []
        }
    
    if digits == "2":
        # Check active status of last created referral request
        last_ref = db.query(ReferralRequest).order_by(ReferralRequest.id.desc()).first()
        status_text = ""
        if last_ref:
            if lang == "mr":
                status_text = f"रुग्ण {last_ref.patient_name} ची स्थिती सध्या '{last_ref.status}' आहे."
            elif lang == "hi":
                status_text = f"मरीज {last_ref.patient_name} की रेफ़रल स्थिति वर्तमान में '{last_ref.status}' है।"
            else:
                status_text = f"The referral status for patient {last_ref.patient_name} is currently '{last_ref.status}'."
        else:
            if lang == "mr":
                status_text = "कोणतेही सक्रिय रेफ़रल रेकॉर्ड सापडले नाही."
            elif lang == "hi":
                status_text = "कोई सक्रिय रेफ़रल रिकॉर्ड नहीं मिला।"
            else:
                status_text = "No active referral record found."

        return {
            "prompt_text": status_text + " " + (PROMPTS[lang]["menu"] if lang in PROMPTS else PROMPTS["en"]["menu"]),
            "should_hangup": False,
            "allowed_digits": ["1", "2", "3", "0"]
        }

    if digits == "3":
        return {
            "prompt_text": PROMPTS[lang]["followup_prompt"],
            "should_hangup": False,
            "allowed_digits": ["0"]
        }

    if digits == "0":
        return {
            "prompt_text": PROMPTS[lang]["menu"],
            "should_hangup": False,
            "allowed_digits": ["1", "2", "3"]
        }

    return {
        "prompt_text": PROMPTS[lang]["invalid"] + " " + PROMPTS[lang]["menu"],
        "should_hangup": False,
        "allowed_digits": ["1", "2", "3", "0"]
    }
