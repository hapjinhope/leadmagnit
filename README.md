# Мини-апп с входом через Telegram

Простое SPA: вход через Telegram, затем меню с двумя разделами – список групп/каналов и пустой экран для ключевых слов.

## Запуск

```bash
npm install
cp .env.example .env # впишите имя бота без @
npm run dev
```

## Переменные окружения

- `VITE_TELEGRAM_BOT` — username бота для Telegram Login Widget (пример: `my_bot`).

## Деплой на Railway (статический preview)

1. Залогиньтесь в Railway и создайте новый проект из этого репо.  
2. В Variables добавьте `VITE_TELEGRAM_BOT=happrembot` (или своё имя бота).  
3. В Settings → Deploy указать: Build command `npm run build`, Start command `npm run start`.  
4. После деплоя возьмите выданный домен и пропишите его боту в BotFather → Bot Settings → Web Login.  
5. Откройте домен — виджет авторизации должен работать без ошибки Bot domain invalid.

## Как устроено

- `src/components/TelegramLogin.jsx` — обёртка над Telegram Login Widget.
- `src/App.jsx` — навигация по экранам: авторизация → меню → группы/каналы → ключевые слова.
- Данные групп сейчас заглушечные (`mockGroups`). Подключите вызов к Telegram API (TDLib/MTProto) после получения данных авторизации, чтобы подменить реальные подписки.
