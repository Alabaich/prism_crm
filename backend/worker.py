import time
import logging
import sys

# 1. Import the process functions from your individual workers
from workers.appartements_worker import process_mailbox as run_appartements_job
from workers.rhenti_worker import process_rhenti_mailbox as run_rhenti_job

# Configure Orchestrator Logging
sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - Orchestrator - %(levelname)s - %(message)s'
)
logger = logging.getLogger("MasterWorker")

def run_all_jobs():
    """
    Runs jobs sequentially to avoid Microsoft Graph API rate limits
    and to prevent token.json from being overwritten simultaneously.
    """
    logger.info("--------------------------------------------------")
    logger.info("🔄 Starting Master Scrape Cycle...")

    # Job 1: Appartements
    try:
        logger.info("▶️ Triggering Appartements Worker")
        run_appartements_job()
    except Exception as e:
        logger.error(f"💥 Appartements worker crashed during execution: {e}")

    # Small delay between workers to give the API/DB a breath
    time.sleep(5) 

    # Job 2: Rhenti
    try:
        logger.info("▶️ Triggering Rhenti Worker")
        run_rhenti_job()
    except Exception as e:
        logger.error(f"💥 Rhenti worker crashed during execution: {e}")

    logger.info("✅ Master Scrape Cycle Complete.")
    logger.info("--------------------------------------------------")

if __name__ == "__main__":
    logger.info("🚀 Prism CRM Worker Orchestrator Starting Up...")

    # Main infinite loop
    while True:
        run_all_jobs()
        
        logger.info("💤 Orchestrator sleeping for 1 hour...")
        time.sleep(3600)  # Sleep for 1 hour before checking emails again