# MedFlow — PS 26133 Compliance & Novelty Mapping

This document maps the features of the **MedFlow Platform** against the requirements of **Problem Statement PS 26133 (Govt. of Maharashtra)**: *"Accessibility and quality of public healthcare services, particularly in rural and underserved areas."*

---

## 1. Requirement-to-Feature Matrix

| PS 26133 Core Requirement | MedFlow Implementation & Novelty Upgrade | Tier / Component |
| :--- | :--- | :--- |
| **Frontline Worker Support** (ASHA/ANM) | **ASHA/ANM Digital Triage**: Protocol-driven decision tree form based on danger signs, fever, and chronic flags. | Frontline Worker Portal (`TriagePWA.tsx`) |
| **Low-Connectivity / Offline Environments** | **Offline Sync Queue**: Offline-first design utilizing local memory storage (`localStorage`) with a sync manager to upload queued triage records when connection returns. | Frontline Worker Portal (`TriagePWA.tsx`) |
| **Referral Tracking & Loop Closure** | **Referral State Machine**: Extends the referral life cycle from simple creation to tracking progress: `created → in_transit → arrived → treated → closed`. | Referral Loop Tracker (`ReferralTracker.tsx`) |
| **Emergency Escalation & Delay Warning** | **Overdue/Lost Alerting**: Visibly flags referrals that are in transit for too long (>1h as `overdue`, >2h as `lost`) to prevent patient bouncing. | Referral Loop Tracker (`ReferralTracker.tsx`) |
| **Longitudinal Patient Records** | **ABHA ID Mapping**: Ties patients' universal ABDM ABHA IDs to frontline triage encounters. Clinicians can fetch the history of prior triages. | Hospital Staff Portal (`HospitalPortal.tsx`) |
| **High-Risk Follow-up (Maternal / Child / Chronic)** | **Rules-Based Follow-up Scheduler**: Automatically computes follow-up windows based on clinical categories (Maternal: 30 days, Child: 45 days, Chronic: 60 days) and escalates missed followups. | Follow-Up Recall Engine (`FollowUpList.tsx`) |
| **Multilingual Interaction** | **Interactive Multilingual IVR Helpline**: Simulated interactive voice helpline prompting in **Marathi (mr)**, **Hindi (hi)**, and **English (en)**. | IVR System (`app/routes/ivr.py`) |
| **Low-connectivity Patient Access** | **Stateful USSD/SMS Simulators**: Stateful interactive SMS/USSD helpers enabling appointment booking and ambulance requests without smartphones. | Rural Gateway (`rural_gateway.py`) |

---

## 2. Infrastructure vs. Novelty Differentiators

Many hackathon solutions present bed-tracking systems. MedFlow treats standard features as commodity **infrastructure** and focuses its **innovation** on cross-tier clinical continuity:

* **Basic Bed Search & Map Routing** is standard.
  * *MedFlow Novelty:* The **Stateful Rural USSD & SMS Gateway** enables simple feature phones to book hospital appointments and request emergency dispatch.
* **Creating a Referral** is standard.
  * *MedFlow Novelty:* The **Referral Loop Tracker** implements state machine auditing. If a patient does not arrive at the target hospital ward within the expected time, the platform warns district admins of a delayed/lost transit.
* **Entering Patient Details** is standard.
  * *MedFlow Novelty:* The **ABHA Alignment** fetches historical frontline triage checklists directly from the hospital registration screen to give doctors context before they see the patient.
