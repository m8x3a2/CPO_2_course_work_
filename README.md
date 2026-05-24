Конечно, вот подробный `README.md`:

```markdown
# Cinema Info System

Информационная система для кинотеатров: кинотеатры, залы, фильмы, сеансы, билеты, пользователи, промокоды и административный импорт/экспорт данных.

## Технологии

| Слой | Технологии |
| --- | --- |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| База данных | PostgreSQL |
| Frontend | React 18, React Router, Vite |
| Авторизация | JWT, bcrypt |
| Изображения | Файлы в `backend/uploads`, в БД хранится путь `/uploads/...` |

## Структура

```text
Cinemas02/
  backend/
    main.py
    database.py
    models.py
    schemas.py
    auth.py
    image_storage.py
    requirements.txt
    routers/
    uploads/
  frontend/
    src/
    package.json
    vite.config.js
```

## Настройка базы данных

Проект сейчас подключается к PostgreSQL через `backend/database.py`:

```python
DATABASE_URL = "postgresql://postgres:password@localhost:5432/testdb06"
```

Создайте базу с таким именем или измените строку подключения под свою:

```sql
CREATE DATABASE testdb06;
```

Таблицы создаются автоматически при запуске backend. Дополнительные изменения схемы применяются функцией `upgrade_schema()` в `backend/main.py`.

## Запуск backend

Откройте терминал в корне проекта:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend будет доступен здесь:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Запуск frontend в режиме разработки

Да, frontend собирается инструментом Vite, но во время разработки обычно нужна не production-сборка, а dev-сервер Vite.

Во втором терминале:

```powershell
cd frontend
npm install
npm run dev
```

Откройте:

```text
http://localhost:5173
```

Vite dev-сервер сам подхватывает изменения в React-файлах. После каждого изменения вручную выполнять `npm run build` не нужно. Обычно достаточно сохранить файл и обновить страницу, а часто Vite обновит ее сам.

## Когда нужен `npm run build`

Команда:

```powershell
cd frontend
npm run build
```

нужна в таких случаях:

- проверить, что frontend собирается без ошибок перед сдачей проекта;
- подготовить production-версию в папке `frontend/dist`;
- перед деплоем на сервер;
- после крупных изменений, если хотите быстро поймать ошибки сборки.

После каждого маленького изменения запускать `npm run build` не нужно. Для обычной разработки используйте `npm run dev`.

Проверить собранную production-версию можно так:

```powershell
cd frontend
npm run build
npm run preview
```

## Полный запуск проекта

Терминал 1, backend:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload
```

Терминал 2, frontend:

```powershell
cd frontend
npm run dev
```

После этого сайт открывается на `http://localhost:5173`, а frontend проксирует запросы `/api` на backend `http://localhost:8000`.

## Первый администратор

1. Зарегистрируйтесь через страницу регистрации.
2. В PostgreSQL назначьте пользователю роль администратора:

```sql
\c testdb06
UPDATE users SET role = 'admin' WHERE username = 'ваш_логин';
```

3. Выйдите и войдите снова.

## Изображения

Фронтенд отправляет выбранную картинку как `data:image/...;base64,...`. Backend принимает эту строку, сохраняет файл в:

```text
backend/uploads/cinemas/
backend/uploads/films/
```

В базе данных хранится не base64-текст, а путь вида:

```text
/uploads/cinemas/имя_файла.png
```

FastAPI раздает эти файлы по URL `/uploads/...`.

## Залы кинотеатра

При создании кинотеатра залы автоматически не создаются. Залы добавляются вручную на странице кинотеатра через кнопку `+ Зал`: нужно указать название зала и количество мест.

Количество залов считается по реально добавленным залам.

## Полезные команды

Backend:

```powershell
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Проверка frontend-сборки:

```powershell
cd frontend
npm run build
```

Очистка всех данных в базе:

```sql
TRUNCATE TABLE promo_redemptions, tickets, sessions, halls, films, cinemas, promo_codes, users RESTART IDENTITY CASCADE;
```
```