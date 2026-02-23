# 🚀 Быстрый старт Google OAuth

## ⚡ За 5 минут

### 1️⃣ Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте проект
3. **APIs & Services** → **OAuth consent screen**:
   - External
   - App name + emails
   - Scopes: `openid`, `profile`, `email`
4. **Credentials** → **Create OAuth Client ID**:
   - Web application
   - Authorized origins: `http://localhost:5173`
   - Authorized redirects: `http://localhost:5173`
5. **Скопируйте Client ID и Client Secret**

### 2️⃣ Backend (.env)

Откройте `backend/.env`:

```env
GOOGLE_CLIENT_ID=ваш_client_id_сюда
GOOGLE_CLIENT_SECRET=ваш_client_secret_сюда
```

### 3️⃣ Frontend (.env)

Откройте `.env` в корне:

```env
VITE_GOOGLE_CLIENT_ID=ваш_client_id_сюда
```

### 4️⃣ Запуск

```bash
# Backend
cd backend
npm run dev

# Frontend (в новом терминале)
npm run dev
```

Откройте http://localhost:5173 → нажмите Login → **Sign in with Google** ✅

---

## 📖 Полная документация

См. [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) для:
- Детальных инструкций
- Решения проблем
- Production deploy
- Тестирования

---

## ✅ Проверка

1. ✅ Backend запущен на :3001
2. ✅ Frontend запущен на :5173
3. ✅ Google Client ID установлен в обоих .env
4. ✅ Authorized origins добавлены в Google Console

---

## ❓ Проблемы

**redirect_uri_mismatch?**
→ Проверьте точность URL в Google Console (должен быть `http://localhost:5173`)

**Google button не показывается?**
→ Перезапустите `npm run dev` после изменения .env

**CORS ошибка?**
→ Проверьте `FRONTEND_URL=http://localhost:5173` в `backend/.env`

---

**Готово! 🎉**
