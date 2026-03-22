"""
privacy_consent.py
Generates a filled Privacy Consent (Schedule A) PDF using ReportLab.
Also defines the signature coordinate map for stamping.

Single-page document — both applicants sign at the bottom.
"""

import io
import logging
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle

logger = logging.getLogger("pdf.generators.privacy_consent")

# =============================================================================
# SIGNATURE COORDINATE MAP
# Single page document. Signature blocks are near the bottom.
# ReportLab builds top-down, signature area lands around y=640-690
# in PDF coordinates (0,0 = bottom-left in PDF, but PyMuPDF uses top-left).
#
# With tighter spacing, the signature line is approximately at y=665
# from the top in PyMuPDF coordinates.
# Page = 1 (1-indexed for stamper which does page - 1)
# =============================================================================

SIGNATURE_COORDS = {
    "applicant_1": {
        "page": 1,       # 1-indexed → stamper does 1-1=0 → first page
        "x": 58,
        "y": 525,
        "width": 200,
        "height": 30,
        "label": "Applicant Signature"
    },
    "applicant_2": {
        "page": 1,
        "x": 310,
        "y": 525,
        "width": 200,
        "height": 30,
        "label": "Co-Applicant Signature"
    }
}


def get_signature_coords(signer_index: int) -> Dict[str, Any]:
    if signer_index == 0:
        return SIGNATURE_COORDS["applicant_1"]
    else:
        return SIGNATURE_COORDS["applicant_2"]


# =============================================================================
# PDF GENERATOR
# =============================================================================

def build_privacy_consent(data: Dict[str, Any]) -> bytes:
    """
    Generate a filled Privacy Consent (Schedule A) PDF.
    Designed to fit on a single page with tighter spacing.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Heading1"],
        fontSize=12, spaceAfter=2, spaceBefore=0,
        textColor=colors.HexColor("#1e3a5f")
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=9, spaceAfter=2, spaceBefore=4,
        textColor=colors.HexColor("#1e3a5f")
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=8, spaceAfter=3, leading=11
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=7, textColor=colors.gray, spaceAfter=1
    )
    small_style = ParagraphStyle(
        "Small", parent=styles["Normal"],
        fontSize=7, textColor=colors.gray
    )
    bold_style = ParagraphStyle(
        "Bold", parent=styles["Normal"],
        fontSize=8, spaceAfter=3, leading=11,
        fontName="Helvetica-Bold"
    )

    story = []

    # ── Header ──
    story.append(Paragraph('SCHEDULE "A"', title_style))
    story.append(Paragraph("Residential Rental Application Privacy Consent Form", heading_style))
    story.append(Paragraph(
        "(For one or two co-tenancy applicants — otherwise complete a separate application)",
        small_style
    ))
    story.append(Spacer(1, 4))

    # ── Definitions ──
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    story.append(Paragraph("Definitions: Information", heading_style))
    story.append(Paragraph(
        'The word <b>"Information"</b> means credit information, personal information, and information '
        "about the services you use that are provided by the Landlord as listed in this rental application "
        "and information relating to your tenancy at the Premises applied for in this rental application "
        "including information regarding the duration of your tenancy, monthly rent, emergency contacts "
        "and any matters relating to your lease/tenancy agreement, including misrepresentations relating "
        "to, defaults under and/or breaches of your lease/tenancy agreement or any other matter "
        "experienced by The Landlord.",
        body_style
    ))

    story.append(Paragraph(
        '<b>"Credit Information"</b> means information about you, including your name, age, date of birth, '
        "occupation, place of residence, previous places of residence, occupancy length, marital status, "
        "co-occupant's/spouse's name and age, number of dependants, particulars of education or professional "
        "qualifications, field of employment, places of employment, previous places of employment, "
        "employment durations, estimated income, paying habits, outstanding debt obligations, cost of living "
        "obligations, involvement in bankruptcy proceedings or landlord and tenant disputes, assets, and "
        "banking information.",
        body_style
    ))

    story.append(Paragraph(
        '<b>"Personal Information"</b> means information about you other than credit information that is '
        "relevant to your suitability as a tenant, including information gathered from references concerning "
        "your character, reputation, physical or personal characteristics or mode of living or about any "
        "other matter or experience concerning you that is relevant to your suitability as a tenant.",
        body_style
    ))

    # ── Collection, Use and Disclosure ──
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Paragraph("Collection, Use and Disclosure of Information", heading_style))
    story.append(Paragraph(
        "In consideration for the Landlord accepting you as a tenant and entering into a lease/tenancy "
        "agreement with you, you expressly consent to and authorize the following:",
        body_style
    ))

    consents = [
        "The Landlord may obtain Information about you through a tenancy and/or credit report conducted "
        "by Rent Check Credit Bureau and as permitted or required by law.",

        "The Landlord may use Information about you to determine your suitability as a tenant and as "
        "permitted or required by law.",

        "The Landlord may disclose Credit Information about you to Rent Check Credit Bureau for inclusion "
        "within a database of rent-roll information and within a tenancy file on you, for purposes of: "
        "tenant reporting and credit reporting; establishing a credit and rental history; maintaining "
        "aggregate statistical data for tenancy and credit scoring; and supporting the credit approval "
        "process in accordance with governing legislation.",

        "You expressly authorize Rent Check Credit Bureau to retain positive Credit Information regarding "
        "you for the purposes outlined above, for up to 20 (twenty) years. Negative Credit Information "
        "shall be maintained on record in accordance with provincial credit and consumer reporting acts.",

        "You agree that all statements on this Residential Rental Application are true and you expressly "
        "authorize all references given to release information about you to the Landlord for verification.",
    ]

    for i, consent in enumerate(consents, 1):
        story.append(Paragraph(f"{i}. {consent}", body_style))

    story.append(Spacer(1, 4))

    # ── Property ──
    if data.get("building"):
        building_text = data.get("building") or ""
        if data.get("unit_number"):
            building_text += f", Unit {data['unit_number']}"
        story.append(Paragraph(
            f"Property applied for: <b>{building_text}</b>",
            body_style
        ))
        story.append(Spacer(1, 2))

    # ── Consent acknowledgement ──
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Please provide your consent by signing in the appropriate space below:",
        bold_style
    ))
    story.append(Paragraph(
        "I have read, understood and voluntarily agree to the terms and conditions outlined above.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # ── Signature blocks ──
    co_applicants = data.get("co_applicants") or []
    co_name = co_applicants[0].get("name") if co_applicants else ""

    story.append(Table([
        [
            [
                Paragraph("Applicant Signature", label_style),
                Spacer(1, 30),
                HRFlowable(width="90%", thickness=0.5, color=colors.gray),
                Spacer(1, 3),
                Paragraph(f"Print Name: {data.get('prospect_name') or '_______________'}", small_style),
                Paragraph("Date (yyyy/mm/dd): _______________", small_style),
            ],
            [
                Paragraph("Co-Applicant Signature", label_style),
                Spacer(1, 30),
                HRFlowable(width="90%", thickness=0.5, color=colors.gray),
                Spacer(1, 3),
                Paragraph(f"Print Name: {co_name or '_______________'}", small_style),
                Paragraph("Date (yyyy/mm/dd): _______________", small_style),
            ],
        ]
    ], colWidths=["50%", "50%"], style=TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ])))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "MS.RTAC.20041201.v.en.4.1.1 — Rent Check Credit Bureau",
        small_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(f"📄 Privacy Consent PDF generated ({len(pdf_bytes)} bytes)")
    return pdf_bytes