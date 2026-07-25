# PostgreSQL Setup для "Мастер рядом"

Проект переведён на **PostgreSQL** с помощью **Prisma ORM**. Ниже приведена инструкция по настройке.

## 📦 Установка PostgreSQL

### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Загрузите installer с [postgresql.org](https://www.postgresql.org/download/windows/)

### Docker (рекомендуется для dev)
```bash
docker run --name master-ryadom-db \
  -e POSTGRES_DB=master_ryadom \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

## 🔧 Конфигурация

### 1. Создайте базу данных

```bash
psql -U postgres

# В интерактивной сессии:
CREATE DATABASE master_ryadom;
\q
```

### 2. Обновите `.env`

```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/master_ryadom"
```

### 3. Примените миграции Prisma

```bash
npm run prisma:generate
npm run prisma:push
```

## 🚀 Использование

### Развёртывание схемы
```bash
# Автоматически создаст все таблицы из schema.prisma
npm run prisma:push
```

### Создание миграций (для разработки)
```bash
# После изменения schema.prisma:
npm run prisma:migrate -- --name add_new_field
```

### Просмотр БД в GUI
```bash
npm run prisma:studio
# Откроется http://localhost:5555
```

## 📊 Таблицы

Prisma автоматически создаст следующие таблицы:

- `users` — пользователи (клиенты, мастера, администраторы)
- `user_profiles` — профили пользователей
- `user_addresses` — сохранённые адреса
- `orders` — заказы
- `order_photos` — фото заказов
- `order_status_history` — история статусов
- `order_service_areas` — районы обслуживания
- `master_profiles` — профили мастеров
- `master_photos` — фото мастеров
- `master_qualifications` — квалификации
- `master_subscriptions` — подписки
- `master_offers` — предложения мастеров
- `reviews` — отзывы
- `review_photos` — фото в отзывах
- `session_tokens` — сессии
- `calendar_events` — события календаря
- `kanban_tasks` — канбан-задачи
- `task_photos` — фото задач
- `admin_notes` — заметки администратора

## 🔄 Миграция данных с SQLite

Если нужно перенести данные с SQLite на PostgreSQL:

```bash
# Экспортируйте из SQLite
sqlite3 .data/master-ryadom.db ".dump" > dump.sql

# Адаптируйте синтаксис (SQL различается):
# 1. Удалите SQLite-специфичные команды
# 2. Преобразуйте типы данных (INTEGER -> BIGINT, TEXT -> VARCHAR)
# 3. Импортируйте в PostgreSQL

psql -U postgres -d master_ryadom < dump_adapted.sql
```

## ⚙️ Production-конфигурация

### Используйте управляемую БД

**Рекомендуемые сервисы:**
- Supabase (бесплатно, на базе PostgreSQL)
- Neon (бесплатно, serverless PostgreSQL)
- AWS RDS PostgreSQL
- DigitalOcean Managed Database
- Azure Database for PostgreSQL

### Пример конфига Supabase
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
```

### SSL (обязательно для production)
```bash
# В DATABASE_URL добавьте параметр sslmode
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

## 🐛 Troubleshooting

### Ошибка: "psql: could not translate host name 'localhost' to address"
```bash
# Используйте IP-адрес
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/master_ryadom"
```

### Ошибка: "permission denied for schema public"
```bash
# Выдайте права пользователю
psql -U postgres -d master_ryadom -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;"
```

### Ошибка: "Prisma schema was modified"
```bash
# Пересоздайте Prisma клиент
npm run prisma:generate
```

## 📝 Важные замечания

1. **SQLite всё ещё поддерживается** в старой папке `.data/`, но не используется.
2. **Все новые фичи должны использовать Prisma ORM** вместо прямых SQL-запросов.
3. **Миграции хранятся в `prisma/migrations/`** — добавьте их в git.
4. **Для development используйте Docker** для удобства и консистентности.

## 📚 Документация

- [Prisma Docs](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
