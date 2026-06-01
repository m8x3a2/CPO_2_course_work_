import models


def current_session_ticket_query(db, session):
    return db.query(models.Ticket).filter(
        models.Ticket.session_id == session.id,
        models.Ticket.film_title == session.film.title,
        models.Ticket.cinema_name == session.hall.cinema.name,
        models.Ticket.hall_name == session.hall.name,
        models.Ticket.session_datetime == session.datetime,
    )


def occupied_seat_count(db, session):
    return current_session_ticket_query(db, session).filter(
        models.Ticket.seat_number.isnot(None)
    ).count()


def physical_free_seat_count(db, session):
    return max(0, session.hall.total_seats - occupied_seat_count(db, session))


def recalculate_free_seats(db, session):
    current_free_seats = max(0, int(session.free_seats or 0))
    session.free_seats = min(current_free_seats, physical_free_seat_count(db, session))
    return session.free_seats


def restore_free_seats(db, session, count=1):
    current_free_seats = max(0, int(session.free_seats or 0))
    restored_free_seats = current_free_seats + max(0, int(count or 0))
    session.free_seats = min(restored_free_seats, physical_free_seat_count(db, session))
    return session.free_seats
