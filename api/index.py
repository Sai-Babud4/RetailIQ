import os
import sys
import shutil
import tempfile
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)

for path in [CURRENT_DIR, PARENT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

# When executing on Vercel / AWS Lambda read-only serverless environment:
# Copy the pre-populated authoritative SQLite database to a writable tmp location
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if is_serverless:
    tmp_dir = "/tmp" if os.path.exists("/tmp") else tempfile.gettempdir()
    target_db = os.path.join(tmp_dir, "retailiq.db")
    
    candidates = [
        os.path.join(CURRENT_DIR, "data", "retailiq.db"),
        os.path.join(CURRENT_DIR, "retailiq.db"),
        os.path.join(PARENT_DIR, "data", "retailiq.db"),
        os.path.join(PARENT_DIR, "backend", "data", "retailiq.db"),
    ]
    
    src_db = None
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 0:
            src_db = c
            break
            
    if src_db:
        if not os.path.exists(target_db) or os.path.getsize(target_db) == 0:
            try:
                shutil.copyfile(src_db, target_db)
                print(f"[Vercel Init] Seeded database from {src_db} ({os.path.getsize(src_db):,} bytes) to {target_db}")
            except Exception as e:
                print(f"[Vercel Init Warning] Failed to copy db: {e}")
                
    if os.path.exists(target_db) and os.path.getsize(target_db) > 0:
        os.environ["DATABASE_URL"] = f"sqlite:///{target_db}"
    elif src_db:
        os.environ["DATABASE_URL"] = f"sqlite:///{src_db}"

try:
    try:
        from backend.app.main import app
    except ImportError:
        from app.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    err_tb = traceback.format_exc()
    print(f"[Vercel Critical Import Error]: {err_tb}")
    
    app = FastAPI(title="RetailIQ Error Diagnostic")
    
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all_error(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "RetailIQ backend initialization error",
                "details": str(e),
                "traceback": err_tb,
                "sys_path": sys.path,
                "current_dir": CURRENT_DIR,
                "parent_dir": PARENT_DIR,
                "current_files": os.listdir(CURRENT_DIR) if os.path.exists(CURRENT_DIR) else [],
                "parent_files": os.listdir(PARENT_DIR) if os.path.exists(PARENT_DIR) else []
            }
        )
