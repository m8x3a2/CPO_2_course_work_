from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from database import engine, Base
from image_storage import UPLOAD_DIR, ensure_upload_dir
import models  # noqa: F401 — needed for table creation

from routers import auth, cinemas, films, sessions, tickets, halls, promocodes, admin_data

# Create all tables
Base.metadata.create_all(bind=engine)


def upgrade_schema():
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS image_data TEXT",
        "ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE cinemas ADD CONSTRAINT uq_cinemas_name UNIQUE (name)",
        "ALTER TABLE films ADD COLUMN IF NOT EXISTS image_data TEXT",
        "CREATE TABLE IF NOT EXISTS promo_codes (id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, max_uses INTEGER NOT NULL, amount FLOAT NOT NULL, created_at TIMESTAMP NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_promo_codes_id ON promo_codes (id)",
        "CREATE INDEX IF NOT EXISTS ix_promo_codes_code ON promo_codes (code)",
        "CREATE TABLE IF NOT EXISTS promo_redemptions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id), redeemed_at TIMESTAMP NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_promo_redemptions_id ON promo_redemptions (id)",
        "ALTER TABLE promo_redemptions ADD CONSTRAINT uq_promo_user_code UNIQUE (user_id, promo_code_id)",
        "ALTER TABLE tickets ADD CONSTRAINT uq_ticket_session_seat UNIQUE (session_id, seat_number)",
        "ALTER TABLE films ADD COLUMN IF NOT EXISTS duration_minutes INTEGER",
    ]
    for statement in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass


upgrade_schema()

app = FastAPI(title="Cinema Info System", version="1.0.0")
ensure_upload_dir()
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cinemas.router)
app.include_router(films.router)
app.include_router(sessions.router)
app.include_router(tickets.router)
app.include_router(halls.router)
app.include_router(promocodes.router)
app.include_router(admin_data.router)


@app.get("/")
def root():
    return {"message": "Cinema Info System API", "docs": "/docs"}
