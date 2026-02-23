# Взаимодействие с базой данных Neon

Техническое описание подключения и использования Neon PostgreSQL в проекте. Документ предназначен для встраивания параллельной базы данных для сохранения всех запросов пользователей.

---

## 1. Подключение к Neon

### 1.1 Конфигурация

- **Файл:** `backend/src/config/database.ts`
- **Драйвер:** `pg` (node-postgres), используется **пул соединений** (`Pool`), не одиночное подключение.
- **Переменная окружения:** `DATABASE_URL` — строка подключения к PostgreSQL (формат Neon: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`).
- **Дополнительно:** `DATABASE_SSL` — если `'false'` или `'0'`, SSL отключается (для локального Postgres).

### 1.2 Параметры пула

```ts
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },  // только если URL содержит 'neon.tech' или 'sslmode=require'
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

- SSL включается автоматически, если в `DATABASE_URL` есть `neon.tech` или `sslmode=require`, и при этом не задано `DATABASE_SSL=false`.
- Экспортируется один общий **singleton** `pool`; все сервисы импортируют его из `../config/database`.

### 1.3 Prisma

- **Схема:** `backend/prisma/schema.prisma` — описание моделей (User, RefreshToken, Balance, Transaction, ApiUsage).
- **Подключение Prisma:** в `backend/prisma.config.ts` используется тот же `process.env.DATABASE_URL`.
- В рантайме приложения **Prisma Client не используется** — все запросы идут через `pg` и сырой SQL в сервисах.

---

## 2. Миграции

- **Каталог:** `backend/migrations/`
- **001_initial_schema.sql** — таблицы, индексы, триггеры, функция `process_transaction`, вью `user_stats`.
- **002_add_google_oauth.sql** — поля Google OAuth в `users`.
- Запуск: скрипт `backend/run-migration.js` создаёт свой `Pool` с `DATABASE_URL` и выполняет SQL из файла миграции.

---

## 3. Схема данных (таблицы, используемые в коде)

| Таблица           | Назначение |
|-------------------|------------|
| `users`           | Пользователи (email, username, пароль/Google OAuth, роль, активность). |
| `refresh_tokens`  | Refresh-токены (связь с user_id, хэш токена, срок, отзыв). |
| `balances`        | Баланс пользователя (balance_cents, locked_cents, version для optimistic locking). |
| `transactions`    | Ledger операций (deposit, usage, refund, bonus и т.д.). |
| `api_usage`       | Учёт использования API: модель, токены, стоимость, привязка к транзакции. |

Финансовая логика завязана на хранимую функцию **`process_transaction(...)`**: атомарное списание/начисление, блокировка строки баланса (`FOR UPDATE`), проверка идемпотентности по `idempotency_key`, запись в `transactions` и обновление `balances`.

---

## 4. Где и как идут запросы к Neon

Все обращения к БД идут через **один пул** `pool` из `backend/src/config/database.ts`.

### 4.1 AuthService (`backend/src/services/auth.service.ts`)

- **Паттерн:** для операций с несколькими запросами берётся клиент `const client = await pool.connect()`, в конце — `client.release()`.
- **Транзакции:** явные `BEGIN` / `COMMIT` / `ROLLBACK` при регистрации, логине с обновлением токенов, refresh токена, входе через Google.
- **Примеры запросов:**
  - Регистрация: проверка email/username, `INSERT INTO users`, вставка в `refresh_tokens`.
  - Логин: `SELECT` пользователя по email, обновление `last_login_at`, вставка refresh-токена.
  - Refresh: выборка по хэшу токена из `refresh_tokens` + `users`, обновление/отзыв старого токена, вставка нового.
  - Logout: `pool.query(...)` без клиента — один `UPDATE refresh_tokens SET revoked_at = NOW()`.
  - `getUserById`, `loginWithGoogle` — те же паттерны (client при необходимости, транзакции для Google flow).

### 4.2 BalanceService (`backend/src/services/balance.service.ts`)

- **Паттерн:** в основном `pool.query(...)` без отдельного клиента; для атомарных операций вызывается **одна** функция БД.
- **Ключевые вызовы:**
  - `getBalance(userId)` — `SELECT` из `balances`.
  - `deposit`, `charge`, `refund`, `bonus` — один вызов `SELECT process_transaction($1, $2, $3, $4, $5, $6)` с параметрами; возвращается `transaction_id`, затем `getTransaction(transactionId)` — `SELECT` из `transactions`.
  - `getTransactionHistory` — `SELECT` из `transactions` с пагинацией.
  - `logApiUsage` — `INSERT INTO api_usage (...)` (user_id, transaction_id, model, tokens_used, cost_cents, request_metadata).
  - `getUsageStats` — агрегирующий `SELECT` по `api_usage` за N дней.

### 4.3 Маршруты и косвенное использование БД

- **Chat** (`backend/src/routes/chat.ts`):  
  - Перед стримом: `BalanceService.getBalance(userId)` (если не free mode).  
  - После завершения стрима (в `onComplete`): при платном режиме — `BalanceService.charge(...)` и `BalanceService.logApiUsage(...)`.  
  То есть каждый платный запрос к чату порождает запись в `transactions` и в `api_usage`.
- **Auth** (`backend/src/routes/auth.routes.ts`): вызовы `AuthService` (register, login, refresh, logout, loginWithGoogle) — все обращения к БД идут внутри AuthService.
- **Balance** (`backend/src/routes/balance.routes.ts`): вызовы `BalanceService` (getBalance, deposit, getTransactionHistory, getUsageStats) — все обращения к БД внутри BalanceService.
- **Health** (`backend/src/server.ts`): `pool.query('SELECT 1')` для проверки подключения к Neon.
- **Старт сервера:** перед `app.listen` выполняется `pool.query('SELECT NOW()')`; при завершении процесса — `pool.end()`.

---

## 5. Точки, где создаются «запросы пользователей»

Для параллельной БД «все запросы пользователей» логично отождествить с:

1. **Запросы в чат (сообщения)**  
   - Маршрут: `POST /api/chat`.  
   - Контекст: `userId`, тело (message, temperature, maxTokens, mode), после ответа — факт использования (модель, токены, стоимость).  
   - В Neon уже пишется: при платном режиме — `transactions` + `api_usage` (через `BalanceService.charge` и `logApiUsage`).  
   - Для «полного» логирования запросов имеет смысл сохранять: user_id, message (или хэш/превью), модель, режим, токены, стоимость, timestamp, возможно request_id.

2. **Вход/регистрация (логин, регистрация, Google)**  
   - Маршруты: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/google`, `POST /api/auth/logout`.  
   - В Neon: изменения в `users`, `refresh_tokens`.  
   - Для параллельной БД можно писать события: тип (login/register/logout/refresh), user_id, ip, user_agent, timestamp.

3. **Операции с балансом**  
   - Чтение баланса, история транзакций, статистика использования — в основном чтение.  
   - Запись в Neon: deposit/charge/refund/bonus через `process_transaction` и `logApiUsage`.  
   - В параллельную БД можно дублировать «события»: тип операции, user_id, amount, transaction_id, timestamp.

4. **Уже существующая таблица `api_usage`**  
   - Содержит: user_id, transaction_id, model, tokens_used, cost_cents, request_metadata, created_at.  
   - Это естественное место «запросов к модели» в текущей БД; параллельная БД может хранить расширенный лог (полный текст запроса, ответа, заголовки и т.д.), если не хотите перегружать основную.

---

## 6. Рекомендации для параллельной БД запросов

- **Не менять существующий код Neon:** добавить отдельный модуль (например, `backend/src/config/audit-database.ts` или `logging-database.ts`) со своим пулом к другой БД (вторая `DATABASE_URL`, например `AUDIT_DATABASE_URL`).
- **Асинхронная запись:** не блокировать ответ пользователю. После основных операций (или в `onComplete` чата) ставить в очередь или вызывать `auditDb.query(...).catch(err => log(err))` без await в критичном пути.
- **Единые точки вставки:**  
  - Один сервис/функция для «лога запросов чата» (вызывать из `chat.ts` в onComplete, с параметрами user_id, message, model, tokens, cost, timestamp).  
  - При желании — отдельные функции для событий auth и для событий баланса.
- **Формат таблицы лога:** минимум — user_id, kind (chat/auth/balance), payload (JSONB), created_at; при необходимости — request_id, idempotency_key, чтобы не дублировать при повторах.
- **Повторные попытки:** при недоступности второй БД — логировать в файл или очередь и не падать; основной поток по Neon не должен зависеть от доступности параллельной БД.

---

## 7. Краткая схема потока данных к Neon

```
HTTP Request
    → Express (server.ts)
    → Route (auth / balance / chat)
    → Service (AuthService / BalanceService) или напрямую BalanceService в chat
    → pool.query(...) или pool.connect() → client.query(...)
    → Neon PostgreSQL (DATABASE_URL)
```

Все запросы к БД в приложении идут через этот единственный пул; отдельного ORM или второго драйвера к той же БД в рантайме нет. Параллельная БД для логов должна быть вторым пулом и вторым набором таблиц, с записью из тех же маршрутов/сервисов без изменения текущей логики Neon.
