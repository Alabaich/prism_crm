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
                "page": 2,           # 1-indexed (page 2 = second page)
                "x": 100,            # points from left
                "y": 572,            # points from top
                "width": 190,        # bounding box width
                "height": 18,        # bounding box height
                "signature_b64": "data:image/png;base64,..."
            }
        ]
    )
"""

import fitz  # PyMuPDF
import base64
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
                        page         — 1-indexed page number (1 = first page, 2 = second page)
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
        page_num = sig["page"] - 1  # convert 1-indexed to 0-indexed
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

        logger.info(f"✍️ Stamped signature on page {sig['page']} at ({sig['x']}, {sig['y']})")

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    logger.info(f"✅ Signed PDF saved to {output_path}")
    return output_path