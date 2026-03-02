from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# 1. Import your modular routers 
# (Note: we dropped the 'app.' prefix because we are directly in the backend folder now)
from api.endpoints import webhooks, leads, auth, get_leads

# This automatically creates the database tables in Postgres on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Prism CRM API")

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
# TODO: We will add app.include_router(bookings.router...) here later!

@app.get("/")
def read_root():
    return {
        "status": "System is online",
        "database": "Connected",
        "system": "Prism CRM Unified Engine"
    }