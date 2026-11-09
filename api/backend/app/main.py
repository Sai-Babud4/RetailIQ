import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import inspect

# Add root directory and api directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.models.database import Base, engine, SessionLocal
from backend.app.models.entities import Product
from backend.app.api.endpoints import router as api_router

try:
    from scripts.import_excel_dataset import import_dataset
except ImportError:
    import_dataset = None

# Initialize FastAPI application
app = FastAPI(
    title="RetailIQ – AI-Powered Inventory Intelligence",
    description="Intelligent Inventory Monitoring and Automated Replenishment Agent",
    version="1.0.0"
)

# Enable CORS for local development and hosted domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core API router on both /api and root level so Vercel rewrites never 404
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.on_event("startup")
def startup_event():
    # Safe read-first check: only create tables if database is empty/uninitialized
    try:
        inspector = inspect(engine)
        if not inspector.has_table("products"):
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[RetailIQ Startup] Schema check note: {e}")
        
    db = SessionLocal()
    try:
        # If database has no products and importer is available, auto-import dataset
        if db.query(Product).count() == 0 and import_dataset:
            print("[RetailIQ Startup] Database is empty. Auto-ingesting Excel dataset...")
            import_dataset(force_reimport=False)
        else:
            print("[RetailIQ Startup] Database ready with existing authoritative records.")
    except Exception as e:
        print(f"[RetailIQ Startup Warning] Data auto-check encountered: {e}")
    finally:
        db.close()

FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

# SPA 404 Fallback: serves React index.html for all non-API paths
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    if request.url.path.startswith("/api"):
        return JSONResponse(status_code=404, content={"detail": f"API endpoint '{request.url.path}' not found"})
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"detail": "Frontend build not found. Run 'npm run build' inside frontend."})

# If frontend production build exists, mount it
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
