#!/bin/bash
# =============================================================================
# Prism CRM — API Restructure Script
# Run from: ~/crm/prism_crm_dev/backend/
# =============================================================================

set -e  # Stop on any error

echo "🚀 Starting API restructure..."
echo ""

# =============================================================================
# 1. CREATE NEW FOLDER STRUCTURE
# =============================================================================
echo "📁 Creating new folder structure..."

mkdir -p api/leads
mkdir -p api/bookings
mkdir -p api/auth
mkdir -p api/applications
mkdir -p api/leases
mkdir -p api/move_events
mkdir -p api/docs
mkdir -p api/webhooks

# Create __init__.py for each
touch api/leads/__init__.py
touch api/bookings/__init__.py
touch api/auth/__init__.py
touch api/applications/__init__.py
touch api/leases/__init__.py
touch api/move_events/__init__.py
touch api/docs/__init__.py
touch api/webhooks/__init__.py

echo "✅ Folders created"
echo ""

# =============================================================================
# 2. MOVE EXISTING FILES
# =============================================================================
echo "📦 Moving existing endpoint files..."

# leads.py + get_leads.py → both go into api/leads/
# get_leads.py is the actual working one (has full filtering logic)
# leads.py is also used — keep both as separate files for now
cp api/endpoints/leads.py       api/leads/admin.py
cp api/endpoints/get_leads.py   api/leads/get.py
cp api/endpoints/webhooks.py    api/webhooks/admin.py
cp api/endpoints/admin_bookings.py  api/bookings/admin.py
cp api/endpoints/public_bookings.py api/bookings/public.py
cp api/endpoints/auth.py        api/auth/admin.py

echo "✅ Files moved"
echo ""

# =============================================================================
# 3. PLACE NEW applications.py
# =============================================================================
echo "📋 Placing applications endpoint..."

# applications.py should already be at backend/applications.py
# (the file we just built)
if [ -f "applications.py" ]; then
    cp applications.py api/applications/admin.py
    echo "✅ applications/admin.py placed"
else
    echo "⚠️  applications.py not found in backend/ — place it manually at api/applications/admin.py"
fi
echo ""

# =============================================================================
# 4. WRITE NEW main.py
# =============================================================================
echo "✏️  Writing new main.py..."

cat > main.py << 'MAINPY'
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
MAINPY

echo "✅ main.py written"
echo ""

# =============================================================================
# 5. VERIFY
# =============================================================================
echo "🔍 Verifying new structure..."
echo ""
find api -name "*.py" | sort
echo ""

# =============================================================================
# 6. KEEP OLD FILES (don't delete until confirmed working)
# =============================================================================
echo "⚠️  Old api/endpoints/ folder is untouched — delete it manually after confirming everything works:"
echo "    rm -rf api/endpoints/"
echo ""
echo "✅ Restructure complete!"
echo ""
echo "Next steps:"
echo "  1. Add FRONTEND_URL=https://dev.prismpm.cloud to .env"
echo "  2. Restart the dev backend container"
echo "  3. Hit /docs to confirm all routes are registered"