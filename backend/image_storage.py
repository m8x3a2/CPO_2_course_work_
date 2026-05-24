from pathlib import Path
from uuid import uuid4


UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
MAX_IMAGE_BYTES = 10 * 1024 * 1024

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}


def ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_image_data(value: str | None, category: str) -> str | None:
    if not value:
        return None

    value = value.strip()
    if value.startswith("/uploads/") or value.startswith("http://") or value.startswith("https://"):
        return value

    raise ValueError("Сначала загрузите PNG или JPG файл")


def save_upload_bytes(content: bytes, content_type: str | None, category: str) -> str:
    mime = (content_type or "").lower()
    extension = _EXTENSIONS.get(mime)
    if not extension:
        raise ValueError("Поддерживаются только PNG и JPG")
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("Файл слишком большой: максимум 10 МБ")

    directory = UPLOAD_DIR / category
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    path = directory / filename
    path.write_bytes(content)
    return f"/uploads/{category}/{filename}"


def delete_saved_image(value: str | None) -> None:
    if not value or not value.startswith("/uploads/"):
        return

    relative_path = Path(*value.removeprefix("/uploads/").split("/"))
    path = (UPLOAD_DIR / relative_path).resolve()
    upload_root = UPLOAD_DIR.resolve()
    if upload_root == path or upload_root not in path.parents:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
