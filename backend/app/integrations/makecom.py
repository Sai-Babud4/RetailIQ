import os
import json
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import SystemSetting, AgentActivity

class MakeComIntegrationService:
    """
    RetailIQ Make.com Automation Integration Service.
    Supports asynchronous webhook dispatch for 6 key inventory events.
    Operates gracefully offline if no webhook URL is configured.
    """

    SUPPORTED_EVENTS = [
        "low_stock_detected",
        "critical_stock_detected",
        "high_demand_forecast_detected",
        "inventory_replenishment_required",
        "purchase_order_draft_created",
        "purchase_order_approved"
    ]

    @classmethod
    def get_webhook_url(cls, db: Session) -> str:
        # Check environment variable first, then database
        env_url = os.getenv("MAKECOM_WEBHOOK_URL", "")
        if env_url:
            return env_url
        setting = db.query(SystemSetting).filter_by(key="makecom_webhook_url").first()
        return setting.value.strip() if setting and setting.value else ""

    @classmethod
    def set_webhook_url(cls, db: Session, url: str) -> None:
        setting = db.query(SystemSetting).filter_by(key="makecom_webhook_url").first()
        if not setting:
            setting = SystemSetting(
                key="makecom_webhook_url",
                value=url,
                description="Make.com incoming replenishment webhook URL",
                updated_at=datetime.utcnow()
            )
            db.add(setting)
        else:
            setting.value = url
            setting.updated_at = datetime.utcnow()
        
        status_setting = db.query(SystemSetting).filter_by(key="makecom_status").first()
        if status_setting:
            status_setting.value = "Configured" if url else "Disconnected"
            status_setting.updated_at = datetime.utcnow()

        db.commit()

    @classmethod
    def get_integration_status(cls, db: Session) -> Dict[str, Any]:
        url = cls.get_webhook_url(db)
        status_setting = db.query(SystemSetting).filter_by(key="makecom_status").first()
        last_event_setting = db.query(SystemSetting).filter_by(key="makecom_last_event").first()
        last_status_setting = db.query(SystemSetting).filter_by(key="makecom_last_status").first()

        masked_url = ""
        if url:
            if len(url) > 16:
                masked_url = url[:8] + "..." + url[-6:]
            else:
                masked_url = "***configured***"

        return {
            "is_configured": bool(url),
            "webhook_url_masked": masked_url,
            "status": status_setting.value if status_setting else ("Connected" if url else "Disconnected"),
            "last_event": last_event_setting.value if last_event_setting else None,
            "last_status_code": last_status_setting.value if last_status_setting else None,
            "supported_events": cls.SUPPORTED_EVENTS
        }

    @classmethod
    async def dispatch_event(cls, db: Session, event_name: str, payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatches structured JSON event to configured Make.com webhook.
        """
        url = cls.get_webhook_url(db)
        timestamp = datetime.utcnow().isoformat()

        full_payload = {
            "source": "RetailIQ AI Inventory Intelligence",
            "event": event_name,
            "timestamp": timestamp,
            "currency": "INR",
            **payload_data
        }

        # Update last event
        last_ev = db.query(SystemSetting).filter_by(key="makecom_last_event").first()
        if last_ev:
            last_ev.value = f"{event_name} @ {timestamp}"
            last_ev.updated_at = datetime.utcnow()

        if not url:
            # Not configured, log and return safe response
            if last_ev:
                db.commit()
            return {
                "dispatched": False,
                "reason": "Make.com webhook URL not configured. Working in standalone offline mode.",
                "payload": full_payload
            }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=full_payload)
                status_code = res.status_code

                last_stat = db.query(SystemSetting).filter_by(key="makecom_last_status").first()
                if last_stat:
                    last_stat.value = f"HTTP {status_code}"
                    last_stat.updated_at = datetime.utcnow()

                status_setting = db.query(SystemSetting).filter_by(key="makecom_status").first()
                if status_setting:
                    status_setting.value = "Connected" if 200 <= status_code < 300 else f"Error ({status_code})"
                    status_setting.updated_at = datetime.utcnow()

                db.commit()

                return {
                    "dispatched": True,
                    "status_code": status_code,
                    "response_text": res.text[:200],
                    "payload": full_payload
                }
        except Exception as e:
            last_stat = db.query(SystemSetting).filter_by(key="makecom_last_status").first()
            if last_stat:
                last_stat.value = f"Exception: {str(e)[:100]}"
                last_stat.updated_at = datetime.utcnow()

            status_setting = db.query(SystemSetting).filter_by(key="makecom_status").first()
            if status_setting:
                status_setting.value = "Connection Error"
                status_setting.updated_at = datetime.utcnow()

            db.commit()

            return {
                "dispatched": False,
                "error": str(e),
                "payload": full_payload
            }

    @classmethod
    async def send_test_webhook(cls, db: Session, test_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends a test webhook to verify connectivity with Make.com scenario.
        """
        url = test_url or cls.get_webhook_url(db)
        if not url:
            return {
                "success": False,
                "status": "error",
                "message": "Please enter a valid Make.com webhook URL before testing."
            }

        sample_payload = {
            "source": "RetailIQ AI Inventory Intelligence",
            "event": "inventory_replenishment_required",
            "product_id": "SKU0001",
            "product_name": "Milk 1L",
            "category": "Dairy & Eggs",
            "current_stock": 9,
            "reorder_point": 10,
            "recommended_quantity": 24,
            "priority": "Critical",
            "supplier_id": "SUP012",
            "supplier_name": "Apex Retail Supply",
            "currency": "INR",
            "estimated_cost_inr": 4295.04,
            "is_test": True,
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=sample_payload)
                success = (200 <= res.status_code < 300)

                # Persist updated status
                status_setting = db.query(SystemSetting).filter_by(key="makecom_status").first()
                if status_setting:
                    status_setting.value = "Connected" if success else f"Error HTTP {res.status_code}"
                last_stat = db.query(SystemSetting).filter_by(key="makecom_last_status").first()
                if last_stat:
                    last_stat.value = f"HTTP {res.status_code}"
                db.commit()

                return {
                    "success": success,
                    "status_code": res.status_code,
                    "response": res.text[:200],
                    "message": "Make.com webhook test succeeded!" if success else f"Make.com returned HTTP {res.status_code}",
                    "payload": sample_payload
                }
        except Exception as e:
            return {
                "success": False,
                "status": "connection_failed",
                "message": f"Failed to reach Make.com webhook endpoint: {str(e)}",
                "payload": sample_payload
            }

