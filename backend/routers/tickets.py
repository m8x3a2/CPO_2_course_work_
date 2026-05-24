from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from database import get_db
import auth, models, schemas

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def _ticket_query(db: Session):
    return (
        db.query(models.Ticket)
        .options(
            joinedload(models.Ticket.session).joinedload(models.Session.film),
            joinedload(models.Ticket.session).joinedload(models.Session.hall),
        )
    )


@router.post("/{session_id}", response_model=schemas.TicketOut, status_code=201)
def buy_ticket(
    session_id: int,
    data: schemas.TicketIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    session = (
        db.query(models.Session)
        .options(joinedload(models.Session.hall))
        .filter(models.Session.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    if session.free_seats <= 0:
        raise HTTPException(status_code=400, detail="Свободных мест нет")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Сеанс недоступен для бронирования")
    if data.seat_number > session.hall.total_seats:
        raise HTTPException(status_code=400, detail="Такого места в зале нет")
    if float(current_user.balance or 0) < session.price:
        raise HTTPException(status_code=400, detail="Недостаточно денег на балансе")
    if db.query(models.Ticket).filter(
        models.Ticket.session_id == session_id,
        models.Ticket.seat_number == data.seat_number,
    ).first():
        raise HTTPException(status_code=400, detail="Это место уже занято")

    ticket = models.Ticket(
        user_id=current_user.id,
        session_id=session_id,
        purchased_at=datetime.utcnow(),
        seat_number=data.seat_number,
    )
    session.free_seats -= 1
    current_user.balance = float(current_user.balance or 0) - session.price
    db.add(ticket)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Это место уже занято")
    db.refresh(ticket)

    return _ticket_query(db).filter(models.Ticket.id == ticket.id).first()


@router.get("/my", response_model=list[schemas.TicketOut])
def my_tickets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        _ticket_query(db)
        .filter(models.Ticket.user_id == current_user.id)
        .order_by(models.Ticket.purchased_at.desc())
        .all()
    )


@router.delete("/my/all", status_code=204)
def delete_all_my_tickets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id).delete()
    db.commit()


@router.delete("/my/{ticket_id}", status_code=204)
def delete_my_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.user_id == current_user.id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Билет не найден")
    db.delete(ticket)
    db.commit()
