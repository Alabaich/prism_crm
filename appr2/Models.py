# ... existing code ...
class Application(Base):
    __tablename__ = "applications"
    # ... existing code ...
    status = Column(String(50), default="Pending") # Pending, Approved, Rejected, Revision Requested
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    revision_notes = Column(Text, nullable=True)

    # Docs
    id_document_id = Column(Integer, ForeignKey("docs.id"), nullable=True)
# ... existing code ...