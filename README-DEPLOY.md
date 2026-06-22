# Деплой Avia Travel на Render (бесплатно)

React + Express + **PostgreSQL на Neon** (бесплатно) + Render (API + static site).

## Почему БД не на Render?

На бесплатном аккаунте Render можно иметь **только одну** active free PostgreSQL. Если у тебя уже есть другая БД (flux-store и т.д.) — используем **Neon** (тоже бесплатно, без лимита «одна БД»).

---

## Шаг 1. База Neon (2 минуты)

1. Зайди на [neon.tech](https://neon.tech) → регистрация (можно через GitHub).
2. **New Project** → имя `avia-travel` → регион ближе к Render (например US East).
3. На странице проекта скопируй **Connection string** (PostgreSQL), вид:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Сохрани строку — понадобится в Render.

---

## Шаг 2. Render Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → Blueprint **avia-travel** → **Manual sync** (или New Blueprint).
2. Репозиторий: **yan43k/avia-travel**, ветка **main**.
3. **Apply / Sync**.

Создадутся только:
- `avia-travel-api` (Node, free)
- `avia-travel-web` (static, free)

---

## Шаг 3. DATABASE_URL в Render (обязательно)

1. Render → сервис **avia-travel-api** → **Environment**.
2. Добавь переменную:
   - **Key:** `DATABASE_URL`
   - **Value:** строка подключения из Neon (шаг 1)
3. **Save Changes** → Render перезапустит API.

При старте API выполнит миграции и сид (демо-данные, если БД пустая).

---

## Шаг 4. Проверка

- API: `https://avia-travel-api.onrender.com/api/health` → `{"ok":true,...}`
- Сайт: `https://avia-travel-web.onrender.com`

**Демо-логины:**

| Роль | Email | Пароль |
|------|--------|--------|
| Клиент | `client@avia-travel.local` | `ClientPass123!` |
| Админ | `admin@avia-travel.local` | `AdminPass123!` |

**Трек:** `AV10293847`

Первый заход после простоя API может занять **~1 мин** (free tier cold start).

---

## Альтернатива: одна БД на Render

Если старая free Postgres на Render **не нужна** — удали её в Dashboard → можно вернуть блок `databases` в `render.yaml`. Сейчас в Blueprint БД **намеренно убрана** из‑за лимита.

---

## Локально

```powershell
docker compose up -d
cd backend
copy .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

---

## Обновление кода

```powershell
cd C:\Users\zzki\.cursor\projects\empty-window\deploy
.\init-deploy-repo.ps1
```

Или вручную из `C:\Users\zzki\Projects\avia-travel`: `git push`.
