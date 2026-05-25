import models


def current_session_ticket_query(db, session):
    return db.query(models.Ticket).filter(
        models.Ticket.session_id == session.id,
        models.Ticket.film_title == session.film.title,
        models.Ticket.cinema_name == session.hall.cinema.name,
        models.Ticket.hall_name == session.hall.name,
        models.Ticket.session_datetime == session.datetime,
    )


def recalculate_free_seats(db, session):
    occupied_count = current_session_ticket_query(db, session).filter(
        models.Ticket.seat_number.isnot(None)
    ).count()
    session.free_seats = max(0, session.hall.total_seats - occupied_count)
    return session.free_seats
