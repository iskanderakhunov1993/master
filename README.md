# HomeFix / МастерGO

Full-stack MVP маркетплейса бытовых мастеров. Клиент создаёт заявку с фото,
адресом, временем и бюджетом, мастера предлагают цену и время, клиент выбирает
исполнителя, далее стороны общаются в чате, завершают заказ, оставляют отзывы, а
работа сохраняется в истории ремонта квартиры.

## Стек

- Next.js App Router + React + TypeScript
- API Routes
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Mock-friendly авторизация для MVP
- Локальное файловое хранилище через `public/uploads`

## Что реализовано

- Public: `/`, `/login`, `/register`, `/how-it-works`
- MVP product: `/product` с рабочим сценарием клиента и мастера
- Client: `/client/dashboard`, `/client/requests/new`, `/client/requests/[id]`,
  `/client/history`, `/client/history/[addressId]`, `/client/profile`
- Master: `/master/dashboard`, `/master/requests`, `/master/requests/[id]`,
  `/master/orders`, `/master/profile`, `/master/calendar`
- Admin: `/admin`, `/admin/users`, `/admin/requests`, `/admin/categories`
- API: auth, заявки, отклики, выбор мастера, чат, завершение, отзывы, история
- MVP API: `/api/mvp/state`, `/api/mvp/orders`, accept/decline/start/complete/messages
- Prisma schema со всеми основными сущностями из ТЗ
- Seed-данные для клиента, мастеров, категорий, заявки, офферов, чата, отзыва и истории ремонта

`/product` использует серверное in-memory хранилище для быстрого MVP: данные
живут между действиями в локальном dev-сервере, но сбрасываются при рестарте.
Следующий production-шаг — заменить `src/lib/mvp-store.ts` на Prisma/PostgreSQL.

## Запуск

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Для реальной PostgreSQL-базы:

```bash
npm run db:push
npm run db:seed
```

Production build:

```bash
npm run build
```

`next build` запускается с `--webpack`, потому что Turbopack в текущей версии
Next падает на кириллическом пути рабочей папки.

## Demo аккаунты

- Клиент: `client@homefix.local` / `demo1234`
- Мастер: `master@homefix.local` / `demo1234`
- Админ: `admin@homefix.local` / `demo1234`

## Следующие шаги

1. Подключить реальные Prisma queries вместо mock-ответов в API.
2. Добавить session/cookie auth.
3. Реализовать загрузку фото в локальное или S3-compatible хранилище.
4. Добавить realtime-чат и уведомления.
5. Расширить модерацию, жалобы и проверку документов мастеров.
