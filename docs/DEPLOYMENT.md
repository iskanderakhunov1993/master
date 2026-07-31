# DEPLOYMENT (Production)

Краткое руководство по деплою проекта в продакшн на Vercel (и важные замечания).

## Ключевая проблема
Проект использует better-sqlite3 и хранение изображений в BLOB — это нормально для локального MVP, но не подходит для serverless-платформ (Vercel). Перед деплоем нужно мигрировать базу на управляемую (Postgres) и вынести файлы в объектное хранилище (S3-compatible).

## Рекомендуемые шаги
1. Выбрать инфраструктуру данных:
   - Postgres: Supabase / Vercel Postgres / Amazon RDS / PlanetScale
   - Object storage: AWS S3 / DigitalOcean Spaces / MinIO
2. Миграция схемы и данных:
   - Экспорт demo-данных из SQLite и импорт в Postgres OR
   - Реализовать поддержку Postgres в коде (рекомендуется использовать query layer или ORM)
3. Секреты и env vars:
   - Настроить SESSION_SECRET, DATABASE_URL, S3_* в Vercel Environment Variables
4. CI/CD:
   - Подключить репозиторий к Vercel (или использовать GitHub Actions для build → deploy)
5. Проверки перед релизом:
   - npm run lint && npm run typecheck && npm test && npm run build
6. Мониторинг и бэкапы:
   - Настроить Sentry/Log aggregation и резервное копирование базы

## Быстрая инструкция (Vercel)
1. Создать проект в Vercel и подключить репозиторий GitHub.
2. В Vercel > Settings > Environment Variables добавить переменные из `.env.production.example`.
3. Убедиться, что приложение использует внешнюю Postgres (DATABASE_URL) и S3 для файлов.
4. Развернуть и проверить сценарии: регистрация, создание заказа, upload фото, seed-демо.

## Альтернатива: разделить frontend / API
Если не хочется менять код для Postgres сейчас, можно:
- Разместить frontend (Next) в Vercel, но вынести backend (Node + better-sqlite3) на отдель сервер (DigitalOcean/Render) и настроить API URL.

---
Файлы конфигурации и CI добавлены в репозиторий. Этот PR содержит инструкции и шаблон env. Следующий шаг — согласовать вариант миграции БД (Postgres) и выбрать поставщика object storage для изображений.
