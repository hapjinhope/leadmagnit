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
- `WEBAPP_BASE_URL` — опционально, публичный URL для мини-приложения (`https://example.com/webapp/`). Если не задан, кнопка WebApp не работает.
- `MONITORED_GROUPS` — опционально: список доступных chat_id через запятую. Если задан, выбирать можно только из них.
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
- В личном чате с ботом выполните `/start`, отправьте номер телефона.
- Настройка без WebApp: `/groups` (посмотреть), `/setgroups id1,id2` (задать группы), `/keywords` (посмотреть), `/setkeywords слово1,слово2` (задать).
- Бот отслеживает сообщения в группах, которые вы указали, и шлёт уведомления при совпадении по ключевым словам (пользователю или в фиксированный чат, в зависимости от настроек).

## Деплой (пример Railway)
- Добавьте переменные окружения как в `.env` (TELEGRAM_BOT_TOKEN, WEBAPP_BASE_URL опционально, ALERT_FIXED_CHAT_ID по желанию, PORT, SUPABASE_URL, SUPABASE_KEY).
- Команда установки: `npm install`
- Команда запуска: `npm start` (Railway подставит свой `PORT`, приложение его подхватит).
- В `WEBAPP_BASE_URL` укажите HTTPS-домен Railway с суффиксом `/webapp/` (например, `https://<app>.up.railway.app/webapp/`).
