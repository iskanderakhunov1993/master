# Мастер рядом

«Мастер рядом» — MVP платформы быстрого вызова бытовых мастеров. Клиент создаёт заказ, получает до трёх релевантных предложений и выбирает исполнителя. Мастер получает только подходящие заказы по категориям и районам, предлагает цену, подтверждает выезд и ведёт заказ до завершения. Точный адрес открывается только выбранному мастеру.

В проект также входят бытовые задачи клиента (Kanban), календари клиента и мастера, профили и ручная верификация мастеров, отзывы и минимальная административная панель.

## Стек

- Next.js 16, App Router и Server Actions;
- React 19;
- TypeScript 5 в strict mode;
- `better-sqlite3` как текущий runtime MVP;
- Prisma ORM и PostgreSQL как подготовленный, но ещё не завершённый production cutover;
- Zod для входной валидации;
- bcryptjs для хеширования паролей;
- Lucide React для иконок;
- ESLint и встроенный Node.js test runner через `tsx`.

AI, платное ранжирование и покупка лидов не используются.

## Требования

- Node.js 22 LTS или новее;
- npm 10 или новее;
- PostgreSQL 14+ нужен только для проверки подготовленной Prisma-схемы и будущей миграции;

## Быстрый старт текущего MVP

```bash
npm install
npm run seed
npm run dev
```

После запуска приложение доступно по адресу [http://localhost:3000](http://localhost:3000).

SQLite-файл создаётся в `.data/` и не коммитится. Для проверки подготовленного PostgreSQL-контура используйте [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md), но он пока не заменяет активный runtime.

## Переменные окружения

**Текущий runtime:**

| Переменная | Пример | Назначение |
| --- | --- | --- |
| `DATABASE_FILENAME` | `master-ryadom.db` | SQLite-файл текущего MVP в `.data/` |

**Будущая миграция PostgreSQL:**

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

Активные repositories используют SQLite через `better-sqlite3`. Prisma-схема и PostgreSQL-инструменты находятся в переходном состоянии и не покрывают весь runtime-контракт. Постоянный dual-write запрещён.

### Проверка подготовленной PostgreSQL-схемы

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

### После завершения cutover

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

- SQLite и хранение изображений в текущем MVP подходят только для локальной разработки и одного экземпляра приложения;
- Prisma/PostgreSQL подготовлены частично, но ещё не являются canonical runtime;
- обновления заказов используют polling fallback, отдельный realtime transport не подключён;
- верификация мастеров выполняется администратором вручную;
- приблизительное расстояние рассчитывается детерминированно без геокодинга и маршрутизации;
- экран движения мастера использует демонстрационный route asset, а не live GPS;
- платежи, чат, SMS/push-уведомления и автоматическое урегулирование споров не входят в MVP;
- счётчик гарантии в паспорте дома не является полноценной гарантийной моделью;
- административная панель покрывает основные операции, но не является полноценной службой поддержки и аналитики.

Для production понадобятся завершённый PostgreSQL cutover, объектное хранилище изображений, HTTPS и secrets management, резервные копии, observability, а при включении соответствующих сценариев — PSP, карты/геокодинг, realtime и сервис уведомлений. Контракты описаны в [P0-спецификации](./docs/product/07-p0-specifications.md).
