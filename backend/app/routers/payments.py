"""
Stripe payments — credit pack checkout sessions.

Credit packs:
  starter  → $5  → 10 credits
  standard → $15 → 40 credits
  power    → $30 → 100 credits

Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env to enable.
Without them, the endpoint returns a 503 so the app still runs.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/payments", tags=["payments"])

CREDIT_PACKS = {
    "starter":  {"credits": 10,  "price_usd": 500,   "label": "Starter — 10 credits"},
    "standard": {"credits": 40,  "price_usd": 1500,  "label": "Standard — 40 credits"},
    "power":    {"credits": 100, "price_usd": 3000,  "label": "Power — 100 credits"},
}


def _stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Payments not configured yet.")
    import stripe
    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.get("/packs")
def list_packs():
    """Return available credit packs."""
    return [
        {"id": k, "credits": v["credits"], "price_cents": v["price_usd"], "label": v["label"]}
        for k, v in CREDIT_PACKS.items()
    ]


@router.post("/checkout/{pack_id}")
def create_checkout(
    pack_id: str,
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe checkout session for a credit pack."""
    pack = CREDIT_PACKS.get(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Unknown pack")

    stripe = _stripe()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": pack["price_usd"],
                "product_data": {"name": f"Envia — {pack['label']}"},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.frontend_url}/dashboard?credits=added",
        cancel_url=f"{settings.frontend_url}/dashboard",
        metadata={
            "user_id": str(current_user.id),
            "pack_id": pack_id,
            "credits": str(pack["credits"]),
        },
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe sends events here. Adds credits when payment succeeds."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured.")

    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        meta = event["data"]["object"].get("metadata", {})
        user_id = int(meta.get("user_id", 0))
        credits_to_add = int(meta.get("credits", 0))
        if user_id and credits_to_add:
            user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
            if user:
                user.credits = (user.credits or 0) + credits_to_add
                db.commit()

    return {"received": True}
