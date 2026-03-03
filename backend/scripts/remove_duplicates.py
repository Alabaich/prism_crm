import os
import sys

# --- PATH CONFIGURATION ---
# Get the directory of this script (backend/scripts)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the backend root directory (backend)
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)

# Add the backend root to sys.path so we can import the database and models
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

from database import SessionLocal
from models import Lead

def remove_exact_duplicates():
    db = SessionLocal()
    try:
        # Fetch all leads, ordering by ID so we always keep the oldest/first one
        all_leads = db.query(Lead).order_by(Lead.id.asc()).all()
        
        seen_identifiers = set()
        duplicates_to_delete = []

        for lead in all_leads:
            # Create a unique fingerprint based on the 4 exact columns
            # We convert to string to safely handle 'None' values
            identifier = (
                str(lead.property_name).strip().lower(),
                str(lead.prospect_name).strip().lower(),
                str(lead.email).strip().lower(),
                str(lead.debug_1).strip().lower()
            )

            # If we've seen this exact combination before, it's a duplicate
            if identifier in seen_identifiers:
                duplicates_to_delete.append(lead)
            else:
                # Otherwise, record it so we can check future rows against it
                seen_identifiers.add(identifier)

        print(f"🔍 Scanned {len(all_leads)} leads.")
        
        if not duplicates_to_delete:
            print("✅ No exact duplicates found! Your database is clean.")
            return

        print(f"🗑️ Found {len(duplicates_to_delete)} duplicate(s). Removing now...")

        # Delete the duplicates
        for dup in duplicates_to_delete:
            print(f"   - Deleting Duplicate ID {dup.id}: {dup.prospect_name} at {dup.property_name}")
            db.delete(dup)

        # Commit the deletions to the database
        db.commit()
        print(f"🎉 Successfully removed {len(duplicates_to_delete)} duplicate leads from the database!")

    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting Database Duplicate Cleanup Script...")
    remove_exact_duplicates()