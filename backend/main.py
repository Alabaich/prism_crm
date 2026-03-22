from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from scheduler import start_scheduler

# --- Routers ---
from api.leads.admin      import router as leads_router
from api.leads.get        import router as get_leads_router
from api.webhooks.admin   import router as webhooks_router
from api.bookings.admin   import router as admin_bookings_router
from api.bookings.public  import router as public_bookings_router
from api.auth.admin       import router as auth_router
from api.applications.admin import router as applications_router
from api.applications.public import router as applications_public_router
from api.docs.admin import router as docs_router


Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_scheduler()
    yield
    if scheduler:
        scheduler.shutdown()

app = FastAPI(title="Prism CRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers — prefixes unchanged, frontend/nginx unaffected ---
app.include_router(webhooks_router,        prefix="/webhooks",       tags=["Webhooks"])
app.include_router(leads_router,           prefix="/leads",          tags=["Leads"])
app.include_router(auth_router,            prefix="/auth",           tags=["Auth"])
app.include_router(get_leads_router,       prefix="/get_leads",      tags=["Get Leads"])
app.include_router(public_bookings_router, prefix="/bookings",       tags=["Public Bookings"])
app.include_router(admin_bookings_router,  prefix="/admin/bookings", tags=["Admin Bookings"])
app.include_router(applications_router,    prefix="/applications",   tags=["Applications"])
app.include_router(applications_public_router, prefix="", tags=["Applications Public"])
app.include_router(docs_router, prefix="/docs", tags=["Documents"])

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
