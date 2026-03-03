import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from models import Booking, Lead
from mailer import send_reminder_notification

logger = logging.getLogger("scheduler")

def process_daily_reminders():
    """
    Queries the database for confirmed tours happening today 
    and sends a reminder email to the prospect.
    """
    logger.info("Running daily 9:00 AM reminder check...")
    db = SessionLocal()
    try:
        # Get today's date formatted to match your DB strings (e.g., '2026-03-15')
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # Find bookings for today that are confirmed or scheduled
        bookings = (
            db.query(Booking, Lead)
            .join(Lead, Booking.lead_id == Lead.id)
            .filter(Booking.tour_date == today_str)
            .filter(Booking.status.in_(["confirmed", "Scheduled"]))
            .all()
        )
        
        if not bookings:
            logger.info("No confirmed tours found for today. No reminders sent.")
            return

        for booking, lead in bookings:
            booking_info = {
                "id": booking.id,
                "name": lead.prospect_name,
                "email": lead.email,
                "building": booking.building,
                "date": booking.tour_date,
                "time": booking.tour_time
            }
            
            # Send the reminder
            success = send_reminder_notification(booking_info)
            if success:
                logger.info(f"Successfully sent reminder to {lead.email} for booking {booking.id}")
            else:
                logger.error(f"Failed to send reminder to {lead.email} for booking {booking.id}")
                
    except Exception as e:
        logger.error(f"An error occurred while processing daily reminders: {e}")
    finally:
        db.close()

def start_scheduler():
    """Initializes and starts the background scheduler."""
    scheduler = BackgroundScheduler()
    
    # Run every day at 09:00 AM
    trigger = CronTrigger(hour=9, minute=0)
    scheduler.add_job(process_daily_reminders, trigger)
    
    scheduler.start()
    logger.info("Scheduler started: Daily reminders set for 9:00 AM.")
    return scheduler