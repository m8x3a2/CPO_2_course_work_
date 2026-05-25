from datetime import datetime
from typing import List, Optional
import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from models import UserRole


LOGIN_RE = re.compile(r"^[A-Za-z0-9]{5,30}$")
PASSWORD_RE = re.compile(r"^[A-Za-z0-9]{8,30}$")
EMAIL_ALLOWED_RE = re.compile(r"^[A-Za-z0-9@._-]{8,30}$")
TEXT_FIELD_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 500


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username", "password", "email", mode="before")
    @classmethod
    def strip_strings(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not LOGIN_RE.fullmatch(v):
            raise ValueError("Логин: 5-30 символов, только A-Z, a-z, 0-9")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_RE.fullmatch(v):
            raise ValueError("Пароль: 8-30 символов, только A-Z, a-z, 0-9")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_length_and_chars(cls, v: str) -> str:
        if not EMAIL_ALLOWED_RE.fullmatch(v):
            raise ValueError("Email: 8-30 символов, английские буквы, цифры и символы @ . _ -")
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


class CinemaIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    address: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    halls_count: int
    description: Optional[str] = Field(None, max_length=DESCRIPTION_MAX_LENGTH)
    image_data: Optional[str] = None

    @field_validator("name", "address", mode="before")
    @classmethod
    def strip_required(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("description", "image_data", mode="before")
    @classmethod
    def strip_optional(cls, v):
        return v.strip() if isinstance(v, str) else v

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


class HallIn(BaseModel):
    cinema_id: int
    name: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    total_seats: int

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("total_seats")
    @classmethod
    def positive_seats(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Количество мест должно быть больше 0")
        return v


class FilmIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    director: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    operator: Optional[str] = Field(None, max_length=TEXT_FIELD_MAX_LENGTH)
    genre: str = Field(..., min_length=1, max_length=TEXT_FIELD_MAX_LENGTH)
    studio: Optional[str] = Field(None, max_length=TEXT_FIELD_MAX_LENGTH)
    actors: Optional[str] = Field(None, max_length=TEXT_FIELD_MAX_LENGTH)
    description: Optional[str] = Field(None, max_length=DESCRIPTION_MAX_LENGTH)
    year: Optional[int] = None
    duration_minutes: Optional[int] = None
    image_data: Optional[str] = None

    @field_validator("title", "director", "genre", mode="before")
    @classmethod
    def strip_required(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("operator", "studio", "actors", "description", "image_data", mode="before")
    @classmethod
    def strip_optional(cls, v):
        return v.strip() if isinstance(v, str) else v


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

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ("active", "cancelled", "finished"):
            raise ValueError("Недопустимый статус")
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


class TicketOut(BaseModel):
    id: int
    session_id: int
    purchased_at: datetime
    seat_number: Optional[int]
    film_title: str
    cinema_name: str
    hall_name: str
    session_datetime: datetime
    price: float

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
            raise ValueError("Количество использований должно быть больше 0")
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
