from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:password@localhost:5432/testdb06"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

SERIAL_TABLES = (
    "users",
    "cinemas",
    "halls",
    "films",
    "sessions",
    "tickets",
    "promo_codes",
    "promo_redemptions",
)


def sync_serial_sequences():
    with engine.begin() as conn:
        for table in SERIAL_TABLES:
            max_id = conn.execute(text(f"SELECT COALESCE(MAX(id), 0) FROM {table}")).scalar()
            sequence_name = conn.execute(
                text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                {"table_name": table},
            ).scalar()
            if sequence_name:
                conn.execute(
                    text("SELECT setval(CAST(:sequence_name AS regclass), :next_id, false)"),
                    {"sequence_name": sequence_name, "next_id": max_id + 1},
                )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
