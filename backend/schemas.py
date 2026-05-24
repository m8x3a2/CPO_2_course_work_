from pydantic import BaseModel, field_validator, model_validator, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole


# ── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username", "password")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()

    @field_validator("username")
    @classmethod
    def username_length(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Имя пользователя должно содержать минимум 3 символа")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль должен содержать минимум 6 символов")
        return v


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    balance: float = 0

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRoleUpdate(BaseModel):
    role: UserRole


# ── Cinema ───────────────────────────────────────────────────────────────────

class CinemaIn(BaseModel):
    name: str
    address: str
    halls_count: int
    description: Optional[str] = None
    image_data: Optional[str] = None

    @field_validator("name", "address")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()

    @field_validator("halls_count")
    @classmethod
    def positive_halls(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Количество залов должно быть больше 0")
        return v


class HallOut(BaseModel):
    id: int
    name: str
    total_seats: int

    model_config = {"from_attributes": True}


class CinemaOut(BaseModel):
    id: int
    name: str
    address: str
    halls_count: int
    description: Optional[str] = None
    image_data: Optional[str] = None
    halls: List[HallOut] = []

    model_config = {"from_attributes": True}


# ── Hall ─────────────────────────────────────────────────────────────────────

class HallIn(BaseModel):
    cinema_id: int
    name: str
    total_seats: int

    @field_validator("name")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()

    @field_validator("total_seats")
    @classmethod
    def positive_seats(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Мест должно быть больше 0")
        return v


# ── Film ─────────────────────────────────────────────────────────────────────

class FilmIn(BaseModel):
    title: str
    director: str
    operator: Optional[str] = None
    genre: str
    studio: Optional[str] = None
    actors: Optional[str] = None
    description: Optional[str] = None
    year: Optional[int] = None
    duration_minutes: Optional[int] = None
    image_data: Optional[str] = None

    @field_validator("title", "director", "genre")
    @classmethod
    def strip_required(cls, v: str) -> str:
        return v.strip()

    @field_validator("operator", "studio", "actors", "description", "image_data", mode="before")
    @classmethod
    def strip_optional(cls, v):
        if v is not None:
            return v.strip()
        return v


class FilmOut(BaseModel):
    id: int
    title: str
    director: str
    operator: Optional[str]
    genre: str
    studio: Optional[str]
    actors: Optional[str]
    description: Optional[str]
    year: Optional[int]
    duration_minutes: Optional[int] = None
    image_data: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Session ───────────────────────────────────────────────────────────────────

class SessionIn(BaseModel):
    film_id: int
    hall_id: int
    datetime: datetime
    price: float
    free_seats: int
    status: str = "active"

    @field_validator("price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Цена должна быть больше 0")
        return v

    @field_validator("free_seats")
    @classmethod
    def non_negative_seats(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Количество мест не может быть отрицательным")
        return v


class SessionOut(BaseModel):
    id: int
    film_id: int
    hall_id: int
    datetime: datetime
    price: float
    free_seats: int
    status: str
    film: FilmOut
    hall: HallOut

    model_config = {"from_attributes": True}


class SessionWithCinema(BaseModel):
    id: int
    datetime: datetime
    price: float
    free_seats: int
    status: str
    film: FilmOut
    hall: HallOut
    cinema_name: str
    cinema_address: str

    model_config = {"from_attributes": True}


# ── Ticket ────────────────────────────────────────────────────────────────────

class TicketOut(BaseModel):
    id: int
    session_id: int
    purchased_at: datetime
    seat_number: Optional[int]
    session: SessionOut

    model_config = {"from_attributes": True}


class TicketIn(BaseModel):
    seat_number: int

    @field_validator("seat_number")
    @classmethod
    def positive_seat(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Номер места должен быть больше 0")
        return v


class SessionSeatsOut(BaseModel):
    session_id: int
    total_seats: int
    occupied_seats: List[int]
    free_seats: List[int]


class PromoCodeIn(BaseModel):
    code: str
    max_uses: int
    amount: float

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) < 3:
            raise ValueError("Промокод должен содержать минимум 3 символа")
        return v

    @field_validator("max_uses")
    @classmethod
    def positive_uses(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Количество людей должно быть больше 0")
        return v

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Сумма должна быть больше 0")
        return v


class PromoCodeOut(BaseModel):
    id: int
    code: str
    max_uses: int
    amount: float
    created_at: datetime
    used_count: int = 0

    model_config = {"from_attributes": True}


class PromoApplyIn(BaseModel):
    code: str
