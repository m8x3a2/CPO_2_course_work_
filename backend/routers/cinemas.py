from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from archive import backfill_ticket_archive_fields
from image_storage import delete_saved_image, save_image_data
import models, schemas, auth

router = APIRouter(prefix="/cinemas", tags=["Cinemas"])


@router.get("", response_model=list[schemas.CinemaOut])
def list_cinemas(
    name: Optional[str] = None,
    address: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Cinema)
    if name:
        q = q.filter(models.Cinema.name.ilike(f"%{name}%"))
    if address:
        q = q.filter(models.Cinema.address.ilike(f"%{address}%"))
    return q.all()


@router.get("/{cinema_id}", response_model=schemas.CinemaOut)
def get_cinema(cinema_id: int, db: Session = Depends(get_db)):
    cinema = db.query(models.Cinema).filter(models.Cinema.id == cinema_id).first()
    if not cinema:
        raise HTTPException(status_code=404, detail="Кинотеатр не найден")
    return cinema


@router.post("", response_model=schemas.CinemaOut, status_code=201)
def create_cinema(
    data: schemas.CinemaIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    existing = db.query(models.Cinema).filter(models.Cinema.name.ilike(data.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Кинотеатр с таким названием уже существует")

    try:
        image_data = save_image_data(data.image_data, "cinemas")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cinema = models.Cinema(
        name=data.name,
        address=data.address,
        halls_count=0,
        description=data.description,
        image_data=image_data,
    )
    db.add(cinema)

    db.commit()
    db.refresh(cinema)
    return cinema


@router.put("/{cinema_id}", response_model=schemas.CinemaOut)
def update_cinema(
    cinema_id: int,
    data: schemas.CinemaIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    cinema = db.query(models.Cinema).filter(models.Cinema.id == cinema_id).first()
    if not cinema:
        raise HTTPException(status_code=404, detail="Кинотеатр не найден")
    existing = (
        db.query(models.Cinema)
        .filter(models.Cinema.id != cinema_id, models.Cinema.name.ilike(data.name))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Кинотеатр с таким названием уже существует")
    try:
        image_data = save_image_data(data.image_data, "cinemas")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if cinema.image_data != image_data:
        delete_saved_image(cinema.image_data)
    cinema.name = data.name
    cinema.address = data.address
    cinema.halls_count = len(cinema.halls)
    cinema.description = data.description
    cinema.image_data = image_data
    db.commit()
    db.refresh(cinema)
    return cinema


@router.delete("/{cinema_id}", status_code=204)
def delete_cinema(
    cinema_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    cinema = db.query(models.Cinema).filter(models.Cinema.id == cinema_id).first()
    if not cinema:
        raise HTTPException(status_code=404, detail="Кинотеатр не найден")
    session_ids = [session.id for hall in cinema.halls for session in hall.sessions]
    backfill_ticket_archive_fields(db, session_ids)
    delete_saved_image(cinema.image_data)
    db.delete(cinema)
    db.commit()
