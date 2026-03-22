"""
form_410.py — Template-based Form 410 generator.

Opens the original blank OREA Form 410 PDF and fills the AcroForm fields
directly using PyMuPDF (fitz). Pixel-perfect — no coordinate guessing.

Template location: backend/services/templates/form_410_blank.pdf
"""

import os
import logging
from typing import Dict, Any
from datetime import datetime

import fitz  # PyMuPDF

logger = logging.getLogger("pdf.generators.form_410")

# Template path
TEMPLATE_PATH = os.path.join(os.getcwd(), "services", "templates", "form_410_blank.pdf")


# =============================================================================
# SIGNATURE COORDINATES
# 1-indexed page numbers (stamper subtracts 1)
# Signature lines on page 2 of the PDF
# =============================================================================

SIGNATURE_COORDS = {
    "applicant_1": {
        "page": 2,
        "x": 41,
        "y": 572,
        "width": 190,
        "height": 18,
        "label": "Signature of Applicant #1"
    },
    "applicant_2": {
        "page": 2,
        "x": 312,
        "y": 572,
        "width": 190,
        "height": 18,
        "label": "Signature of Applicant #2"
    }
}


def get_signature_coords(signer_index: int) -> Dict[str, Any]:
    if signer_index == 0:
        return SIGNATURE_COORDS["applicant_1"]
    else:
        return SIGNATURE_COORDS["applicant_2"]


# =============================================================================
# FIELD MAP
# Maps our internal data keys → PDF AcroForm field names
# =============================================================================

FIELD_MAP = {
    # ── Header / Property ──
    "street_num":               "txtp_streetnum",
    "street":                   "txtp_street",
    "unit_number":              "txtp_UnitNumber",
    "city":                     "txtp_city",
    "zipcode":                  "txtp_zipcode",
    "lease_start_day":          "txtbeginday",
    "lease_start_month":        "txtbeginmonth",
    "lease_start_year":         "txtbeginyear",
    "monthly_rent":             "txtrent",
    "rent_due_day":             "txtdueday",

    # ── Applicant #1 — Personal ──
    "applicant_1_name":         "txtbuyer1",
    "applicant_1_dob":          "txtdob1",
    "applicant_1_sin":          "txtNum1",
    "applicant_1_license":      "txtNum2",
    "applicant_1_occupation":   "txtoccupation1",

    # ── Applicant #2 — Personal ──
    "applicant_2_name":         "txtbuyer2",
    "applicant_2_dob":          "txtdob2",
    "applicant_2_sin":          "txtNum3",
    "applicant_2_license":      "txtNum4",
    "applicant_2_occupation":   "txtoccupation2",

    # ── Other Occupants (3-5) ──
    "occupant_1_name":          "txttenant3",
    "occupant_1_rel":           "txtrelationship1",
    "occupant_1_age":           "txtage1",
    "occupant_2_name":          "txttenant4",
    "occupant_2_rel":           "txtrelationship2",
    "occupant_2_age":           "txtage2",
    "occupant_3_name":          "txttenant5",
    "occupant_3_rel":           "txtrelationship3",
    "occupant_3_age":           "txtage3",

    # ── Pets & Vacating ──
    "has_pets":                 "txtpets",
    "pet_description":          "txtpets_describe",
    "vacating_reason":          "txtvacate1",

    # ── Applicant #1 — Residences ──
    "a1_present_address":       "txtl1_addr1",
    "a1_present_address_2":     "txtl1_addr2",
    "a1_present_from":          "txtFromDate",
    "a1_present_to":            "txtToDate",
    "a1_present_landlord":      "txtlastLandlord1",
    "a1_present_phone":         "txtlastLndLrdPh1",
    "a1_prior_address":         "txtl1_addr1Prior",
    "a1_prior_address_2":       "txtl1_addr2Prior",
    "a1_prior_from":            "txtFromDatePrior",
    "a1_prior_to":              "txtToDatePrior",
    "a1_prior_landlord":        "txtlastLandlord1Prior",
    "a1_prior_phone":           "txtlastLndLrdPh1Prior",

    # ── Applicant #2 — Residences ──
    "a2_present_address":       "txtl2_addr1",
    "a2_present_address_2":     "txtl2_addr2",
    "a2_present_from":          "txtFromDate1",
    "a2_present_to":            "txtToDate1",
    "a2_present_landlord":      "txtlastLandlord2",
    "a2_present_phone":         "txtlastLndLrdPh2",
    "a2_prior_address":         "txtl2_addr1Prior",
    "a2_prior_address_2":       "txtl2_addr2Prior",
    "a2_prior_from":            "txtFromDate1Prior",
    "a2_prior_to":              "txtToDate1Prior",
    "a2_prior_landlord":        "txtlastLandlord2Prior",
    "a2_prior_phone":           "txtlastLndLrdPh2Prior",

    # ── Applicant #1 — Present Employment ──
    "a1_employer":              "txtpresent_employer1",
    "a1_business_addr":         "txtpresent_business1",
    "a1_business_phone":        "txtpresent_businessph1",
    "a1_position":              "txtpresent_position1",
    "a1_employment_length":     "txtpresent_length1",
    "a1_supervisor":            "txtpresent_supervisor1",
    "a1_salary":                "txtsalary1",

    # ── Applicant #2 — Present Employment ──
    "a2_employer":              "txtpresent_employer2",
    "a2_business_addr":         "txtpresent_business2",
    "a2_business_phone":        "txtpresent_businessph2",
    "a2_position":              "txtpresent_position2",
    "a2_employment_length":     "txtpresent_length2",
    "a2_supervisor":            "txtpresent_supervisor2",
    "a2_salary":                "txtsalary2",

    # ── Applicant #1 — Prior Employment ──
    "a1_prior_employer":        "txtprior_employer1",
    "a1_prior_bus_addr":        "txtprior_business1",
    "a1_prior_bus_phone":       "txtprior_businessph1",
    "a1_prior_position":        "txtprior_position1",
    "a1_prior_emp_length":      "txtprior_length1",
    "a1_prior_supervisor":      "txtprior_supervisor1",
    "a1_prior_salary":          "txtsalary1Prior",

    # ── Applicant #2 — Prior Employment ──
    "a2_prior_employer":        "txtprior_employer2",
    "a2_prior_bus_addr":        "txtprior_business2",
    "a2_prior_bus_phone":       "txtprior_businessph2",
    "a2_prior_position":        "txtprior_position2",
    "a2_prior_emp_length":      "txtprior_length2",
    "a2_prior_supervisor":      "txtprior_supervisor2",
    "a2_prior_salary":          "txtsalary2Prior",

    # ── Banking ──
    "bank_name":                "txtbankname",
    "bank_branch":              "txtbankbranch",
    "bank_address":             "txtbankaddress",
    "chequing_account":         "txtcheque_account",
    "savings_account":          "txtsave_account",

    # ── Financial Obligations ──
    "payment_1_to":             "txtpayto1",
    "payment_1_to_addr":        "txtpaytoaddress1",
    "payment_1_amount":         "txtpayamount1",
    "payment_2_to":             "txtpayto2",
    "payment_2_to_addr":        "txtpaytoaddress2",
    "payment_2_amount":         "txtpayamount2",

    # ── Personal References ──
    "ref_1_name":               "txtrefname1",
    "ref_1_address":            "txtrefaddress1",
    "ref_1_phone":              "txtrefph1",
    "ref_1_acquaintance":       "txtreflength1",
    "ref_1_occupation":         "txtrefoccupation1",
    "ref_2_name":               "txtrefname2",
    "ref_2_address":            "txtrefaddress2",
    "ref_2_phone":              "txtrefph2",
    "ref_2_acquaintance":       "txtreflength2",
    "ref_2_occupation":         "txtrefoccupation2",

    # ── Automobiles ──
    "car_1_make":               "txtauto_make1",
    "car_1_model":              "txtauto_model1",
    "car_1_year":               "txtauto_year1",
    "car_1_licence":            "txtauto_license1",
    "car_2_make":               "txtauto_make2",
    "car_2_model":              "txtauto_model2",
    "car_2_year":               "txtauto_year2",
    "car_2_licence":            "txtauto_license2",

    # ── Signature area ──
    "sig_1_date":               "txtbuyersig1",
    "sig_1_phone":              "txtb_phone1",
    "sig_1_email":              "txtb_email",
    "sig_2_date":               "txtbuyersig2",
    "sig_2_phone":              "txtb2_phone1",
    "sig_2_email":              "txtb2_email",
}


# =============================================================================
# DATA MAPPER
# =============================================================================

def map_data_to_fields(data: Dict[str, Any]) -> Dict[str, str]:
    """Convert application data dict to our internal field keys with values."""
    f = {}
    today = datetime.utcnow().strftime("%Y/%m/%d")

    # ── Property ──
    building = data.get("building") or ""
    parts = building.split(" ", 1) if building else ["", ""]
    if len(parts) == 2 and parts[0].isdigit():
        f["street_num"] = parts[0]
        f["street"] = parts[1]
    else:
        f["street"] = building

    f["unit_number"] = data.get("unit_number") or ""

    # ── Lease dates ──
    lease_start = data.get("lease_start") or ""
    if lease_start:
        try:
            dt = datetime.strptime(lease_start, "%Y-%m-%d")
            f["lease_start_day"] = str(dt.day)
            f["lease_start_month"] = dt.strftime("%B")
            f["lease_start_year"] = str(dt.year)[-2:]
        except ValueError:
            pass

    f["monthly_rent"] = data.get("monthly_rent") or ""
    f["rent_due_day"] = "1st"

    # ══════════════════════════════════════════════════════
    # APPLICANT #1 — from main Application fields
    # ══════════════════════════════════════════════════════

    f["applicant_1_name"] = data.get("prospect_name") or ""
    f["applicant_1_dob"] = data.get("date_of_birth") or ""
    f["applicant_1_sin"] = data.get("sin_number") or ""
    f["applicant_1_license"] = data.get("drivers_license") or ""
    f["applicant_1_occupation"] = data.get("position_held") or ""

    # Present Employment
    f["a1_employer"] = data.get("employer_name") or ""
    f["a1_business_addr"] = data.get("business_address") or ""
    f["a1_business_phone"] = data.get("business_phone") or ""
    f["a1_position"] = data.get("position_held") or ""
    f["a1_employment_length"] = data.get("length_of_employment") or ""
    f["a1_supervisor"] = data.get("supervisor_name") or ""
    f["a1_salary"] = data.get("monthly_income") or ""

    # Prior Employment
    f["a1_prior_employer"] = data.get("prior_employer_name") or ""
    f["a1_prior_bus_addr"] = data.get("prior_business_address") or ""
    f["a1_prior_bus_phone"] = data.get("prior_business_phone") or ""
    f["a1_prior_position"] = data.get("prior_position_held") or ""
    f["a1_prior_emp_length"] = data.get("prior_length_of_employment") or ""
    f["a1_prior_supervisor"] = data.get("prior_supervisor") or ""
    f["a1_prior_salary"] = data.get("prior_salary") or ""

    # Previous Addresses
    prev = data.get("previous_addresses") or []
    if prev:
        a = prev[0]
        f["a1_present_address"] = a.get("address") or ""
        f["a1_present_from"] = a.get("from") or ""
        f["a1_present_to"] = a.get("to") or ""
        f["a1_present_landlord"] = a.get("landlord_name") or ""
        f["a1_present_phone"] = a.get("landlord_phone") or ""
    if len(prev) > 1:
        a = prev[1]
        f["a1_prior_address"] = a.get("address") or ""
        f["a1_prior_from"] = a.get("from") or ""
        f["a1_prior_to"] = a.get("to") or ""
        f["a1_prior_landlord"] = a.get("landlord_name") or ""
        f["a1_prior_phone"] = a.get("landlord_phone") or ""

    # Contact
    f["sig_1_date"] = today
    f["sig_1_phone"] = data.get("phone") or ""
    f["sig_1_email"] = data.get("email") or ""

    # ══════════════════════════════════════════════════════
    # APPLICANT #2 — from co_applicants[0] JSON
    # ══════════════════════════════════════════════════════

    co_applicants = data.get("co_applicants") or []
    if co_applicants:
        co = co_applicants[0]

        # Personal
        f["applicant_2_name"] = co.get("name") or ""
        f["applicant_2_dob"] = co.get("date_of_birth") or ""
        f["applicant_2_sin"] = co.get("sin_number") or ""
        f["applicant_2_license"] = co.get("drivers_license") or ""
        f["applicant_2_occupation"] = co.get("occupation") or co.get("position_held") or ""

        # Present Employment
        f["a2_employer"] = co.get("employer_name") or ""
        f["a2_business_addr"] = co.get("business_address") or ""
        f["a2_business_phone"] = co.get("business_phone") or ""
        f["a2_position"] = co.get("position_held") or ""
        f["a2_employment_length"] = co.get("length_of_employment") or ""
        f["a2_supervisor"] = co.get("supervisor_name") or ""
        f["a2_salary"] = co.get("monthly_income") or ""

        # Prior Employment
        f["a2_prior_employer"] = co.get("prior_employer_name") or ""
        f["a2_prior_bus_addr"] = co.get("prior_business_address") or ""
        f["a2_prior_bus_phone"] = co.get("prior_business_phone") or ""
        f["a2_prior_position"] = co.get("prior_position_held") or ""
        f["a2_prior_emp_length"] = co.get("prior_length_of_employment") or ""
        f["a2_prior_supervisor"] = co.get("prior_supervisor") or ""
        f["a2_prior_salary"] = co.get("prior_salary") or ""

        # Previous Addresses
        co_prev = co.get("previous_addresses") or []
        if co_prev:
            a = co_prev[0]
            f["a2_present_address"] = a.get("address") or ""
            f["a2_present_from"] = a.get("from") or ""
            f["a2_present_to"] = a.get("to") or ""
            f["a2_present_landlord"] = a.get("landlord_name") or ""
            f["a2_present_phone"] = a.get("landlord_phone") or ""
        if len(co_prev) > 1:
            a = co_prev[1]
            f["a2_prior_address"] = a.get("address") or ""
            f["a2_prior_from"] = a.get("from") or ""
            f["a2_prior_to"] = a.get("to") or ""
            f["a2_prior_landlord"] = a.get("landlord_name") or ""
            f["a2_prior_phone"] = a.get("landlord_phone") or ""

        # Contact
        f["sig_2_date"] = today
        f["sig_2_phone"] = co.get("phone") or ""
        f["sig_2_email"] = co.get("email") or ""

    # ══════════════════════════════════════════════════════
    # SHARED FIELDS (filled by Applicant #1)
    # ══════════════════════════════════════════════════════

    # Other Occupants
    other_occupants = data.get("other_occupants") or []
    for i, occ in enumerate(other_occupants[:3]):
        idx = i + 1
        f[f"occupant_{idx}_name"] = occ.get("name") or ""
        f[f"occupant_{idx}_rel"] = occ.get("relationship") or ""
        f[f"occupant_{idx}_age"] = str(occ.get("age") or "")

    # Pets
    f["has_pets"] = "Yes" if data.get("has_pet") else "No"
    f["pet_description"] = data.get("pet_details") or ""

    # Vacating
    f["vacating_reason"] = data.get("vacating_reason") or ""

    # Banking
    f["bank_name"] = data.get("bank_name") or ""
    f["bank_branch"] = data.get("bank_branch") or ""
    f["bank_address"] = data.get("bank_address") or ""
    f["chequing_account"] = data.get("chequing_account") or ""
    f["savings_account"] = data.get("savings_account") or ""

    # Financial Obligations
    obligations = data.get("financial_obligations") or []
    if len(obligations) > 0:
        f["payment_1_to"] = obligations[0].get("to") or ""
        f["payment_1_amount"] = obligations[0].get("amount") or ""
    if len(obligations) > 1:
        f["payment_2_to"] = obligations[1].get("to") or ""
        f["payment_2_amount"] = obligations[1].get("amount") or ""

    # References
    f["ref_1_name"] = data.get("reference_1_name") or ""
    f["ref_1_address"] = data.get("reference_1_address") or ""
    f["ref_1_phone"] = data.get("reference_1_phone") or ""
    f["ref_1_acquaintance"] = data.get("reference_1_acquaintance") or ""
    f["ref_1_occupation"] = data.get("reference_1_occupation") or ""
    f["ref_2_name"] = data.get("reference_2_name") or ""
    f["ref_2_address"] = data.get("reference_2_address") or ""
    f["ref_2_phone"] = data.get("reference_2_phone") or ""
    f["ref_2_acquaintance"] = data.get("reference_2_acquaintance") or ""
    f["ref_2_occupation"] = data.get("reference_2_occupation") or ""

    # Automobiles
    autos = data.get("automobiles") or []
    if len(autos) > 0:
        f["car_1_make"] = autos[0].get("make") or ""
        f["car_1_model"] = autos[0].get("model") or ""
        f["car_1_year"] = autos[0].get("year") or ""
        f["car_1_licence"] = autos[0].get("licence") or ""
    if len(autos) > 1:
        f["car_2_make"] = autos[1].get("make") or ""
        f["car_2_model"] = autos[1].get("model") or ""
        f["car_2_year"] = autos[1].get("year") or ""
        f["car_2_licence"] = autos[1].get("licence") or ""

    return f


# =============================================================================
# PDF BUILDER
# =============================================================================

def build_form_410(data: Dict[str, Any]) -> bytes:
    """Open the blank Form 410 template and fill AcroForm fields."""
    if not os.path.exists(TEMPLATE_PATH):
        raise FileNotFoundError(
            f"Form 410 template not found at {TEMPLATE_PATH}. "
            f"Place the blank OREA Form 410 PDF there."
        )

    doc = fitz.open(TEMPLATE_PATH)
    field_values = map_data_to_fields(data)

    # Build lookup: pdf_field_name → value
    fill_data = {}
    for our_key, value in field_values.items():
        if not value:
            continue
        pdf_field_name = FIELD_MAP.get(our_key)
        if pdf_field_name:
            fill_data[pdf_field_name] = value

    # Fill each AcroForm field
    for page in doc:
        for widget in page.widgets():
            if widget.field_name in fill_data:
                widget.field_value = fill_data[widget.field_name]
                widget.update()

    pdf_bytes = doc.tobytes()
    doc.close()

    logger.info(f"📄 Form 410 filled via AcroForm ({len(pdf_bytes)} bytes, {len(fill_data)} fields)")
    return pdf_bytes