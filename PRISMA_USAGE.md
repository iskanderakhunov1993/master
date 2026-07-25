# Интеграция Prisma ORM

Проект использует **Prisma ORM** для работы с PostgreSQL. Этот документ описывает использование в коде.

## Импорт

```typescript
import { prisma } from '@/lib/db';
// или с типами:
import { prisma, type User, type Order } from '@/lib/db';
```

## Примеры запросов

### Создание пользователя

```typescript
const user = await prisma.user.create({
  data: {
    id: 'user-123',
    email: 'client@example.com',
    password: hashedPassword,
    role: 'CLIENT',
    userProfile: {
      create: {
        id: 'profile-123',
        fullName: 'John Doe',
      },
    },
  },
});
```

### Получение заказа с связями

```typescript
const order = await prisma.order.findUnique({
  where: { id: 'order-123' },
  include: {
    client: true,
    offers: {
      include: {
        master: true,
      },
    },
    reviews: true,
    photos: true,
  },
});
```

### Поиск мастеров по категориям

```typescript
const masters = await prisma.masterProfile.findMany({
  where: {
    verified: true,
    qualifications: {
      some: {
        categoryId: 'plumbing',
      },
    },
  },
  include: {
    user: {
      select: {
        email: true,
        phoneNumber: true,
      },
    },
    photos: true,
  },
  orderBy: {
    rating: 'desc',
  },
  take: 10,
});
```

### Обновление статуса заказа

```typescript
await prisma.order.update({
  where: { id: 'order-123' },
  data: {
    status: 'MASTER_CONFIRMED',
    masterConfirmedAt: new Date(),
  },
});

// Добавить в историю
await prisma.orderStatusHistory.create({
  data: {
    id: 'history-123',
    orderId: 'order-123',
    status: 'MASTER_CONFIRMED',
  },
});
```

### Транзакции

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Создать предложение
  const offer = await tx.masterOffer.create({
    data: {
      id: 'offer-123',
      orderId: 'order-123',
      masterId: 'master-123',
      userId: 'master-123',
      priceMinor: 50000,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    },
  });

  // Обновить заказ
  await tx.order.update({
    where: { id: 'order-123' },
    data: { status: 'OFFERS_RECEIVED' },
  });

  return offer;
});
```

## Миграции

### Создать миграцию

После изменения `prisma/schema.prisma`:

```bash
npm run prisma:migrate -- --name feature_name
```

### Применить миграции

```bash
npm run prisma:push
```

### Просмотр БД

```bash
npm run prisma:studio
# Откроется http://localhost:5555
```

## Преобразование типов

Для совместимости с существующим кодом, используйте утилиты:

```typescript
import { dateToTimestamp, timestampToDate } from '@/lib/db';

// Date → Unix timestamp (ms)
const timestamp = dateToTimestamp(order.createdAt);

// Unix timestamp → Date
const date = timestampToDate(1234567890000);
```

## Best Practices

1. **Используйте `include` для связей**, не несколько запросов
2. **Выбирайте только нужные поля** с `select`:
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id: 'user-123' },
     select: {
       id: true,
       email: true,
       role: true,
     },
   });
   ```

3. **Используйте транзакции** для multi-step операций
4. **Добавляйте индексы** в schema для часто запрашиваемых полей:
   ```prisma
   model Order {
     id String @id
     status String
     clientId String
     @@index([clientId])
     @@index([status])
   }
   ```

5. **Используйте `.findFirst()` с `where` для поиска**:
   ```typescript
   const order = await prisma.order.findFirst({
     where: {
       clientId: 'client-123',
       status: 'DRAFT',
     },
   });
   ```

## Логирование запросов

В development режиме все SQL запросы логируются в консоль. Используйте Prisma Studio для более удобного просмотра данных.

## Миграция от SQLite

Существующий код использует `src/lib/db.ts` (SQLite через better-sqlite3). Постепенно:

1. Создавайте новые функции через Prisma
2. Рефакторьте старые функции при необходимости
3. Удалите `src/lib/db.ts` когда все будет мигрировано

## Документация

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Client Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
