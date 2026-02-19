# Task Tracker (React + Supabase)

## Запуск

1) Установить зависимости:

```bash
npm install
```

2) Создать переменные окружения:
- Скопируйте `.env.example` → `.env.local`
- Заполните `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`

3) Поднять dev-сервер:

```bash
npm run dev
```

## Supabase (схема БД + RLS)

Схема находится в `supabase/schema.sql`.

Применение:
- Откройте Supabase Dashboard → SQL Editor
- Вставьте содержимое `supabase/schema.sql`
- Выполните

Политики RLS настроены так, что **любой authenticated user** может читать/создавать/обновлять/удалять записи.

## Auth

Используется Supabase Auth (email/password). Создайте пользователей в Supabase:
- Authentication → Users → Add user

## Фото сотрудников (опционально)

В разделе «Команда» можно загружать фото сотрудников. Нужно:

1. Добавить колонку (если таблица уже создана без неё): выполните `supabase/migrations/001_employees_avatar.sql` в SQL Editor.
2. Создать bucket в Supabase Storage: Dashboard → Storage → New bucket, имя `avatars`, сделать его **public** (Public bucket). Политики: разрешить чтение всем, загрузку — authenticated.

