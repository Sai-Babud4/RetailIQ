import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.import_excel_dataset import import_dataset
from backend.app.models.database import SessionLocal
from backend.app.agent.inventory_agent import RetailIQInventoryAgent

def seed():
    print("Seeding RetailIQ database from authoritative Excel workbook...")
    import_dataset(force_reimport=False)
    
    # Run initial replenishment cycle to populate recommendations and audit trail
    db = SessionLocal()
    try:
        agent = RetailIQInventoryAgent(db)
        print("Executing initial autonomous agent replenishment evaluation...")
        res = agent.run_autonomous_replenishment_cycle(auto_draft=False)
        print(f"Agent evaluation completed: {res['summary']['critical']} critical items identified.")
    finally:
        db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed()

