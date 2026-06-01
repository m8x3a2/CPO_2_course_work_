from datetime import date, datetime
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from archive import backfill_ticket_archive_fields
from session_tickets import current_session_ticket_query, recalculate_free_seats
import auth, models, schemas

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _build_query(db: Session):
    return (
        db.query(models.Session)
        .options(
            joinedload(models.Session.film),
            joinedload(models.Session.hall).joinedload(models.Hall.cinema),
        )
    )


def _to_session_with_cinema(s: models.Session) -> schemas.SessionWithCinema:
    return schemas.SessionWithCinema(
        id=s.id,
        datetime=s.datetime,
        price=s.price,
        free_seats=s.free_seats,
        status=s.status,
        film=s.film,
        hall=s.hall,
        cinema_name=s.hall.cinema.name,
        cinema_address=s.hall.cinema.address,
    )


def _split_genres(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"[,\s]+", value) if part.strip()]


@router.get("", response_model=list[schemas.SessionWithCinema])
def list_sessions(
    cinema_id: Optional[int] = None,
    film_id: Optional[int] = None,
    genre: Optional[str] = None,
    director: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    has_seats: Optional[bool] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = _build_query(db)

    if cinema_id:
        q = q.join(models.Hall).filter(models.Hall.cinema_id == cinema_id)
    if film_id:
        q = q.filter(models.Session.film_id == film_id)
    if genre or director:
        q = q.join(models.Film, models.Session.film_id == models.Film.id)
    if genre:
        for genre_part in _split_genres(genre):
            q = q.filter(models.Film.genre.ilike(f"%{genre_part}%"))
    if director:
        q = q.filter(models.Film.director.ilike(f"%{director}%"))
    if date_from:
        q = q.filter(models.Session.datetime >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(models.Session.datetime <= datetime.combine(date_to, datetime.max.time()))
    if status:
        q = q.filter(models.Session.status == status)

    sessions = q.order_by(models.Session.datetime).all()
    for session in sessions:
        recalculate_free_seats(db, session)
    if has_seats is not None:
        sessions = [session for session in sessions if (session.free_seats > 0) == has_seats]
    db.commit()
    return [_to_session_with_cinema(s) for s in sessions]


@router.get("/{session_id}", response_model=schemas.SessionWithCinema)
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = _build_query(db).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    recalculate_free_seats(db, s)
    db.commit()
    return _to_session_with_cinema(s)


@router.get("/{session_id}/seats", response_model=schemas.SessionSeatsOut)
def get_session_seats(session_id: int, db: Session = Depends(get_db)):
    s = _build_query(db).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    occupied = sorted(
        seat for (seat,) in current_session_ticket_query(db, s)
        .with_entities(models.Ticket.seat_number)
        .filter(models.Ticket.seat_number.isnot(None))
        .all()
    )
    recalculate_free_seats(db, s)
    db.commit()
    occupied_set = set(occupied)
    free = [seat for seat in range(1, s.hall.total_seats + 1) if seat not in occupied_set]
    return {
        "session_id": session_id,
        "total_seats": s.hall.total_seats,
        "occupied_seats": occupied,
        "free_seats": free,
    }


@router.post("", response_model=schemas.SessionOut, status_code=201)
def create_session(
    data: schemas.SessionIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    hall = db.query(models.Hall).filter(models.Hall.id == data.hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Зал не найден")
    film = db.query(models.Film).filter(models.Film.id == data.film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    if data.free_seats > hall.total_seats:
        raise HTTPException(status_code=400, detail="Свободных мест больше, чем мест в зале")

    session = models.Session(**data.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}", response_model=schemas.SessionOut)
def update_session(
    session_id: int,
    data: schemas.SessionIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    hall = db.query(models.Hall).filter(models.Hall.id == data.hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Зал не найден")
    film = db.query(models.Film).filter(models.Film.id == data.film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Фильм не найден")
    if data.free_seats > hall.total_seats:
        raise HTTPException(status_code=400, detail="Свободных мест больше, чем мест в зале")
    for k, v in data.model_dump().items():
        setattr(session, k, v)
    recalculate_free_seats(db, session)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    backfill_ticket_archive_fields(db, [session_id])
    db.delete(session)
    db.commit()


@router.patch("/{session_id}/status", response_model=schemas.SessionOut)
def update_session_status(
    session_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    new_status = data.get("status")
    if new_status not in ("active", "cancelled", "finished"):
        raise HTTPException(status_code=400, detail="Недопустимый статус")
    session.status = new_status
    db.commit()
    db.refresh(session)
    return session
