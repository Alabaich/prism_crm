# scripts/backfill_buildings.py
# Usage:
#   python backfill_buildings.py --dry-run   ← preview only, no writes
#   python backfill_buildings.py             ← apply to DB

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
from models import Booking, Lead, Building

DRY_RUN = '--dry-run' in sys.argv

def run():
    db = SessionLocal()
    try:
        # Load building name → (id, assigned_admin_id) map
        buildings = db.query(Building).all()
        building_map = {b.name: b for b in buildings}

        print(f"Buildings found: {[b.name for b in buildings]}")
        print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE WRITE'}")
        print("-" * 50)

        # --- Backfill Bookings ---
        bookings = db.query(Booking).filter(Booking.building_id == None).all()
        print(f"Bookings to backfill: {len(bookings)}")

        booking_matched = 0
        booking_skipped = 0
        for b in bookings:
            match = building_map.get(b.building)
            if match:
                print(f"  Booking {b.id}: '{b.building}' → building_id={match.id}, admin_id={match.assigned_admin_id}")
                if not DRY_RUN:
                    b.building_id = match.id
                    b.assigned_admin_id = match.assigned_admin_id
                booking_matched += 1
            else:
                print(f"  Booking {b.id}: '{b.building}' → NO MATCH, skipping")
                booking_skipped += 1

        # --- Backfill Leads ---
        leads = db.query(Lead).filter(Lead.assigned_admin_id == None).all()
        print(f"\nLeads to backfill: {len(leads)}")

        lead_matched = 0
        lead_skipped = 0
        for lead in leads:
            # Match lead via their most recent booking
            latest_booking = (
                db.query(Booking)
                .filter(Booking.lead_id == lead.id, Booking.building_id != None)
                .order_by(Booking.created_at.desc())
                .first()
            )
            if latest_booking and latest_booking.assigned_admin_id:
                print(f"  Lead {lead.id} '{lead.prospect_name}': via booking {latest_booking.id} → admin_id={latest_booking.assigned_admin_id}")
                if not DRY_RUN:
                    lead.assigned_admin_id = latest_booking.assigned_admin_id
                lead_matched += 1
            else:
                print(f"  Lead {lead.id} '{lead.prospect_name}': no booking match, skipping")
                lead_skipped += 1

        if not DRY_RUN:
            db.commit()
            print("\n✅ Committed to database.")
        else:
            print("\n👁  Dry run complete — nothing written.")

        print(f"\nBookings: {booking_matched} matched, {booking_skipped} skipped")
        print(f"Leads:    {lead_matched} matched, {lead_skipped} skipped")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()