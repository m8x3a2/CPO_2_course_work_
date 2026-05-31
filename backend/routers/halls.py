from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from archive import backfill_ticket_archive_fields
import auth, models, schemas

router = APIRouter(prefix="/halls", tags=["Halls"])


def _hall_name_exists(db: Session, cinema_id: int, name: str, exclude_hall_id: int | None = None) -> bool:
    query = db.query(models.Hall).filter(
        models.Hall.cinema_id == cinema_id,
        models.Hall.name == name,
    )
    if exclude_hall_id is not None:
        query = query.filter(models.Hall.id != exclude_hall_id)
    return db.query(query.exists()).scalar()


@router.get("/cinema/{cinema_id}", response_model=list[schemas.HallOut])
def list_halls(cinema_id: int, db: Session = Depends(get_db)):
    return db.query(models.Hall).filter(models.Hall.cinema_id == cinema_id).all()


@router.post("", response_model=schemas.HallOut, status_code=201)
def create_hall(
    data: schemas.HallIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    cinema = db.query(models.Cinema).filter(models.Cinema.id == data.cinema_id).first()
    if not cinema:
        raise HTTPException(status_code=404, detail="Кинотеатр не найден")
    if _hall_name_exists(db, data.cinema_id, data.name):
        raise HTTPException(status_code=400, detail="В этом кинотеатре уже есть зал с таким названием")
    hall = models.Hall(**data.model_dump())
    db.add(hall)
    db.flush()
    cinema.halls_count = db.query(models.Hall).filter(models.Hall.cinema_id == data.cinema_id).count()
    db.commit()
    db.refresh(hall)
    return hall


@router.put("/{hall_id}", response_model=schemas.HallOut)
def update_hall(
    hall_id: int,
    data: schemas.HallIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    hall = db.query(models.Hall).filter(models.Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Зал не найден")
    cinema = db.query(models.Cinema).filter(models.Cinema.id == data.cinema_id).first()
    if not cinema:
        raise HTTPException(status_code=404, detail="Кинотеатр не найден")
    if _hall_name_exists(db, data.cinema_id, data.name, exclude_hall_id=hall_id):
        raise HTTPException(status_code=400, detail="В этом кинотеатре уже есть зал с таким названием")
    old_cinema_id = hall.cinema_id
    for k, v in data.model_dump().items():
        setattr(hall, k, v)
    db.flush()
    for cinema_id in {old_cinema_id, hall.cinema_id}:
        cinema = db.query(models.Cinema).filter(models.Cinema.id == cinema_id).first()
        if cinema:
            cinema.halls_count = db.query(models.Hall).filter(models.Hall.cinema_id == cinema_id).count()
    db.commit()
    db.refresh(hall)
    return hall


@router.delete("/{hall_id}", status_code=204)
def delete_hall(
    hall_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    hall = db.query(models.Hall).filter(models.Hall.id == hall_id).first()
    if not hall:
        raise HTTPException(status_code=404, detail="Зал не найден")
    cinema = hall.cinema
    backfill_ticket_archive_fields(db, [session.id for session in hall.sessions])
    db.delete(hall)
    db.flush()
    if cinema:
        cinema.halls_count = db.query(models.Hall).filter(models.Hall.cinema_id == cinema.id).count()
    db.commit()
