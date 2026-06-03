import httpx
import json
import hmac
import hashlib
from datetime import datetime
from typing import Optional
import asyncio

async def send_webhook(
    url: str,
    campaign_id: int,
    campaign_name: str,
    status: str,
    successful_actions: int,
    total_actions: int,
    video_url: str,
    secret: Optional[str] = None,
    retries: int = 3,
    timeout: float = 5.0
) -> bool:
    """
    Send campaign completion webhook to external URL.
    Returns True if successful after retries, False otherwise.
    """
    payload = {
        "event": "campaign.completed",
        "timestamp": datetime.utcnow().isoformat(),
        "campaign": {
            "id": campaign_id,
            "name": campaign_name,
            "status": status,
            "successful_actions": successful_actions,
            "total_actions": total_actions,
            "video_url": video_url,
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    # Add signature if secret provided
    if secret:
        signature = hmac.new(
            secret.encode('utf-8'),
            json.dumps(payload).encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        headers["X-Webhook-Signature"] = signature
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(retries):
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code in (200, 201, 202, 204):
                    print(f"Webhook sent for campaign {campaign_id} to {url}")
                    return True
                else:
                    print(f"Webhook attempt {attempt+1} got {response.status_code}")
            except Exception as e:
                print(f"Webhook attempt {attempt+1} failed: {e}")
            
            # Exponential backoff
            await asyncio.sleep(2 ** attempt)
    
    return False