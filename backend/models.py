from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ==============================================================================
# EXISTING MODELS (unchanged except Tenant)
# ==============================================================================

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Core Prospect Info
    prospect_name = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)

    # Source Info
    source = Column(String, nullable=True)
    integration_source = Column(String, nullable=True)

    # Property Info
    inquiry_date = Column(DateTime, nullable=True)
    property_name = Column(String, nullable=True)
    city = Column(String, nullable=True)
    beds = Column(String, nullable=True)
    baths = Column(String, nullable=True)

    # Mapping Columns
    move_in_date = Column(String, nullable=True)
    promotion = Column(String, nullable=True)

    # Status
    # Flow: New → Contacted → Applied → Approved → Tenant (Pending Signature)
    #                                 ↘ Rejected
    status = Column(String, default="New", index=True)

    # Debugging Columns
    debug_1 = Column(Text, nullable=True)
    debug_2 = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    bookings = relationship("Booking", back_populates="lead")
    tenant = relationship("Tenant", back_populates="lead", uselist=False)
    application = relationship("Application", back_populates="lead", uselist=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- FOREIGN KEY ---
    lead_id = Column(Integer, ForeignKey("leads.id"))

    # Booking Details
    building = Column(String, index=True)
    tour_date = Column(String, index=True)  # e.g., '2026-03-05'
    tour_time = Column(String)              # e.g., '14:00'

    status = Column(String, default="Scheduled")  # pending, confirmed, cancelled, Completed

    # Type: 'tour' | 'meeting' | 'move_in' | 'move_out'
    # Tours show in analytics, others do not.
    # All types block the same time slot to prevent double-booking.
    booking_type = Column(String, default="tour", nullable=False)

    # Outcome — only relevant for tours
    tour_outcome = Column(String, nullable=True)  # "Converted to Tenant", "No Show"

    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="bookings")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, index=True)

    user_account_id = Column(Integer, nullable=True)

    # lease_status flow:
    # Pending Signature → Active → Vacated
    lease_status = Column(String, default="Pending Signature")
    unit_number = Column(String, nullable=True)

    # Move-in / Move-out dates (set when booking is confirmed)
    move_in_date = Column(String, nullable=True)   # e.g., '2026-04-01'
    move_out_date = Column(String, nullable=True)  # e.g., '2027-03-31'

    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="tenant")
    document_packages = relationship("DocumentPackage", back_populates="tenant")
    move_events = relationship("MoveEvent", back_populates="tenant")


class BlockedDate(Base):
    __tablename__ = "blocked_dates"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # Format: YYYY-MM-DD
    reason = Column(String, nullable=True)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    is_active = Column(Boolean, default=True)


# ==============================================================================
# NEW: DOCS
# Universal file storage for the entire platform.
# Every other table references docs.id — docs knows nothing about its owner.
# ==============================================================================

class Doc(Base):
    __tablename__ = "docs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    file_name = Column(String, nullable=False)       # original filename
    file_path = Column(String, nullable=False)       # server disk path or bucket URL later
    file_type = Column(String, nullable=True)        # mime type: application/pdf, image/jpeg etc.
    doc_category = Column(String, nullable=True)     # 'id_upload' | 'income_proof' |
                                                     # 'signed_application' | 'signed_lease' |
                                                     # 'maintenance' | 'inspection' |
                                                     # 'email_template' | 'other'

    uploaded_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)  # null if applicant

    notes = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    uploaded_by_admin = relationship("AdminUser", foreign_keys=[uploaded_by])


# ==============================================================================
# NEW: APPLICATION
# Stores the rental application data collected before lease signing.
# Created by admin on behalf of the prospect.
# Approval triggers Tenant record creation.
# ==============================================================================

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, index=True)

    # --- Applicant #1 Employment / Income ---
    employer_name = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)   # Full-time, Part-time, Self-employed, Other
    monthly_income = Column(String, nullable=True)    # Stored as string to avoid rounding issues
    position_held = Column(String, nullable=True)
    length_of_employment = Column(String, nullable=True)

    # --- Applicant #1 Prior Employment ---
    prior_employer_name = Column(String, nullable=True)
    prior_position_held = Column(String, nullable=True)
    prior_length_of_employment = Column(String, nullable=True)

    # --- Co-applicants (2–5 people, stored as JSON array) ---
    # Each entry: { name, date_of_birth, occupation, employer, monthly_income }
    co_applicants = Column(JSON, nullable=True)

    # --- Other Occupants (non-signing, e.g. children) ---
    # Each entry: { name, relationship, age }
    other_occupants = Column(JSON, nullable=True)

    # --- ID / Credit Check ---
    id_verified = Column(Boolean, default=False)
    credit_check_score = Column(Integer, nullable=True)
    credit_check_notes = Column(Text, nullable=True)

    # --- Pet Info ---
    has_pet = Column(Boolean, default=False)
    pet_details = Column(Text, nullable=True)        # breed, count, weight etc.

    # --- Parking ---
    parking_requested = Column(Boolean, default=False)
    parking_spot = Column(String, nullable=True)

    # --- References (optional) ---
    reference_1_name = Column(String, nullable=True)
    reference_1_phone = Column(String, nullable=True)
    reference_2_name = Column(String, nullable=True)
    reference_2_phone = Column(String, nullable=True)

    # --- Previous Addresses ---
    # Stored as JSON: [{ address, from, to, landlord_name, landlord_phone }]
    previous_addresses = Column(JSON, nullable=True)

    # --- Vacating Reason ---
    vacating_reason = Column(Text, nullable=True)

    # --- Document References (FK → docs.id) ---
    id_document_id     = Column(Integer, ForeignKey("docs.id"), nullable=True)
    income_proof_id    = Column(Integer, ForeignKey("docs.id"), nullable=True)
    signed_form_410_id = Column(Integer, ForeignKey("docs.id"), nullable=True)
    signed_consent_id  = Column(Integer, ForeignKey("docs.id"), nullable=True)

    # --- Status & Approval ---
    # Pending → Approved → Tenant created
    #         ↘ Rejected
    status = Column(String, default="Pending", index=True)
    approved_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="application")
    approved_by_admin = relationship("AdminUser", foreign_keys=[approved_by])
    id_document      = relationship("Doc", foreign_keys=[id_document_id])
    income_proof     = relationship("Doc", foreign_keys=[income_proof_id])
    signed_form_410  = relationship("Doc", foreign_keys=[signed_form_410_id])
    signed_consent   = relationship("Doc", foreign_keys=[signed_consent_id])


# ==============================================================================
# NEW: MOVE EVENTS
# Separate from bookings — no calendar blocking, no conflict detection.
# Just a scheduled list of move-ins and move-outs per tenant.
# ==============================================================================

class MoveEvent(Base):
    __tablename__ = "move_events"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    # 'move_in' | 'move_out'
    event_type = Column(String, nullable=False)

    scheduled_date = Column(String, nullable=False)   # e.g. '2026-04-01'
    scheduled_time = Column(String, nullable=False)   # e.g. '10:00' (9-5 enforced in backend)

    building = Column(String, nullable=True)
    unit_number = Column(String, nullable=True)

    elevator_reserved = Column(Boolean, default=False)

    # Scheduled | Completed | Cancelled
    status = Column(String, default="Scheduled")

    notes = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)

    # --- RELATIONSHIPS ---
    tenant = relationship("Tenant", back_populates="move_events")
    created_by_admin = relationship("AdminUser", foreign_keys=[created_by])


# ==============================================================================
# NEW: DOCUMENT PACKAGES
# Universal signing system for both applications and leases.
# One package = one signing event (e.g. rental application OR lease).
# ==============================================================================

class DocumentPackage(Base):
    __tablename__ = "document_packages"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # package_type: "application" | "lease"
    package_type = Column(String, nullable=False, index=True)

    # Links to tenant (set when package is for a lease or after approval)
    # For application packages, tenant_id may be null until approved
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    # For application packages — link directly to lead
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)

    # Unit / building info
    building = Column(String, nullable=True)
    unit_number = Column(String, nullable=True)

    # Lease-specific fields (null for application packages)
    lease_start = Column(String, nullable=True)   # e.g., '2026-04-01'
    lease_end = Column(String, nullable=True)     # e.g., '2027-03-31'
    monthly_rent = Column(String, nullable=True)

    # Signer tenant IDs — JSON array of tenant IDs (1–5 people)
    # For application packages, this is lead IDs until tenants are created
    signer_ids = Column(JSON, nullable=False, default=list)

    # Status flow:
    # draft → ready → sent → partially_signed → completed (happy path)
    # sent/partially_signed → rejected (any signer declines)
    # sent/partially_signed → voided (admin voids)
    status = Column(String, default="draft", index=True)

    # Admin who created this package
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)

    # --- RELATIONSHIPS ---
    tenant = relationship("Tenant", back_populates="document_packages")
    lead = relationship("Lead")
    documents = relationship("PackageDocument", back_populates="package", cascade="all, delete-orphan")
    signing_sessions = relationship("SigningSession", back_populates="package", cascade="all, delete-orphan")
    created_by_admin = relationship("AdminUser", foreign_keys=[created_by])


class PackageDocument(Base):
    __tablename__ = "package_documents"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    package_id = Column(Integer, ForeignKey("document_packages.id"), nullable=False, index=True)

    # Document type:
    # Application: "rental_application" | "privacy_consent"
    # Lease: "ontario_standard_lease" | "pet_addendum" | "parking_agreement" | "rules_schedule" | "custom_terms"
    document_type = Column(String, nullable=False)

    display_name = Column(String, nullable=True)    # Human-readable label shown in UI
    page_count = Column(Integer, nullable=True)     # Total pages — set after PDF is generated
    sort_order = Column(Integer, default=0)         # Order docs appear in signing flow

    # Paths on server disk (relative to backend/storage/)
    assembled_pdf_path = Column(String, nullable=True)  # Pre-signing assembled PDF
    signed_pdf_path = Column(String, nullable=True)     # Final signed PDF
    doc_id = Column(Integer, ForeignKey("docs.id"), nullable=True)  # Final doc in docs table

    # --- RELATIONSHIPS ---
    package = relationship("DocumentPackage", back_populates="documents")
    doc = relationship("Doc", foreign_keys=[doc_id])


class SigningSession(Base):
    __tablename__ = "signing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    package_id = Column(Integer, ForeignKey("document_packages.id"), nullable=False, index=True)

    # The signer — tenant_id for lease packages, lead_id for application packages
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)

    signer_name = Column(String, nullable=True)
    signer_email = Column(String, nullable=True)

    # Unique UUID token for the signing link: prismpm.cloud/sign/{token}
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)

    # Status: pending | in_progress | completed | declined | expired
    status = Column(String, default="pending", index=True)

    # Electronic consent (Ontario ECA requirement)
    consent_given_at = Column(DateTime, nullable=True)
    consent_ip_address = Column(String, nullable=True)

    # Per-page signing progress — JSON structure:
    # { "doc_id": { "page_num": { "signed_at": "...", "ip": "...", "signature_path": "..." } } }
    signatures = Column(JSON, nullable=True, default=dict)

    # Decline info
    declined_at = Column(DateTime, nullable=True)
    decline_reason = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    package = relationship("DocumentPackage", back_populates="signing_sessions")
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    lead = relationship("Lead", foreign_keys=[lead_id])