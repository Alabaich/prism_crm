from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

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

@app.get("/")
def read_root():
    return {
        "status": "System is online",
        "database": "Connected",
        "system": "Prism CRM Unified Engine"
    }

# We will add router includes here (auth, leads, bookings) as we build them!