# Cinema Info System / КиноГород

Веб-приложение для работы с информацией о кинотеатрах города: кинотеатры, залы, фильмы, репертуар, сеансы, свободные места, билеты, пользователи, промокоды, импорт и экспорт данных.

Проект сделан как клиент-серверная система:

- backend: FastAPI + SQLAlchemy + PostgreSQL;
- frontend: React + React Router + Vite;
- авторизация: JWT + bcrypt;
- изображения: PNG/JPG-файлы в `backend/uploads`, в базе хранится путь `/uploads/...`.

## Что умеет программа

Гость может:

- смотреть главную страницу;
- просматривать кинотеатры, фильмы и сеансы;
- искать кинотеатры по названию и адресу;
- искать фильмы по названию, режиссёру, жанру, студии и году;
- фильтровать сеансы по жанру, режиссёру, датам, наличию мест и статусу;
- смотреть цену билета, свободные места и статус сеанса;
- регистрироваться и входить в аккаунт.

Клиент может:

- делать всё, что доступно гостю;
- смотреть профиль и баланс;
- применять промокоды для пополнения баланса;
- выбирать свободное место на активный сеанс;
- покупать билеты;
- смотреть свои билеты;
- удалять один билет или все свои билеты.

Администратор может:

- добавлять, редактировать и удалять кинотеатры;
- загружать изображения кинотеатров;
- добавлять и удалять залы;
- добавлять, редактировать и удалять фильмы;
- загружать изображения фильмов;
- создавать и удалять сеансы;
- менять статус сеанса: `active`, `cancelled`, `finished`;
- смотреть пользователей, искать их и менять роли;
- удалять пользователей;
- создавать и удалять промокоды;
- импортировать и экспортировать данные в JSON.

## Структура проекта

```text
Cinemas02/
  backend/
    main.py
    config.py
    database.py
    models.py
    schemas.py
    auth.py
    archive.py
    image_storage.py
    session_tickets.py
    routers/
      auth.py
      cinemas.py
      films.py
      halls.py
      sessions.py
      tickets.py
      promocodes.py
      admin_data.py
    uploads/
      cinemas/
      films/
      Placeholder/

  frontend/
    src/
      api/index.js
      components/Layout.jsx
      pages/
      App.jsx
      AuthContext.jsx
      index.css
      utils.js
    package.json
    vite.config.js

  report/
    README_REPORT.md
```

## База данных

Используется PostgreSQL. Подключение задаётся в `.env` через переменную `DATABASE_URL`.

Пример `.env`:

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/testdb06
SECRET_KEY=change_me_to_a_long_random_secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Основные таблицы:

- `users` - пользователи, роли и баланс;
- `cinemas` - кинотеатры;
- `halls` - залы кинотеатров;
- `films` - фильмы;
- `sessions` - сеансы;
- `tickets` - купленные билеты;
- `promo_codes` - промокоды;
- `promo_redemptions` - факты применения промокодов.

Таблицы создаются автоматически при запуске backend через SQLAlchemy. В `main.py` также есть `upgrade_schema()`, которая добавляет недостающие поля, индексы и ограничения для старых версий схемы.

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

Frontend:

```text
http://localhost:5173
```

Vite проксирует запросы `/api` на `http://localhost:8000`, поэтому frontend обращается к backend через путь `/api`.

## Первый администратор

После регистрации пользователь получает роль `client`. Чтобы назначить первого администратора, выполните SQL-запрос:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

После этого нужно выйти из аккаунта и войти снова.

## Правила аккаунтов

- Вход выполняется по email и паролю.
- Имя пользователя: 5-30 символов, только `A-Z`, `a-z`, `0-9`.
- Пароль: 8-30 символов, только `A-Z`, `a-z`, `0-9`.
- Email: 8-30 символов, английские буквы, цифры и символы `@ . _ -`.
- Email уникальный.
- Имя пользователя не уникальное, это псевдоним.
- Пароль хранится только как bcrypt-хеш.

## REST API

Основные группы endpoints:

| Группа | Назначение |
| --- | --- |
| `/auth` | Регистрация, вход, текущий пользователь, пользователи |
| `/cinemas` | Кинотеатры |
| `/halls` | Залы |
| `/films` | Фильмы |
| `/sessions` | Сеансы и места |
| `/tickets` | Покупка и просмотр билетов |
| `/promocodes` | Промокоды |
| `/admin/data` | Импорт и экспорт данных |
| `/images/upload` | Загрузка изображений |
| `/uploads/...` | Статическая раздача файлов |

Примеры:

```text
POST /auth/register
POST /auth/login
GET /auth/me
GET /cinemas
GET /films
GET /sessions
GET /sessions/{session_id}/seats
POST /tickets/{session_id}
GET /tickets/my
POST /promocodes/apply
GET /admin/data/export
POST /admin/data/import
POST /images/upload
```

## Билеты

Билет хранится как архивная запись. При покупке в него записываются:

- название фильма;
- название кинотеатра;
- название зала;
- дата и время сеанса;
- цена;
- номер места.

Поэтому старые билеты пользователя остаются понятными даже после удаления фильма, кинотеатра, зала или сеанса.

При покупке backend проверяет:

- существует ли сеанс;
- активен ли он;
- есть ли свободные места;
- существует ли выбранное место в зале;
- не занято ли место;
- достаточно ли денег на балансе.

## Промокоды

Администратор создаёт промокоды с кодом, суммой пополнения и лимитом использований. Пользователь вводит промокод в профиле.

Проверки:

- промокод существует;
- общий лимит использований не исчерпан;
- пользователь не применял этот промокод раньше.

После успешного применения баланс пользователя увеличивается на сумму промокода.

## Изображения

Изображения загружаются через multipart upload. Base64 не используется.

Поддерживаются:

- PNG;
- JPG/JPEG;
- размер до 10 МБ.

Файлы сохраняются в:

```text
backend/uploads/cinemas/
backend/uploads/films/
```

В базе хранится путь:

```text
/uploads/cinemas/example.png
/uploads/films/example.png
```

Если изображения нет, frontend показывает заглушку из:

```text
backend/uploads/Placeholder/cinemas.png
backend/uploads/Placeholder/films.png
```

## Импорт и экспорт

В админ-панели есть экспорт и импорт JSON.

Экспорт включает:

- пользователей;
- кинотеатры;
- залы;
- фильмы;
- сеансы;
- билеты;
- промокоды;
- использования промокодов.

Импорт заменяет текущие данные данными из JSON-файла. После импорта backend синхронизирует serial-последовательности PostgreSQL.

## Очистка базы

Если нужно полностью пересоздать схему:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Если схема актуальная и нужно удалить только данные:

```sql
TRUNCATE TABLE promo_redemptions, tickets, sessions, halls, films, cinemas, promo_codes, users RESTART IDENTITY CASCADE;
```

## Проверка проекта

Проверка backend:

```powershell
python -m compileall backend
```

Проверка frontend:

```powershell
cd frontend
npm run build
```

Подробное описание для отчёта находится в `report/README_REPORT.md`.
