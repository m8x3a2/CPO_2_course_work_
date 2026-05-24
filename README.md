# Cinema Info System

Информационная система для кинотеатров: кинотеатры, залы, фильмы, сеансы, билеты, пользователи, промокоды, импорт и экспорт данных.

## Технологии

| Слой | Технологии |
| --- | --- |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| База данных | PostgreSQL |
| Frontend | React, React Router, Vite |
| Авторизация | JWT, bcrypt |
| Изображения | PNG/JPG файлы в `backend/uploads`, в БД хранится путь `/uploads/...` |

## Запуск backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Запуск frontend

```powershell
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Первый администратор

1. Зарегистрируйтесь через вкладку `Регистрация`.
2. В PostgreSQL выполните:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

3. Выйдите и войдите снова.

## Правила аккаунтов

- Вход выполняется по email и паролю.
- Логин: 5-30 символов, только `A-Z`, `a-z`, `0-9`.
- Пароль: 8-30 символов, только `A-Z`, `a-z`, `0-9`.
- Email: 8-30 символов, английские буквы, цифры и символы `@ . _ -`.
- Email уникальный.
- Имя пользователя не уникальное, это просто псевдоним.

## Изображения

Frontend загружает файл через multipart upload, base64 не используется. Принимаются только:

- PNG
- JPG/JPEG
- размер до 10 МБ

Файл сохраняется в:

```text
backend/uploads/cinemas/
backend/uploads/films/
```

В базе хранится путь вида `/uploads/films/name.png`.

## Билеты

Билет работает как архивная запись. При покупке в билет записываются название фильма, кинотеатра, зала, дата сеанса, цена и место. Если потом удалить или изменить фильм, кинотеатр, зал или сеанс, старые билеты пользователя не меняются.

## Очистка базы под новую схему

Если схема уже конфликтует со старой версией, используйте не `TRUNCATE`, а полную пересборку схемы. После этого перезапустите backend, и таблицы создадутся заново:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Если схема уже новая и нужно очистить только данные:

```sql
TRUNCATE TABLE promo_redemptions, tickets, sessions, halls, films, cinemas, promo_codes, users RESTART IDENTITY CASCADE;
```

## Импорт и экспорт

В админ-панели есть экспорт и импорт JSON. Экспорт включает пользователей, кинотеатры, залы, фильмы, сеансы, билеты, промокоды и использования промокодов. Билеты экспортируются вместе с архивными полями, поэтому они не зависят от существования сеансов.

## Проверка сборки frontend

```powershell
cd frontend
npm run build
```
