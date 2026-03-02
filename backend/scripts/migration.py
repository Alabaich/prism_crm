import os
import sys
import psycopg2 
from sqlalchemy.orm import Session

# Add the parent directory to the path so we can import your FastAPI modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Lead  # This points to your NEW project's model

# ==========================================
# CONFIGURATION - UPDATED WITH REAL CREDENTIALS
# ==========================================
# Format: postgresql://DB_USER:DB_PASSWORD@IP_ADDRESS:PORT/DB_NAME
OLD_POSTGRES_URL = "postgresql://leads_postgres:PrismPM001!@187.124.67.223:5432/lead_db"

def migrate_from_old_postgres(db: Session):
    print("--- Starting migration from Old PostgreSQL ---")
    try:
        # 1. Connect directly to the old database
        print(f"Connecting to old database at 187.124.67.223:5432/lead_db...")
        old_pg_conn = psycopg2.connect(OLD_POSTGRES_URL)
        cursor = old_pg_conn.cursor()

        # 2. Fetch ALL data from the old table
        # We explicitly list all columns based on your old database.py
        query = """
            SELECT 
                created_at, prospect_name, email, phone, 
                source, integration_source, inquiry_date, property_name, 
                city, beds, baths, move_in_date, promotion, 
                status, debug_1, debug_2
            FROM leads
        """
        cursor.execute(query)
        old_records = cursor.fetchall()

        print(f"Found {len(old_records)} records in Old Postgres. Migrating...")

        # 3. Map and insert into the new database
        inserted_count = 0
        for row in old_records:
            # Unpack the tuple
            (created_at, prospect_name, email, phone, 
             source, integration_source, inquiry_date, property_name, 
             city, beds, baths, move_in_date, promotion, 
             status, debug_1, debug_2) = row

            # Create the new Lead object using your NEW SQLAlchemy model
            new_lead = Lead(
                created_at=created_at,
                prospect_name=prospect_name,
                email=email,
                phone=phone,
                source=source,
                integration_source=integration_source,
                inquiry_date=inquiry_date,
                property_name=property_name,
                city=city,
                beds=beds,
                baths=baths,
                move_in_date=move_in_date,
                promotion=promotion,
                status=status,
                debug_1=debug_1,
                debug_2=debug_2
            )
            
            db.add(new_lead)
            inserted_count += 1
        
        # Commit the transaction to save all new leads
        db.commit()
        print(f"✅ Successfully migrated {inserted_count} records from Old Postgres!\n")

    except Exception as e:
        print(f"❌ Error migrating from Postgres: {e}")
        db.rollback()
    finally:
        if 'old_pg_conn' in locals():
            cursor.close()
            old_pg_conn.close()

if __name__ == "__main__":
    print("Starting Data Migration Script...")
    
    # Open a session to your NEW destination database
    db_session = SessionLocal()
    
    try:
        migrate_from_old_postgres(db_session)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
    finally:
        db_session.close()