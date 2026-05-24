from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(str, enum.Enum):
    guest = "guest"
    client = "client"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.client, nullable=False)
    balance = Column(Float, nullable=False, default=0)

    tickets = relationship("Ticket", back_populates="user")
    promo_redemptions = relationship("PromoRedemption", back_populates="user")


class Cinema(Base):
    __tablename__ = "cinemas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    address = Column(String(300), nullable=False)
    halls_count = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True)

    halls = relationship("Hall", back_populates="cinema", cascade="all, delete-orphan")


class Hall(Base):
    __tablename__ = "halls"

    id = Column(Integer, primary_key=True, index=True)
    cinema_id = Column(Integer, ForeignKey("cinemas.id"), nullable=False)
    name = Column(String(100), nullable=False)
    total_seats = Column(Integer, nullable=False)

    cinema = relationship("Cinema", back_populates="halls")
    sessions = relationship("Session", back_populates="hall", cascade="all, delete-orphan")


class Film(Base):
    __tablename__ = "films"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    director = Column(String(200), nullable=False)
    operator = Column(String(200), nullable=True)
    genre = Column(String(100), nullable=False)
    studio = Column(String(200), nullable=True)
    actors = Column(Text, nullable=True)  # comma-separated list
    description = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    image_data = Column(Text, nullable=True)

    sessions = relationship("Session", back_populates="film")


class Session(Base):
    """Репертуар — сеанс конкретного фильма в конкретном зале"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    film_id = Column(Integer, ForeignKey("films.id"), nullable=False)
    hall_id = Column(Integer, ForeignKey("halls.id"), nullable=False)
    datetime = Column(DateTime, nullable=False)
    price = Column(Float, nullable=False)
    free_seats = Column(Integer, nullable=False)
    status = Column(String(50), default="active")  # active, cancelled, finished

    film = relationship("Film", back_populates="sessions")
    hall = relationship("Hall", back_populates="sessions")
    tickets = relationship("Ticket", back_populates="session")


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (UniqueConstraint("session_id", "seat_number", name="uq_ticket_session_seat"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    purchased_at = Column(DateTime, nullable=False)
    seat_number = Column(Integer, nullable=True)

    user = relationship("User", back_populates="tickets")
    session = relationship("Session", back_populates="tickets")


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    max_uses = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False)

    redemptions = relationship("PromoRedemption", back_populates="promo_code", cascade="all, delete-orphan")


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"
    __table_args__ = (UniqueConstraint("user_id", "promo_code_id", name="uq_promo_user_code"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=False)
    redeemed_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="promo_redemptions")
    promo_code = relationship("PromoCode", back_populates="redemptions")
