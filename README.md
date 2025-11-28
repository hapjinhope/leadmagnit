# Telegram Lead Monitor

Лид-магнит: Telegram-бот + WebApp для выбора групп и ключевых слов, с уведомлениями о совпадениях.

## Установка
1. Установите зависимости:
   ```bash
   npm install
   ```

## Настройка
1. Скопируйте пример окружения и заполните значения:
   ```bash
   cp .env.example .env
   ```
2. Укажите:
- `TELEGRAM_BOT_TOKEN` — токен бота.
- `WEBAPP_BASE_URL` — публичный URL для мини-приложения (`https://example.com/webapp/`).
- `MONITORED_GROUPS` — ID групп/чатов через запятую (`-100123,-100987`).
- `ALERT_FIXED_CHAT_ID` — если указано, алерты слать всегда в этот чат; если пусто — слать пользователю.
- `PORT` — порт Express (по умолчанию 3000).
- Supabase: `SUPABASE_URL` + `SUPABASE_KEY` (publishable или service; для записи лучше service-role). Пример URL: `https://<project>.supabase.co`.

## Запуск локально
```bash
npm run build
npm start
```

## Как использовать
- Добавьте бота в группы, указанные в `MONITORED_GROUPS`.
- В личном чате с ботом выполните `/start`, отправьте номер телефона, нажмите «Открыть приложение».
- В WebApp отметьте группы из списка доступных и добавьте ключевые слова.
- Бот будет отслеживать сообщения в выбранных группах и слать уведомления при совпадении по ключевым словам (пользователю или в фиксированный чат, в зависимости от настроек).

## Деплой (пример Railway)
- Добавьте переменные окружения как в `.env` (TELEGRAM_BOT_TOKEN, WEBAPP_BASE_URL, MONITORED_GROUPS, ALERT_FIXED_CHAT_ID по желанию, PORT, SUPABASE_URL, SUPABASE_KEY).
- Команда установки: `npm install`
- Команда запуска: `npm start` (Railway подставит свой `PORT`, приложение его подхватит).
- В `WEBAPP_BASE_URL` укажите HTTPS-домен Railway с суффиксом `/webapp/` (например, `https://<app>.up.railway.app/webapp/`).
