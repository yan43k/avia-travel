# Avia Travel

Веб-сервис автобусной логистики (Алтайский край): расчёт доставки, трекинг посылок, личный кабинет, админ-панель.

**Стек:** React (Vite) + Express + PostgreSQL (Prisma).

## Деплой на Render

[README-DEPLOY.md](./README-DEPLOY.md)

## Локальный запуск

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

## Демо-доступ

| Роль | Email | Пароль |
|------|--------|--------|
| Клиент | `client@avia-travel.local` | `ClientPass123!` |
| Админ | `admin@avia-travel.local` | `AdminPass123!` |

Трек: `AV10293847`
