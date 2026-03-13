from contextlib import asynccontextmanager  # <-- 1. Import this
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from scheduler import start_scheduler  # <-- 2. Import your scheduler from the Canvas

# 1. Import your modular routers 
from api.endpoints import webhooks, leads, auth, get_leads, public_bookings, admin_bookings

# This automatically creates the database tables in Postgres on startup
Base.metadata.create_all(bind=engine)

# --- 3. NEW: Lifespan manager for background tasks ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    scheduler = start_scheduler()
    yield
    # --- Shutdown ---
    if scheduler:
        scheduler.shutdown()

# --- 4. Pass the lifespan to your FastAPI app ---
app = FastAPI(title="Prism CRM API", lifespan=lifespan)

# Setup CORS so your React frontend (on port 5173) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Register all the modular routers
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(leads.router, prefix="/leads", tags=["Leads"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(get_leads.router, prefix="/get_leads", tags=["GET Leads API"])
app.include_router(public_bookings.router, prefix="/bookings", tags=["Public Bookings"])
app.include_router(admin_bookings.router, prefix="/admin/bookings", tags=["Admin Bookings"])
# TODO: We will add app.include_router(bookings.router...) here later!

@app.get("/")
def read_root():
    return {
        "status": "System is online",
        "database": "Connected",
        "system": "Prism CRM Unified Engine"
    }

@app.get("/health")
def health():
    return {"status": "ok"}