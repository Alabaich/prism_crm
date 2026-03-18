"""
stamper.py
Generic PDF stamper — places a signature PNG at specific coordinates on a PDF page.
Used by all document types (applications, leases, etc.)

Usage:
    from services.pdf.stamper import stamp_signature

    stamp_signature(
        pdf_path="storage/assembled/form_410_123.pdf",
        output_path="storage/signed/form_410_123_signed.pdf",
        signatures=[
            {
                "page": 1,           # 1-indexed
                "x": 100,            # points from left
                "y": 650,            # points from top
                "width": 200,        # bounding box width
                "height": 60,        # bounding box height
                "signature_b64": "data:image/png;base64,..."
            }
        ]
    )
"""

import fitz  # PyMuPDF
import base64
import io
import logging
from typing import List, Dict, Any

logger = logging.getLogger("pdf.stamper")


def stamp_signature(
    pdf_path: str,
    output_path: str,
    signatures: List[Dict[str, Any]]
) -> str:
    """
    Stamps one or more signatures onto a PDF.

    Args:
        pdf_path:    Path to the source PDF (assembled, unsigned)
        output_path: Path to save the signed PDF
        signatures:  List of signature dicts, each with:
                        page         — 1-indexed page number
                        x, y         — position in points from top-left
                        width        — bounding box width in points
                        height       — bounding box height in points
                        signature_b64 — base64 PNG string (with or without data: prefix)

    Returns:
        output_path on success

    Raises:
        Exception on failure
    """
    doc = fitz.open(pdf_path)

    for sig in signatures:
        page_num = sig["page"] - 1  # convert to 0-indexed
        if page_num < 0 or page_num >= len(doc):
            raise ValueError(f"Page {sig['page']} does not exist in {pdf_path} (total pages: {len(doc)})")

        page = doc[page_num]

        # Clean base64 string — strip data:image/png;base64, prefix if present
        b64_data = sig["signature_b64"]
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]

        # Decode PNG bytes
        img_bytes = base64.b64decode(b64_data)

        # Define placement rectangle
        rect = fitz.Rect(
            sig["x"],
            sig["y"],
            sig["x"] + sig["width"],
            sig["y"] + sig["height"]
        )

        # Insert image onto page
        page.insert_image(rect, stream=img_bytes, keep_proportion=True)

        logger.info(f"✍️ Stamped signature on page {sig['page']} at ({sig['x']}, {sig['y']}) in {pdf_path}")

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    logger.info(f"✅ Signed PDF saved to {output_path}")
    return output_path


def stamp_text_fields(
    pdf_path: str,
    output_path: str,
    fields: List[Dict[str, Any]]
) -> str:
    """
    Stamps text fields onto a PDF (for pre-filling form data).

    Args:
        pdf_path:    Path to source PDF
        output_path: Path to save the filled PDF
        fields:      List of field dicts, each with:
                        page     — 1-indexed page number
                        x, y     — position in points from top-left
                        text     — text to insert
                        fontsize — font size (default 10)
                        color    — RGB tuple (default black: (0, 0, 0))

    Returns:
        output_path on success
    """
    doc = fitz.open(pdf_path)

    for field in fields:
        page_num = field["page"] - 1
        if page_num < 0 or page_num >= len(doc):
            raise ValueError(f"Page {field['page']} does not exist in {pdf_path}")

        page = doc[page_num]

        page.insert_text(
            point=fitz.Point(field["x"], field["y"]),
            text=str(field.get("text", "")),
            fontsize=field.get("fontsize", 10),
            color=field.get("color", (0, 0, 0)),
            fontname="helv",
        )

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    logger.info(f"✅ Text-filled PDF saved to {output_path}")
    return output_path