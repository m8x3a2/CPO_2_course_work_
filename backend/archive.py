from sqlalchemy import text
from sqlalchemy.orm import Session


def detach_ticket_session_fk(db: Session) -> None:
    db.execute(text("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_session_id_fkey"))


def backfill_ticket_archive_fields(db: Session, session_ids: list[int] | None = None) -> None:
    detach_ticket_session_fk(db)
    params = {}
    session_filter = ""
    if session_ids is not None:
        if not session_ids:
            return
        params["session_ids"] = session_ids
        session_filter = "AND t.session_id = ANY(:session_ids)"

    db.execute(
        text(
            f"""
            UPDATE tickets AS t
            SET
                film_title = COALESCE(t.film_title, f.title),
                cinema_name = COALESCE(t.cinema_name, c.name),
                hall_name = COALESCE(t.hall_name, h.name),
                session_datetime = COALESCE(t.session_datetime, s.datetime),
                price = COALESCE(t.price, s.price)
            FROM sessions AS s
            JOIN films AS f ON f.id = s.film_id
            JOIN halls AS h ON h.id = s.hall_id
            JOIN cinemas AS c ON c.id = h.cinema_id
            WHERE t.session_id = s.id
            {session_filter}
            """
        ),
        params,
    )
