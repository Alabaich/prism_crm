import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from models import Booking, Lead, SigningSession, DocumentPackage
from mailer import send_reminder_notification, send_application_reminder_48h, send_application_reminder_96h

logger = logging.getLogger("scheduler")


def process_daily_reminders():
    """
    Queries the database for confirmed tours happening today
    and sends a reminder email to the prospect.
    """
    logger.info("Running daily 9:00 AM reminder check...")
    db = SessionLocal()
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")

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
            success = send_reminder_notification(booking_info)
            if success:
                logger.info(f"Sent tour reminder to {lead.email} for booking {booking.id}")
            else:
                logger.error(f"Failed to send tour reminder to {lead.email} for booking {booking.id}")

    except Exception as e:
        logger.error(f"Error in process_daily_reminders: {e}")
    finally:
        db.close()


def process_application_reminders():
    """
    Checks signing_sessions for pending/in_progress applications and sends
    48h and 96h nudge emails. Flips reminded_48h / reminded_96h flags to
    prevent double-sending.
    """
    logger.info("Running application reminder check...")
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        cutoff_48h = now - timedelta(hours=48)
        cutoff_96h = now - timedelta(hours=96)

        # --- 48h reminders ---
        sessions_48h = (
            db.query(SigningSession)
            .join(DocumentPackage, SigningSession.package_id == DocumentPackage.id)
            .filter(
                SigningSession.status.in_(["pending", "in_progress"]),
                SigningSession.reminded_48h == False,
                SigningSession.created_at <= cutoff_48h,
                SigningSession.created_at > cutoff_96h,  # not yet in 96h window
                SigningSession.expires_at > now,
                DocumentPackage.status.notin_(["completed", "voided", "rejected"])
            )
            .all()
        )

        for session in sessions_48h:
            package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
            building = package.building if package else None
            success = send_application_reminder_48h(
                session.signer_name, session.signer_email, session.token, building
            )
            if success:
                session.reminded_48h = True
                logger.info(f"Sent 48h reminder to {session.signer_email} (session {session.id})")
            else:
                logger.error(f"Failed 48h reminder to {session.signer_email} (session {session.id})")

        # --- 96h reminders ---
        sessions_96h = (
            db.query(SigningSession)
            .join(DocumentPackage, SigningSession.package_id == DocumentPackage.id)
            .filter(
                SigningSession.status.in_(["pending", "in_progress"]),
                SigningSession.reminded_96h == False,
                SigningSession.created_at <= cutoff_96h,
                SigningSession.expires_at > now,
                DocumentPackage.status.notin_(["completed", "voided", "rejected"])
            )
            .all()
        )

        for session in sessions_96h:
            package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
            building = package.building if package else None
            success = send_application_reminder_96h(
                session.signer_name, session.signer_email, session.token, building
            )
            if success:
                session.reminded_96h = True
                logger.info(f"Sent 96h reminder to {session.signer_email} (session {session.id})")
            else:
                logger.error(f"Failed 96h reminder to {session.signer_email} (session {session.id})")

        db.commit()

    except Exception as e:
        logger.error(f"Error in process_application_reminders: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Initializes and starts the background scheduler."""
    scheduler = BackgroundScheduler()

    # Tour reminders — 9:00 AM daily
    scheduler.add_job(process_daily_reminders, CronTrigger(hour=9, minute=0))

    # Application reminders — 10:00 AM daily
    scheduler.add_job(process_application_reminders, CronTrigger(hour=10, minute=0))

    scheduler.start()
    logger.info("Scheduler started: tour reminders at 9 AM, application reminders at 10 AM.")
    return scheduler