# Мастер рядом

«Мастер рядом» — MVP платформы быстрого вызова бытовых мастеров. Клиент создаёт заказ, получает до трёх релевантных предложений и выбирает исполнителя. Мастер получает только подходящие заказы по категориям и районам, предлагает цену, подтверждает выезд и ведёт заказ до завершения. Точный адрес открывается только выбранному мастеру.

В проект также входят бытовые задачи клиента (Kanban), календари клиента и мастера, профили и ручная верификация мастеров, отзывы и минимальная административная панель.

## Стек

- Next.js 16, App Router и Server Actions;
- React 19;
- TypeScript 5 в strict mode;
- **PostgreSQL** через **Prisma ORM** (была SQLite);
- Zod для входной валидации;
- bcryptjs для хеширования паролей;
- Lucide React для иконок;
- ESLint и встроенный Node.js test runner через `tsx`.

AI, платное ранжирование и покупка лидов не используются.

## Требования

- Node.js 22 LTS или новее;
- npm 10 или новее;
- **PostgreSQL 14+** (локально, Docker или облако)

## Быстрый старт

### 1. С Docker (рекомендуется)
```bash
# Запустите PostgreSQL контейнер
docker run --name master-ryadom-db \
  -e POSTGRES_DB=master_ryadom \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16

# Установите зависимости и инициализируйте БД
npm install
npx tsx scripts/init-postgres.ts
npm run dev
```

### 2. С локальным PostgreSQL
```bash
npm install
npm run prisma:push
npm run dev
```

После запуска приложение доступно по адресу [http://localhost:3000](http://localhost:3000).

📖 **Подробно:** см. [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)

## Переменные окружения

**Основная:** (обновлена для PostgreSQL)

| Переменная | Пример | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/master_ryadom` | PostgreSQL connection string |

**Дополнительные** (опционально):

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `SESSION_TTL_DAYS` | `7` | Срок жизни серверной сессии в днях |
| `URGENCY_MULTIPLIER` | `2` | Коэффициент срочного заказа, `1–5` |
| `NORMAL_MATCH_TTL_MINUTES` | `120` | Время жизни обычного matching, `15–1440` |
| `URGENT_MATCH_TTL_MINUTES` | `45` | Время жизни срочного matching, `10–240` |
| `MASTER_OFFER_TTL_MINUTES` | `20` | Время жизни предложения, `5–120` |

В production cookie сессии автоматически получает флаг `Secure`. Приложение должно работать только через HTTPS.

## База данных и миграции

Приложение использует **Prisma ORM** для работы с PostgreSQL.

### Инициализация (первый запуск)

```bash
# Создайте базу (см. POSTGRESQL_SETUP.md) и обновите .env
npm run prisma:push
```

### Разработка БД

```bash
# Генерировать Prisma клиент (после изменений schema.prisma)
npm run prisma:generate

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio
```

### Production

Используйте управляемые БД сервисы:
- **Supabase** (бесплатно)
- **Neon** (serverless PostgreSQL)
- **AWS RDS**, **DigitalOcean**, **Azure**

📖 **Подробно:** см. [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)

## Demo-среда

Пароль всех demo-аккаунтов: `Demo123!`.

| Роль | Имя | Email |
| --- | --- | --- |
| Клиент | Анна Сергеева | `client@master-ryadom.ru` |
| Мастер | Александр Петров | `master@master-ryadom.ru` |
| Мастер | Михаил Смирнов | `electrician@master-ryadom.ru` |
| Мастер | Сергей Иванов | `handyman@master-ryadom.ru` |
| Администратор | Ольга Администратор | `admin@master-ryadom.ru` |

Seed создаёт:

- активный заказ с Александром Петровым;
- срочный заказ с двумя действующими предложениями;
- два завершённых заказа с отзывами и историей статусов;
- отменённый заказ;
- четыре Kanban-задачи, включая связанные с заказами;
- события в календарях клиента и мастера;
- публичную историю работ и последние отзывы трёх мастеров.

## Основные маршруты

- `/` — публичный лендинг;
- `/login`, `/register` — authentication;
- `/client` — dashboard клиента;
- `/client/orders/new` — создание заказа;
- `/client/orders` — активные, запланированные, завершённые и отменённые заказы;
- `/client/tasks`, `/client/calendar`, `/client/addresses` — задачи, календарь и адреса;
- `/master` — dashboard мастера;
- `/master/orders/new`, `/master/orders`, `/master/calendar`, `/master/profile` — лента, жизненный цикл, календарь и профиль;
- `/admin` и `/admin/*` — административная панель.

Role areas проверяются server-side. Клиент, мастер и администратор перенаправляются в свой кабинет и не могут открыть чужую область.

## Команды разработки

```bash
npm run dev        # development server
npm run lint       # ESLint
npm run typecheck  # TypeScript без emit
npm test           # все backend/domain tests
npm run build      # production build
npm run start      # запуск production build
npm run seed       # обновление demo-данных
```

Рекомендуемая финальная проверка перед выпуском:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Границы текущего MVP

- ~~SQLite и хранение изображений BLOB подходят для локального MVP и одного экземпляра приложения, но не для горизонтального масштабирования;~~ → **PostgreSQL готова к масштабированию**
- обновления заказов используют polling fallback, отдельный realtime transport не подключён;
- верификация мастеров выполняется администратором вручную;
- приблизительное расстояние рассчитывается детерминированно без геокодинга и маршрутизации;
- платежи, чат, SMS/push-уведомления и автоматическое урегулирование споров не входят в MVP;
- административная панель покрывает основные операции, но не является полноценной службой поддержки и аналитики.

Для production понадобятся управляемая SQL-база с транзакциями, объектное хранилище изображений, HTTPS и secrets management, резервные копии, observability, а при включении соответствующих сценариев — карты/геокодинг, realtime и сервис уведомлений.
