from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from image_storage import save_image_data
import auth, models

router = APIRouter(prefix="/admin/data", tags=["Admin data"])


def _dt(value):
    return value.isoformat() if value else None


def _parse_dt(value):
    return datetime.fromisoformat(value) if value else None


@router.get("/export")
def export_data(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "hashed_password": u.hashed_password,
                "role": u.role.value,
                "balance": u.balance,
            }
            for u in db.query(models.User).all()
        ],
        "cinemas": [
            {
                "id": c.id,
                "name": c.name,
                "address": c.address,
                "halls_count": c.halls_count,
                "description": c.description,
                "image_data": c.image_data,
            }
            for c in db.query(models.Cinema).all()
        ],
        "halls": [
            {"id": h.id, "cinema_id": h.cinema_id, "name": h.name, "total_seats": h.total_seats}
            for h in db.query(models.Hall).all()
        ],
        "films": [
            {
                "id": f.id,
                "title": f.title,
                "director": f.director,
                "operator": f.operator,
                "genre": f.genre,
                "studio": f.studio,
                "actors": f.actors,
                "description": f.description,
                "year": f.year,
                "image_data": f.image_data,
            }
            for f in db.query(models.Film).all()
        ],
        "sessions": [
            {
                "id": s.id,
                "film_id": s.film_id,
                "hall_id": s.hall_id,
                "datetime": _dt(s.datetime),
                "price": s.price,
                "free_seats": s.free_seats,
                "status": s.status,
            }
            for s in db.query(models.Session).all()
        ],
        "tickets": [
            {
                "id": t.id,
                "user_id": t.user_id,
                "session_id": t.session_id,
                "purchased_at": _dt(t.purchased_at),
                "seat_number": t.seat_number,
            }
            for t in db.query(models.Ticket).all()
        ],
        "promo_codes": [
            {
                "id": p.id,
                "code": p.code,
                "max_uses": p.max_uses,
                "amount": p.amount,
                "created_at": _dt(p.created_at),
            }
            for p in db.query(models.PromoCode).all()
        ],
        "promo_redemptions": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "promo_code_id": r.promo_code_id,
                "redeemed_at": _dt(r.redeemed_at),
            }
            for r in db.query(models.PromoRedemption).all()
        ],
    }


@router.post("/import")
def import_data(
    payload: dict,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    for model in (
        models.PromoRedemption,
        models.Ticket,
        models.Session,
        models.Hall,
        models.Cinema,
        models.Film,
        models.PromoCode,
        models.User,
    ):
        db.query(model).delete()

    for item in payload.get("users", []):
        db.add(models.User(
            id=item.get("id"),
            username=item["username"],
            email=item["email"],
            hashed_password=item["hashed_password"],
            role=models.UserRole(item.get("role", "client")),
            balance=item.get("balance", 0) or 0,
        ))
    for item in payload.get("cinemas", []):
        data = {k: item.get(k) for k in ("id", "name", "address", "halls_count", "description", "image_data")}
        data["image_data"] = save_image_data(data.get("image_data"), "cinemas")
        db.add(models.Cinema(**data))
    for item in payload.get("films", []):
        data = {k: item.get(k) for k in (
            "id", "title", "director", "operator", "genre", "studio", "actors", "description", "year", "image_data"
        )}
        data["image_data"] = save_image_data(data.get("image_data"), "films")
        db.add(models.Film(**data))
    db.flush()

    for item in payload.get("halls", []):
        db.add(models.Hall(**{k: item.get(k) for k in ("id", "cinema_id", "name", "total_seats")}))
    db.flush()

    for item in payload.get("sessions", []):
        data = {k: item.get(k) for k in ("id", "film_id", "hall_id", "price", "free_seats", "status")}
        data["datetime"] = _parse_dt(item.get("datetime"))
        db.add(models.Session(**data))
    for item in payload.get("promo_codes", []):
        data = {k: item.get(k) for k in ("id", "code", "max_uses", "amount")}
        data["created_at"] = _parse_dt(item.get("created_at")) or datetime.utcnow()
        db.add(models.PromoCode(**data))
    db.flush()

    for item in payload.get("tickets", []):
        data = {k: item.get(k) for k in ("id", "user_id", "session_id", "seat_number")}
        data["purchased_at"] = _parse_dt(item.get("purchased_at")) or datetime.utcnow()
        db.add(models.Ticket(**data))
    for item in payload.get("promo_redemptions", []):
        data = {k: item.get(k) for k in ("id", "user_id", "promo_code_id")}
        data["redeemed_at"] = _parse_dt(item.get("redeemed_at")) or datetime.utcnow()
        db.add(models.PromoRedemption(**data))

    db.commit()
    return {"status": "ok"}
