from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from archive import backfill_ticket_archive_fields
from image_storage import delete_saved_image, save_image_data
import auth, models, schemas

router = APIRouter(prefix="/films", tags=["Films"])


@router.get("", response_model=list[schemas.FilmOut])
def list_films(
    title: Optional[str] = None,
    director: Optional[str] = None,
    genre: Optional[str] = None,
    studio: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Film)
    if title:
        q = q.filter(models.Film.title.ilike(f"%{title}%"))
    if director:
        q = q.filter(models.Film.director.ilike(f"%{director}%"))
    if genre:
        q = q.filter(models.Film.genre.ilike(f"%{genre}%"))
    if studio:
        q = q.filter(models.Film.studio.ilike(f"%{studio}%"))
    if year:
        q = q.filter(models.Film.year == year)
    return q.all()


@router.get("/{film_id}", response_model=schemas.FilmOut)
def get_film(film_id: int, db: Session = Depends(get_db)):
    film = db.query(models.Film).filter(models.Film.id == film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    return film


@router.post("", response_model=schemas.FilmOut, status_code=201)
def create_film(
    data: schemas.FilmIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    if db.query(models.Film).filter(models.Film.title.ilike(data.title)).first():
        raise HTTPException(status_code=400, detail="Фильм с таким названием уже существует")
    payload = data.model_dump()
    try:
        payload["image_data"] = save_image_data(payload.get("image_data"), "films")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    film = models.Film(**payload)
    db.add(film)
    db.commit()
    db.refresh(film)
    return film


@router.put("/{film_id}", response_model=schemas.FilmOut)
def update_film(
    film_id: int,
    data: schemas.FilmIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    film = db.query(models.Film).filter(models.Film.id == film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    existing = (
        db.query(models.Film)
        .filter(models.Film.id != film_id, models.Film.title.ilike(data.title))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Фильм с таким названием уже существует")
    payload = data.model_dump()
    try:
        payload["image_data"] = save_image_data(payload.get("image_data"), "films")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if film.image_data != payload.get("image_data"):
        delete_saved_image(film.image_data)
    for k, v in payload.items():
        setattr(film, k, v)
    db.commit()
    db.refresh(film)
    return film


@router.delete("/{film_id}", status_code=204)
def delete_film(
    film_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    film = db.query(models.Film).filter(models.Film.id == film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    backfill_ticket_archive_fields(db, [session.id for session in film.sessions])
    delete_saved_image(film.image_data)
    db.delete(film)
    db.commit()
