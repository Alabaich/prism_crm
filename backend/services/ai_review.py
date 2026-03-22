"""
ai_review.py — AI-powered application risk assessment.

Uses Google Gemini Flash to analyze:
1. Combined financial picture (all applicants' income vs rent)
2. Employment stability for all applicants
3. Document metadata flags (no images sent — just local analysis summaries)
4. Rental history and references
5. Consistency checks

PRIVACY: No sensitive data is sent to AI:
- No SIN numbers
- No driver's license numbers
- No bank account numbers
- No document images
- Only metadata analysis summaries (technical flags, no personal data)

Usage:
    from services.ai_review import run_ai_review
    result = run_ai_review(application_id=5, db=db)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

import google.generativeai as genai
from sqlalchemy.orm import Session

from models import Application, Lead, Doc, DocumentPackage

logger = logging.getLogger("ai_review")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"


def _configure_gemini():
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment variables")
    genai.configure(api_key=GEMINI_API_KEY)


def _parse_income(value: Any) -> float:
    """Safely parse income string to float."""
    try:
        return float(str(value or "0").replace("$", "").replace(",", "").strip())
    except:
        return 0.0


def _build_analysis_prompt(
    app_data: Dict[str, Any],
    package_data: Dict[str, Any],
    co_applicants: List[Dict],
    doc_analyses: List[Dict],
) -> str:
    """Build the analysis prompt — no sensitive data included."""

    a1_income = _parse_income(app_data.get("monthly_income"))
    monthly_rent = _parse_income(package_data.get("monthly_rent"))

    applicant_incomes = [{"applicant": "Applicant #1", "income": a1_income}]
    for i, co in enumerate(co_applicants):
        co_inc = _parse_income(co.get("monthly_income"))
        applicant_incomes.append({"applicant": f"Applicant #{i+2}", "income": co_inc})

    total_income = sum(a["income"] for a in applicant_incomes)

    obligations = app_data.get("financial_obligations") or []
    total_obligations = 0
    obligations_detail = []
    for ob in obligations:
        amt = _parse_income(ob.get("amount"))
        total_obligations += amt
        obligations_detail.append(f"  - {ob.get('to', 'Unknown')}: ${amt}/mo")

    rent_ratio = (monthly_rent / total_income * 100) if total_income > 0 else 999
    net_after_rent = total_income - monthly_rent
    net_after_all = net_after_rent - total_obligations

    prompt = f"""You are a property management risk assessment AI for a rental application in Ontario, Canada.

Analyze this rental application and provide a risk assessment. Be thorough but fair.
Consider the COMBINED income of all applicants when assessing affordability.

═══════════════════════════════════════════════════
FINANCIAL SUMMARY
═══════════════════════════════════════════════════
Monthly Rent: ${monthly_rent}
"""
    for ai in applicant_incomes:
        prompt += f"{ai['applicant']} Monthly Income: ${ai['income']}\n"

    prompt += f"""COMBINED Monthly Income: ${total_income}
Rent-to-Combined-Income Ratio: {rent_ratio:.1f}% {"(GOOD: under 30%)" if rent_ratio <= 30 else "(ACCEPTABLE: 30-40%)" if rent_ratio <= 40 else "(HIGH: over 40%)"}
Net After Rent: ${net_after_rent}
Total Financial Obligations: ${total_obligations}
{chr(10).join(obligations_detail) if obligations_detail else "  No reported obligations"}
NET DISPOSABLE (after rent + obligations): ${net_after_all}

═══════════════════════════════════════════════════
APPLICANT #1
═══════════════════════════════════════════════════
Name: {app_data.get('prospect_name') or 'Not provided'}
Date of Birth Provided: {'Yes' if app_data.get('date_of_birth') else 'No'}
SIN Provided: {'Yes' if app_data.get('sin_number') else 'No'}
Driver License Provided: {'Yes' if app_data.get('drivers_license') else 'No'}

CURRENT EMPLOYMENT:
  Employer: {app_data.get('employer_name') or 'Not provided'}
  Position: {app_data.get('position_held') or 'Not provided'}
  Type: {app_data.get('employment_type') or 'Not provided'}
  Length: {app_data.get('length_of_employment') or 'Not provided'}
  Supervisor: {app_data.get('supervisor_name') or 'Not provided'}
  Business Address: {'Provided' if app_data.get('business_address') else 'Not provided'}
  Business Phone: {'Provided' if app_data.get('business_phone') else 'Not provided'}

PRIOR EMPLOYMENT:
  Employer: {app_data.get('prior_employer_name') or 'None listed'}
  Position: {app_data.get('prior_position_held') or 'N/A'}
  Length: {app_data.get('prior_length_of_employment') or 'N/A'}
  Supervisor: {app_data.get('prior_supervisor') or 'N/A'}

BANKING:
  Bank Name: {'Provided' if app_data.get('bank_name') else 'Not provided'}
  Chequing Account: {'Provided' if app_data.get('chequing_account') else 'Not provided'}
  Savings Account: {'Provided' if app_data.get('savings_account') else 'Not provided'}

PREVIOUS ADDRESSES:
"""
    prev_addresses = app_data.get("previous_addresses") or []
    if prev_addresses:
        for i, addr in enumerate(prev_addresses):
            prompt += f"""  Address {i+1}: {addr.get('address', 'N/A')}
    Period: {addr.get('from', '?')} to {addr.get('to', '?')}
    Landlord: {addr.get('landlord_name') or 'Not provided'}
    Landlord Phone: {'Provided' if addr.get('landlord_phone') else 'Not provided'}
"""
    else:
        prompt += "  No previous addresses provided\n"

    prompt += f"""
REFERENCES:
  Ref 1: {app_data.get('reference_1_name') or 'Not provided'} — Phone: {'Yes' if app_data.get('reference_1_phone') else 'No'} — Occupation: {app_data.get('reference_1_occupation') or 'N/A'} — Acquaintance: {app_data.get('reference_1_acquaintance') or 'N/A'}
  Ref 2: {app_data.get('reference_2_name') or 'Not provided'} — Phone: {'Yes' if app_data.get('reference_2_phone') else 'No'} — Occupation: {app_data.get('reference_2_occupation') or 'N/A'} — Acquaintance: {app_data.get('reference_2_acquaintance') or 'N/A'}

ADDITIONAL:
  Has Pet: {'Yes — ' + str(app_data.get('pet_details', '')) if app_data.get('has_pet') else 'No'}
  Parking Requested: {'Yes' if app_data.get('parking_requested') else 'No'}
  Vacating Reason: {app_data.get('vacating_reason') or 'Not provided'}
"""

    # Co-applicants
    for i, co in enumerate(co_applicants):
        co_inc = _parse_income(co.get("monthly_income"))
        prompt += f"""
═══════════════════════════════════════════════════
APPLICANT #{i+2} (Co-Applicant)
═══════════════════════════════════════════════════
Name: {co.get('name') or 'Not provided'}
Date of Birth Provided: {'Yes' if co.get('date_of_birth') else 'No'}
SIN Provided: {'Yes' if co.get('sin_number') else 'No'}
Driver License Provided: {'Yes' if co.get('drivers_license') else 'No'}
Occupation: {co.get('occupation') or co.get('position_held') or 'Not provided'}

CURRENT EMPLOYMENT:
  Employer: {co.get('employer_name') or 'Not provided'}
  Position: {co.get('position_held') or 'Not provided'}
  Monthly Income: ${co_inc}
  Length: {co.get('length_of_employment') or 'Not provided'}
  Supervisor: {co.get('supervisor_name') or 'Not provided'}
  Business Address: {'Provided' if co.get('business_address') else 'Not provided'}
  Business Phone: {'Provided' if co.get('business_phone') else 'Not provided'}

PRIOR EMPLOYMENT:
  Employer: {co.get('prior_employer_name') or 'None listed'}
  Position: {co.get('prior_position_held') or 'N/A'}
  Length: {co.get('prior_length_of_employment') or 'N/A'}

PREVIOUS ADDRESSES:
"""
        co_prev = co.get("previous_addresses") or []
        if co_prev:
            for j, addr in enumerate(co_prev):
                prompt += f"""  Address {j+1}: {addr.get('address', 'N/A')}
    Period: {addr.get('from', '?')} to {addr.get('to', '?')}
    Landlord: {addr.get('landlord_name') or 'Not provided'}
    Landlord Phone: {'Provided' if addr.get('landlord_phone') else 'Not provided'}
"""
        else:
            prompt += "  No previous addresses provided\n"

    # Document metadata
    if doc_analyses:
        prompt += """
═══════════════════════════════════════════════════
DOCUMENT METADATA ANALYSIS
(Automated local analysis — no document images shared)
═══════════════════════════════════════════════════
"""
        for da in doc_analyses:
            prompt += f"""
Document Type: {da.get('category', 'Unknown')}
  Summary: {da.get('summary', 'No analysis available')}
  Risk Signals: {da.get('signal_count', 0)}
"""
            for signal in da.get("signals", []):
                prompt += f"    [{signal['severity'].upper()}] {signal['signal']}: {signal['detail']}\n"

    prompt += """
═══════════════════════════════════════════════════
YOUR ASSESSMENT
═══════════════════════════════════════════════════

IMPORTANT: Consider the COMBINED income of all applicants for affordability assessment.
Two applicants each earning $3000/mo have $6000/mo combined — this should be used for rent ratio.

Respond ONLY with valid JSON (no markdown, no backticks, no extra text):

{
  "risk_level": "Low" | "Medium" | "High",
  "confidence": 0.0-1.0,
  "summary": "2-3 sentence overall assessment mentioning combined income if multiple applicants",
  "rent_affordability": {
    "assessment": "assess based on COMBINED income of all applicants",
    "rent_ratio_percent": number,
    "combined_monthly_income": number,
    "net_disposable_monthly": number,
    "risk": "low" | "medium" | "high"
  },
  "employment_stability": {
    "assessment": "assess ALL applicants' employment",
    "risk": "low" | "medium" | "high"
  },
  "document_integrity": {
    "assessment": "based on metadata analysis flags",
    "risk": "low" | "medium" | "high"
  },
  "rental_history": {
    "assessment": "assess ALL applicants' previous landlords and addresses",
    "risk": "low" | "medium" | "high"
  },
  "references_quality": {
    "assessment": "brief assessment",
    "risk": "low" | "medium" | "high"
  },
  "consistency_check": {
    "assessment": "do all data points align across all applicants?",
    "risk": "low" | "medium" | "high"
  },
  "red_flags": ["list of specific concerns, if any"],
  "positive_indicators": ["list of positive signs"],
  "recommendation": "detailed recommendation for the property manager"
}
"""
    return prompt


def run_ai_review(application_id: int, db: Session) -> Dict[str, Any]:
    """
    Run full AI risk assessment on an application.
    No sensitive data (SIN, license #, bank #, images) is sent to AI.
    """
    _configure_gemini()

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found")

    lead = db.query(Lead).filter(Lead.id == app.lead_id).first()
    if not lead:
        raise ValueError(f"Lead {app.lead_id} not found")

    package = db.query(DocumentPackage).filter(
        DocumentPackage.lead_id == app.lead_id,
        DocumentPackage.package_type == "application"
    ).order_by(DocumentPackage.created_at.desc()).first()

    # Build app data (no sensitive fields — booleans only for sensitive items)
    app_data = {
        "prospect_name": lead.prospect_name,
        "date_of_birth": bool(app.date_of_birth),
        "sin_number": bool(app.sin_number),
        "drivers_license": bool(app.drivers_license),
        "employer_name": app.employer_name,
        "employment_type": app.employment_type,
        "monthly_income": app.monthly_income,
        "position_held": app.position_held,
        "length_of_employment": app.length_of_employment,
        "business_address": bool(app.business_address),
        "business_phone": bool(app.business_phone),
        "supervisor_name": app.supervisor_name,
        "prior_employer_name": app.prior_employer_name,
        "prior_position_held": app.prior_position_held,
        "prior_length_of_employment": app.prior_length_of_employment,
        "prior_supervisor": app.prior_supervisor,
        "bank_name": bool(app.bank_name),
        "chequing_account": bool(app.chequing_account),
        "savings_account": bool(app.savings_account),
        "financial_obligations": app.financial_obligations,
        "has_pet": app.has_pet,
        "pet_details": app.pet_details,
        "parking_requested": app.parking_requested,
        "previous_addresses": app.previous_addresses,
        "vacating_reason": app.vacating_reason,
        "reference_1_name": app.reference_1_name,
        "reference_1_phone": bool(app.reference_1_phone),
        "reference_1_acquaintance": app.reference_1_acquaintance,
        "reference_1_occupation": app.reference_1_occupation,
        "reference_2_name": app.reference_2_name,
        "reference_2_phone": bool(app.reference_2_phone),
        "reference_2_acquaintance": app.reference_2_acquaintance,
        "reference_2_occupation": app.reference_2_occupation,
    }

    package_data = {
        "building": package.building if package else None,
        "unit_number": package.unit_number if package else None,
        "monthly_rent": package.monthly_rent if package else None,
        "lease_start": package.lease_start if package else None,
    }

    # All co-applicants (strip sensitive fields)
    co_applicants = []
    for co in (app.co_applicants or []):
        co_applicants.append({
            "name": co.get("name"),
            "date_of_birth": bool(co.get("date_of_birth")),
            "sin_number": bool(co.get("sin_number")),
            "drivers_license": bool(co.get("drivers_license")),
            "occupation": co.get("occupation") or co.get("position_held"),
            "employer_name": co.get("employer_name"),
            "monthly_income": co.get("monthly_income"),
            "position_held": co.get("position_held"),
            "length_of_employment": co.get("length_of_employment"),
            "business_address": bool(co.get("business_address")),
            "business_phone": bool(co.get("business_phone")),
            "supervisor_name": co.get("supervisor_name"),
            "prior_employer_name": co.get("prior_employer_name"),
            "prior_position_held": co.get("prior_position_held"),
            "prior_length_of_employment": co.get("prior_length_of_employment"),
            "previous_addresses": co.get("previous_addresses"),
        })

    # Document metadata (summaries only, no images)
    doc_analyses = []
    for doc_field, category in [
        ("id_document_id", "Photo ID"),
        ("income_proof_id", "Income Proof"),
        ("landlord_reference_id", "Landlord Reference"),
    ]:
        doc_id = getattr(app, doc_field, None)
        if not doc_id:
            doc_analyses.append({
                "category": category,
                "summary": "NOT UPLOADED — document was not provided",
                "signal_count": 1,
                "signals": [{
                    "signal": "missing_document",
                    "severity": "medium",
                    "detail": f"{category} was not uploaded by the applicant."
                }],
            })
            continue

        doc = db.query(Doc).filter(Doc.id == doc_id).first()
        if not doc:
            continue

        analysis = doc.metadata_analysis or {}
        doc_analyses.append({
            "category": category,
            "summary": analysis.get("summary", "No analysis available"),
            "signal_count": len(analysis.get("risk_signals", [])),
            "signals": analysis.get("risk_signals", []),
        })

    # Build prompt and call Gemini
    prompt = _build_analysis_prompt(app_data, package_data, co_applicants, doc_analyses)
    model = genai.GenerativeModel(MODEL_NAME)

    logger.info(f"🤖 AI review for application {application_id} ({1 + len(co_applicants)} applicants, {len(doc_analyses)} docs)")

    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        review_result = json.loads(raw_text)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}\nRaw: {raw_text[:500]}")
        review_result = {
            "risk_level": "Medium",
            "confidence": 0.0,
            "summary": "AI review completed but response could not be parsed. Manual review recommended.",
            "raw_response": raw_text[:2000],
            "parse_error": str(e),
        }
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise ValueError(f"AI review failed: {str(e)}")

    review_result["reviewed_at"] = datetime.utcnow().isoformat()
    review_result["model"] = MODEL_NAME
    review_result["applicant_count"] = 1 + len(co_applicants)
    review_result["documents_analyzed"] = len(doc_analyses)
    review_result["sensitive_data_sent"] = False

    logger.info(f"✅ AI review complete: {review_result.get('risk_level', 'Unknown')} risk")

    return review_result