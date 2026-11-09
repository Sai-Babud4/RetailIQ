import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Determine paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Safe directory creation that will never crash on read-only environments (e.g. AWS Lambda / Vercel)
try:
    if not os.environ.get("VERCEL") and not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    pass

# Check for DATABASE_URL environment override
if "DATABASE_URL" in os.environ and os.environ["DATABASE_URL"]:
    DATABASE_URL = os.environ["DATABASE_URL"]
else:
    candidate_paths = [
        os.path.join(BASE_DIR, "backend", "data", "retailiq.db"),
        os.path.join(BASE_DIR, "data", "retailiq.db"),
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "retailiq.db"),
        os.path.join("/tmp", "retailiq.db")
    ]
    db_path = None
    for cand in candidate_paths:
        if os.path.exists(cand):
            db_path = os.path.abspath(cand)
            break
    if not db_path:
        db_path = os.path.join(DATA_DIR, "retailiq.db")
    
    DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
