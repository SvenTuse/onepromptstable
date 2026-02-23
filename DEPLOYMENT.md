# Деплой на Vercel: Frontend и Backend отдельно

В репозитории два приложения:
- **Frontend** (корень проекта) — Vite + React, статический билд в `dist/`.
- **Backend** (папка `backend/`) — Express, на Vercel работает как serverless.

Оба деплоятся **разными проектами** в одном аккаунте Vercel: у frontend свой URL, у backend свой. Фронт ходит на backend по переменной `VITE_API_URL`; backend разрешает запросы с фронта через `FRONTEND_URL` (CORS).

---

## 1. Локальная проверка «как в production»

Перед деплоем можно прогнать сцену «два отдельных приложения» локально: backend на одном порту, собранный фронт на другом.

### 1.1 Переменные окружения

**Корень проекта (frontend):** файл `.env` (или `.env.production.local` для билда):

```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=ваш_google_client_id
VITE_SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
VITE_SOLANA_WS_ENDPOINT=wss://api.mainnet-beta.solana.com
```

**Backend:** `backend/.env`:

```env
FRONTEND_URL=http://localhost:5173,http://localhost:4173
# ... остальное как в backend/.env.example (DATABASE_URL, JWT_*, OPENROUTER_API_KEY и т.д.)
```

`FRONTEND_URL` можно задать списком через запятую: так будут разрешены и dev-сервер (5173), и preview (4173).

### 1.2 Запуск

**Терминал 1 — backend:**

```bash
cd backend
npm install
npm run build
npm run dev
```

Сервер слушает `http://localhost:3001`.

**Терминал 2 — frontend (production-сборка + preview):**

```bash
npm install
npm run build
npm run preview
```

Откройте в браузере URL из `preview` (обычно `http://localhost:4173`). Проверьте: логин, чат, запросы к API — всё должно идти на `http://localhost:3001`.

При необходимости можно вместо `preview` использовать `vercel dev` в корне (см. раздел про CLI): тогда фронт будет на порту, который укажет Vercel CLI, и этот origin нужно добавить в `FRONTEND_URL` в `backend/.env`.

---

## 2. Vercel CLI: установка и привязка

- Установка: `npm i -g vercel` (или `pnpm i -g vercel`).
- Логин: `vercel login`.
- В корне репозитория (для фронта): `vercel link` — выберите или создайте проект (например, `one-prompt-frontend`).
- В папке backend: `cd backend` → `vercel link` — отдельный проект (например, `one-prompt-backend`).

Два проекта в одном аккаунте — два разных деплоя и два URL.

---

## 3. Переменные окружения на Vercel

Файл `.env` в репозиторий не коммитить. На Vercel переменные задаются через Dashboard или CLI.

### 3.1 Через Dashboard

- Проект → **Settings** → **Environment Variables**.
- Добавить переменные для **Production** (и при необходимости Preview).

### 3.2 Через CLI

Из каталога проекта (корень для frontend, `backend` для backend):

```bash
vercel env add VITE_API_URL production
# ввести значение и подтвердить
```

Просмотр (без значений): `vercel env ls`.

Локально при `vercel dev` переменные подтягиваются из Vercel (если проект привязан через `vercel link`) или из локального `.env` в соответствующей папке.

### 3.3 Backend (проект в папке `backend/`)

Добавить в проект backend все переменные из `backend/.env.example`, в т.ч.:

- `DATABASE_URL`, при необходимости `CHAT_DATABASE_URL`, `DATABASE_SSL`, `CHAT_DATABASE_SSL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `OPENROUTER_API_KEY`, при необходимости `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- **`FRONTEND_URL`** — URL фронта на Vercel (например `https://one-prompt-frontend.vercel.app`). Можно несколько через запятую: production + preview.

Остальное по необходимости: `SOLANA_RPC_ENDPOINT`, `SOLANA_WS_ENDPOINT`, `PORT` (на Vercel обычно не нужен).

### 3.4 Frontend (проект в корне)

- **`VITE_API_URL`** — полный URL backend на Vercel (например `https://one-prompt-backend.vercel.app`). Без завершающего слеша.
- `VITE_GOOGLE_CLIENT_ID`
- При необходимости: `VITE_SOLANA_RPC_ENDPOINT`, `VITE_SOLANA_WS_ENDPOINT`

После добавления/изменения переменных нужен новый деплой (пересборка), чтобы они попали в билд.

---

## 4. Порядок деплоя на Vercel

1. **Сначала задеплоить backend**
   - В Vercel: New Project → импорт репозитория.
   - **Root Directory** указать `backend`.
   - Добавить переменные окружения (см. выше), в т.ч. временно можно поставить `FRONTEND_URL=*` или любой placeholder.
   - Deploy. Запомнить URL backend (например `https://one-prompt-backend.vercel.app`).

2. **Задеплоить frontend**
   - Новый проект из того же репозитория.
   - **Root Directory** оставить корень (или пусто).
   - В переменных окружения задать **`VITE_API_URL`** = URL backend из шага 1.
   - Остальные `VITE_*` по необходимости. Deploy.

3. **Обновить backend**
   - В проекте backend в Vercel добавить/изменить **`FRONTEND_URL`** на реальный URL фронта (например `https://one-prompt-frontend.vercel.app`). При использовании preview-деплоев можно указать несколько origin через запятую.
   - Сделать повторный деплой backend (Redeploy в Dashboard или `vercel --prod` из папки `backend`).

После этого фронт будет слать запросы на backend, а backend будет разрешать CORS для фронта.

---

## 5. Деплой через Vercel CLI

### Backend

```bash
cd backend
vercel link          # если ещё не привязан
vercel env pull .env.local   # опционально: скачать env из Vercel для локальной проверки (не коммитить)
vercel               # preview-деплой
vercel --prod        # production
```

Убедитесь, что в настройках проекта backend в Vercel указан **Root Directory: backend** (если создавали проект через Dashboard и выбирали папку). При деплое из `backend/` через CLI корень деплоя — уже эта папка.

### Frontend

```bash
# из корня репозитория
vercel link
vercel               # preview
vercel --prod        # production
```

Перед production-деплоем фронта проверьте, что в проекте frontend на Vercel задана переменная **`VITE_API_URL`** на production URL backend.

---

## 6. Локальный прогон под Vercel (опционально)

- **Backend:** в папке `backend` выполнить `vercel dev`. Поднимется локальный сервер, который эмулирует serverless (все запросы идут в одно приложение).
- **Frontend:** в корне выполнить `vercel dev`. Фронт будет отдаваться локально; если в проекте на Vercel задан `VITE_API_URL`, запросы пойдут туда. Чтобы они шли на локальный backend, в корне можно завести `.env.local` с `VITE_API_URL=http://localhost:3001` (приоритет над env из Vercel при `vercel dev`).

Для полной локальной схемы «фронт + backend как в production» удобнее вариант из раздела 1: два терминала (backend `npm run dev` + frontend `npm run build && npm run preview`) и `.env` / `backend/.env` с нужными URL.

---

## 7. Краткий чеклист

- [ ] Backend: в Vercel заданы все переменные из `backend/.env.example`, включая `FRONTEND_URL` (URL фронта на Vercel).
- [ ] Frontend: в Vercel задана `VITE_API_URL` (URL backend на Vercel).
- [ ] Локально проверена связка: backend на 3001, frontend `npm run build && npm run preview`, запросы идут на backend, CORS без ошибок.
- [ ] Сначала задеплоен backend, затем frontend с правильным `VITE_API_URL`, затем при необходимости обновлён `FRONTEND_URL` в backend и передеплоен backend.
