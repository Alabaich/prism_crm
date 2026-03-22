"""
doc_analyzer.py — Document metadata analyzer.

Extracts EXIF data, editing software traces, and suspicious indicators
from uploaded images and PDFs. Stores structured results as JSON
on the Doc record for future AI risk assessment.

Usage:
    from services.doc_analyzer import analyze_document
    
    result = analyze_document(file_path="/code/storage/uploads/123/id_upload_20260319.jpg")
    # Returns dict with metadata + flags, ready for AI consumption

No external APIs needed — pure Python analysis.
"""

import os
import io
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

logger = logging.getLogger("doc_analyzer")

# Try importing optional libraries
try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    logger.warning("Pillow not installed — image analysis disabled")

try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False


# Known editing software signatures
EDITING_SOFTWARE = [
    "photoshop", "gimp", "pixlr", "canva", "paint.net", "affinity",
    "lightroom", "capture one", "snapseed", "fotor", "befunky",
    "picmonkey", "photoscape", "inkscape", "illustrator", "sketch",
    "figma", "corel", "acorn", "pixelmator",
]

# Known screenshot indicators
SCREENSHOT_SOFTWARE = [
    "screenshot", "snipping", "greenshot", "sharex", "snagit",
    "lightshot", "gyazo", "puush",
]

# Common phone/camera manufacturers (legitimate source)
LEGITIMATE_SOURCES = [
    "apple", "samsung", "google", "huawei", "xiaomi", "oneplus",
    "sony", "canon", "nikon", "fujifilm", "olympus", "panasonic",
    "lg", "motorola", "oppo", "vivo", "realme",
]


def analyze_document(file_path: str) -> Dict[str, Any]:
    """
    Analyze a document file and return structured metadata + flags.
    
    Returns:
        {
            "analyzed_at": "2026-03-19T...",
            "file_info": { size, extension, mime_detected },
            "metadata": { ... raw EXIF/PDF metadata ... },
            "flags": [ list of suspicious findings ],
            "indicators": {
                "has_exif": bool,
                "has_editing_software": bool,
                "is_screenshot": bool,
                "has_gps": bool,
                "has_camera_info": bool,
                "dates_consistent": bool,
                "resolution_normal": bool,
                "file_type_matches": bool,
            },
            "risk_signals": [
                { "signal": "...", "severity": "low|medium|high", "detail": "..." }
            ],
            "summary": "brief text summary for AI consumption"
        }
    """
    result = {
        "analyzed_at": datetime.utcnow().isoformat(),
        "file_info": {},
        "metadata": {},
        "flags": [],
        "indicators": {},
        "risk_signals": [],
        "summary": "",
    }

    if not os.path.exists(file_path):
        result["flags"].append("File not found")
        result["summary"] = "File not found at specified path."
        return result

    # ── Basic file info ──
    file_size = os.path.getsize(file_path)
    extension = os.path.splitext(file_path)[1].lower()
    result["file_info"] = {
        "size_bytes": file_size,
        "size_kb": round(file_size / 1024, 1),
        "extension": extension,
        "filename": os.path.basename(file_path),
    }

    # Route to appropriate analyzer
    if extension in (".jpg", ".jpeg", ".png", ".webp"):
        _analyze_image(file_path, result)
    elif extension == ".pdf":
        _analyze_pdf(file_path, result)
    else:
        result["flags"].append(f"Unsupported file type: {extension}")

    # ── Generate summary for AI ──
    result["summary"] = _build_summary(result)

    return result


def _analyze_image(file_path: str, result: Dict[str, Any]):
    """Analyze an image file for metadata and editing indicators."""
    if not HAS_PIL:
        result["flags"].append("Image analysis unavailable (Pillow not installed)")
        return

    try:
        img = Image.open(file_path)
    except Exception as e:
        result["flags"].append(f"Failed to open image: {str(e)}")
        return

    # ── Basic image properties ──
    width, height = img.size
    result["file_info"]["width"] = width
    result["file_info"]["height"] = height
    result["file_info"]["format"] = img.format
    result["file_info"]["mode"] = img.mode

    # ── Resolution check ──
    # Screenshots are typically exact monitor resolutions
    common_screenshot_sizes = [
        (1920, 1080), (2560, 1440), (1366, 768), (1440, 900),
        (1536, 864), (3840, 2160), (1280, 720), (1280, 800),
        (2560, 1600), (3440, 1440),
    ]
    is_screenshot_size = (width, height) in common_screenshot_sizes or (height, width) in common_screenshot_sizes
    result["indicators"]["resolution_normal"] = not is_screenshot_size

    if is_screenshot_size:
        result["risk_signals"].append({
            "signal": "screenshot_resolution",
            "severity": "medium",
            "detail": f"Image dimensions ({width}x{height}) match common screen resolution — may be a screenshot rather than a photo/scan."
        })

    # ── EXIF extraction ──
    exif_data = {}
    raw_exif = None

    try:
        raw_exif = img._getexif()
    except (AttributeError, Exception):
        pass

    if raw_exif:
        result["indicators"]["has_exif"] = True

        for tag_id, value in raw_exif.items():
            tag_name = TAGS.get(tag_id, str(tag_id))

            # Skip binary/large data
            if isinstance(value, bytes) and len(value) > 100:
                exif_data[tag_name] = f"[binary data, {len(value)} bytes]"
                continue
            
            try:
                # Make JSON-serializable
                if isinstance(value, (int, float, str, bool)):
                    exif_data[tag_name] = value
                elif isinstance(value, tuple):
                    exif_data[tag_name] = str(value)
                else:
                    exif_data[tag_name] = str(value)
            except:
                exif_data[tag_name] = "[unreadable]"

        result["metadata"] = exif_data

        # ── Check for editing software ──
        software = str(exif_data.get("Software", "")).lower()
        make = str(exif_data.get("Make", "")).lower()
        
        has_editing = any(ed in software for ed in EDITING_SOFTWARE)
        has_screenshot = any(sc in software for sc in SCREENSHOT_SOFTWARE)
        has_camera = any(cam in make for cam in LEGITIMATE_SOURCES)

        result["indicators"]["has_editing_software"] = has_editing
        result["indicators"]["is_screenshot"] = has_screenshot
        result["indicators"]["has_camera_info"] = has_camera

        if has_editing:
            result["risk_signals"].append({
                "signal": "editing_software_detected",
                "severity": "high",
                "detail": f"Image was processed with editing software: '{exif_data.get('Software', 'unknown')}'. Document may have been altered."
            })
            result["flags"].append(f"Editing software detected: {exif_data.get('Software')}")

        if has_screenshot:
            result["risk_signals"].append({
                "signal": "screenshot_software",
                "severity": "medium",
                "detail": f"Image appears to be a screenshot (software: '{exif_data.get('Software', '')}')."
            })

        if has_camera:
            # Good sign — image came from a real device
            pass

        # ── GPS check ──
        has_gps = "GPSInfo" in exif_data
        result["indicators"]["has_gps"] = has_gps

        # ── Date consistency check ──
        date_original = exif_data.get("DateTimeOriginal")
        date_digitized = exif_data.get("DateTimeDigitized")
        date_modified = exif_data.get("DateTime")

        dates_consistent = True
        if date_original and date_modified:
            if date_original != date_modified:
                dates_consistent = False
                result["risk_signals"].append({
                    "signal": "date_mismatch",
                    "severity": "medium",
                    "detail": f"Original date ({date_original}) differs from modification date ({date_modified}). File may have been re-saved or edited."
                })

        result["indicators"]["dates_consistent"] = dates_consistent

    else:
        result["indicators"]["has_exif"] = False
        result["indicators"]["has_editing_software"] = False
        result["indicators"]["is_screenshot"] = False
        result["indicators"]["has_camera_info"] = False
        result["indicators"]["has_gps"] = False
        result["indicators"]["dates_consistent"] = True

        # No EXIF at all — could be stripped (suspicious) or just a PNG/screenshot
        if img.format == "JPEG":
            result["risk_signals"].append({
                "signal": "no_exif_jpeg",
                "severity": "medium",
                "detail": "JPEG file has no EXIF metadata. Original photos usually contain camera/device information. Metadata may have been stripped."
            })
            result["flags"].append("No EXIF data in JPEG — metadata may have been stripped")
        elif img.format == "PNG":
            # PNGs from screenshots typically lack EXIF — less suspicious
            result["risk_signals"].append({
                "signal": "png_format",
                "severity": "low",
                "detail": "File is PNG format. This is common for screenshots and digitally created documents."
            })

    # ── DPI check ──
    try:
        dpi = img.info.get("dpi")
        if dpi:
            result["file_info"]["dpi"] = dpi
            if isinstance(dpi, tuple) and (dpi[0] != dpi[1]):
                result["risk_signals"].append({
                    "signal": "dpi_inconsistency",
                    "severity": "low",
                    "detail": f"Horizontal DPI ({dpi[0]}) differs from vertical DPI ({dpi[1]}). Unusual but not necessarily suspicious."
                })
    except:
        pass

    img.close()


def _analyze_pdf(file_path: str, result: Dict[str, Any]):
    """Analyze a PDF file for metadata and creation indicators."""
    if not HAS_FITZ:
        result["flags"].append("PDF analysis unavailable (PyMuPDF not installed)")
        return

    try:
        doc = fitz.open(file_path)
    except Exception as e:
        result["flags"].append(f"Failed to open PDF: {str(e)}")
        return

    # ── PDF metadata ──
    meta = doc.metadata or {}
    result["metadata"] = {k: v for k, v in meta.items() if v}
    result["file_info"]["page_count"] = len(doc)

    # ── Check producer/creator software ──
    producer = (meta.get("producer") or "").lower()
    creator = (meta.get("creator") or "").lower()
    
    has_editing = any(ed in producer or ed in creator for ed in EDITING_SOFTWARE)
    result["indicators"]["has_editing_software"] = has_editing

    if has_editing:
        result["risk_signals"].append({
            "signal": "pdf_editing_software",
            "severity": "high",
            "detail": f"PDF was created/modified with editing software. Producer: '{meta.get('producer', '')}', Creator: '{meta.get('creator', '')}'."
        })
        result["flags"].append(f"PDF editing software: producer='{meta.get('producer')}', creator='{meta.get('creator')}'")

    # ── Check if PDF is just a single image (suspicious for a "document") ──
    for i, page in enumerate(doc):
        images = page.get_images()
        text = page.get_text().strip()
        
        if images and not text:
            result["risk_signals"].append({
                "signal": "image_only_pdf",
                "severity": "low",
                "detail": f"Page {i+1} contains only images with no selectable text. Could be a scan (normal) or a fabricated document."
            })

    # ── Date checks ──
    created = meta.get("creationDate", "")
    modified = meta.get("modDate", "")
    if created and modified and created != modified:
        result["risk_signals"].append({
            "signal": "pdf_date_mismatch",
            "severity": "low",
            "detail": f"PDF creation date differs from modification date. May have been edited after initial creation."
        })
        result["indicators"]["dates_consistent"] = False
    else:
        result["indicators"]["dates_consistent"] = True

    doc.close()


def _build_summary(result: Dict[str, Any]) -> str:
    """Build a human/AI-readable summary of the analysis."""
    parts = []
    
    info = result["file_info"]
    parts.append(f"File: {info.get('filename', 'unknown')}, {info.get('size_kb', 0)}KB")
    
    if info.get("width"):
        parts.append(f"Dimensions: {info['width']}x{info['height']}")
    
    if info.get("page_count"):
        parts.append(f"Pages: {info['page_count']}")

    indicators = result["indicators"]
    
    if indicators.get("has_exif"):
        parts.append("Has EXIF metadata")
    elif info.get("extension") in (".jpg", ".jpeg"):
        parts.append("No EXIF metadata (unusual for JPEG)")
    
    if indicators.get("has_editing_software"):
        parts.append("EDITING SOFTWARE DETECTED")
    
    if indicators.get("is_screenshot"):
        parts.append("Appears to be a screenshot")
    
    if indicators.get("has_camera_info"):
        parts.append("Contains camera/device information (good sign)")
    
    if indicators.get("has_gps"):
        parts.append("Contains GPS data")
    
    if not indicators.get("dates_consistent", True):
        parts.append("Date inconsistencies found")
    
    if not indicators.get("resolution_normal", True):
        parts.append("Resolution matches common screen size")

    risk_count = len(result["risk_signals"])
    high_risks = sum(1 for r in result["risk_signals"] if r["severity"] == "high")
    medium_risks = sum(1 for r in result["risk_signals"] if r["severity"] == "medium")
    
    if high_risks:
        parts.append(f"HIGH RISK SIGNALS: {high_risks}")
    if medium_risks:
        parts.append(f"Medium risk signals: {medium_risks}")
    if risk_count == 0:
        parts.append("No risk signals detected")

    return " | ".join(parts)


def analyze_and_store(file_path: str, doc_id: int, db) -> Dict[str, Any]:
    """
    Analyze a document and store results on the Doc record.
    
    Args:
        file_path: Path to the file
        doc_id: ID of the Doc record
        db: SQLAlchemy session
    
    Returns:
        Analysis result dict
    """
    from models import Doc
    
    result = analyze_document(file_path)
    
    doc = db.query(Doc).filter(Doc.id == doc_id).first()
    if doc:
        # Store analysis as JSON in the notes field (or a dedicated column later)
        existing_notes = doc.notes or ""
        doc.notes = existing_notes + f"\n\n--- METADATA ANALYSIS ---\n{json.dumps(result, indent=2, default=str)}"
        db.commit()
        logger.info(f"📊 Document {doc_id} analyzed: {len(result['risk_signals'])} risk signals")
    
    return result