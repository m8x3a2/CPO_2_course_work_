from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import auth, models, schemas

router = APIRouter(prefix="/promocodes", tags=["Promo codes"])


def _promo_out(promo: models.PromoCode) -> schemas.PromoCodeOut:
    return schemas.PromoCodeOut(
        id=promo.id,
        code=promo.code,
        max_uses=promo.max_uses,
        amount=promo.amount,
        created_at=promo.created_at,
        used_count=len(promo.redemptions),
    )


@router.get("", response_model=list[schemas.PromoCodeOut])
def list_promocodes(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    return [_promo_out(p) for p in db.query(models.PromoCode).order_by(models.PromoCode.id.desc()).all()]


@router.post("", response_model=schemas.PromoCodeOut, status_code=201)
def create_promocode(
    data: schemas.PromoCodeIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    if db.query(models.PromoCode).filter(models.PromoCode.code == data.code).first():
        raise HTTPException(status_code=400, detail="Такой промокод уже существует")
    promo = models.PromoCode(
        code=data.code,
        max_uses=data.max_uses,
        amount=data.amount,
        created_at=datetime.utcnow(),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return _promo_out(promo)


@router.delete("/{promo_id}", status_code=204)
def delete_promocode(
    promo_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    promo = db.query(models.PromoCode).filter(models.PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    db.delete(promo)
    db.commit()


@router.post("/apply", response_model=schemas.UserOut)
def apply_promocode(
    data: schemas.PromoApplyIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    code = data.code.strip().upper()
    promo = db.query(models.PromoCode).filter(models.PromoCode.code == code).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    if len(promo.redemptions) >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Лимит промокода исчерпан")
    used = (
        db.query(models.PromoRedemption)
        .filter(
            models.PromoRedemption.user_id == current_user.id,
            models.PromoRedemption.promo_code_id == promo.id,
        )
        .first()
    )
    if used:
        raise HTTPException(status_code=400, detail="Вы уже использовали этот промокод")

    current_user.balance = float(current_user.balance or 0) + promo.amount
    db.add(models.PromoRedemption(
        user_id=current_user.id,
        promo_code_id=promo.id,
        redeemed_at=datetime.utcnow(),
    ))
    db.commit()
    db.refresh(current_user)
    return current_user
