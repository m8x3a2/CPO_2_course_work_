from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from archive import backfill_ticket_archive_fields
from database import Base, engine
from image_storage import UPLOAD_DIR, ensure_upload_dir, save_upload_bytes
import models  # noqa: F401 - needed for table creation
from routers import admin_data, auth, cinemas, films, halls, promocodes, sessions, tickets


Base.metadata.create_all(bind=engine)


def upgrade_schema():
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)",
        "ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS image_data TEXT",
        "ALTER TABLE cinemas ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE cinemas ADD CONSTRAINT uq_cinemas_name UNIQUE (name)",
        "ALTER TABLE films ADD COLUMN IF NOT EXISTS image_data TEXT",
        "ALTER TABLE films ADD COLUMN IF NOT EXISTS duration_minutes INTEGER",
        "ALTER TABLE films ADD CONSTRAINT uq_films_title UNIQUE (title)",
        "CREATE TABLE IF NOT EXISTS promo_codes (id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, max_uses INTEGER NOT NULL, amount FLOAT NOT NULL, created_at TIMESTAMP NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_promo_codes_id ON promo_codes (id)",
        "CREATE INDEX IF NOT EXISTS ix_promo_codes_code ON promo_codes (code)",
        "CREATE TABLE IF NOT EXISTS promo_redemptions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id), redeemed_at TIMESTAMP NOT NULL)",
        "CREATE INDEX IF NOT EXISTS ix_promo_redemptions_id ON promo_redemptions (id)",
        "ALTER TABLE promo_redemptions ADD CONSTRAINT uq_promo_user_code UNIQUE (user_id, promo_code_id)",
        "ALTER TABLE tickets ADD CONSTRAINT uq_ticket_session_seat UNIQUE (session_id, seat_number)",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS film_title VARCHAR(300)",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cinema_name VARCHAR(200)",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hall_name VARCHAR(100)",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS session_datetime TIMESTAMP",
        "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS price FLOAT",
        "ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_session_id_fkey",
    ]
    for statement in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception:
            pass
    try:
        with DbSession(engine) as db:
            backfill_ticket_archive_fields(db)
            db.commit()
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


@app.post("/images/upload")
async def upload_image(file: UploadFile = File(...), category: str = "images"):
    if category not in {"films", "cinemas", "images"}:
        raise HTTPException(status_code=400, detail="Недопустимая категория изображения")
    content = await file.read()
    try:
        path = save_upload_bytes(content, file.content_type, category)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"path": path}


@app.get("/")
def root():
    return {"message": "Cinema Info System API", "docs": "/docs"}
