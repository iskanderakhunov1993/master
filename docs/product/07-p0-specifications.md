# P0 specifications: прозрачный и управляемый заказ

Версия: 1.0
Дата: 30 июля 2026 года
Статус: approved for implementation planning

## 1. Общие продуктовые правила

- Клиент платит только последнюю явно принятую итоговую сумму.
- Комиссия платформы составляет 5% принятой суммы и удерживается из выплаты мастеру. Клиент видит согласованную стоимость без скрытой надбавки.
- Гарантию на работу предоставляет мастер, а платформа фиксирует условия и помогает открыть обращение, но не выплачивает гарантийную компенсацию из собственных средств.
- Для работ MVP до 15 000 ₽ гарантия по умолчанию составляет 30 дней. Для будущих крупных работ — 60 дней.
- Точный адрес, переписка, координаты и платёжные сведения доступны только минимально необходимым участникам.
- Каждое существенное действие содержит actor, timestamp и correlation id и не редактируется задним числом.
- Платежи и live-location нельзя включать внешним пользователям до прохождения указанных ниже release gates.

## 2. Change order: согласование новой стоимости

### Goal и user story

Как клиент, я хочу принять или отклонить изменение итоговой цены до продолжения работы, чтобы стоимость не стала неожиданностью.

### Flow

1. После назначения мастер выбирает «Изменить стоимость».
2. Указывает новую **итоговую**, а не добавочную сумму и текстовую причину: например, «нужен демонтаж — 500 ₽».
3. Заказ сохраняет текущую цену и получает ожидающий запрос.
4. Клиент видит старую сумму, новую сумму, разницу и причину.
5. При принятии новая сумма становится согласованной; при отказе продолжает действовать старая.
6. До ответа мастер не может завершить работу. Клиент может отменить заказ по действующей политике.

### Data contract

`OrderChangeRequest`:

- `id`, `orderId`, `requestedByMasterId`;
- `previousPriceRubles`, `proposedTotalPriceRubles`, `reason`;
- `status`: `PENDING | ACCEPTED | REJECTED | CANCELLED | EXPIRED`;
- `createdAt`, `respondedAt`, `respondedByClientId`;
- `version` для optimistic concurrency.

На один заказ допускается только один `PENDING` request. Принятые и отклонённые записи неизменяемы.

### Server rules и ошибки

- Создавать запрос может только назначенный мастер в `MASTER_ARRIVED` или `IN_PROGRESS`.
- Новая сумма: 500–1 000 000 ₽ и должна отличаться от текущей.
- Причина: 10–500 символов.
- Отвечать может только владелец заказа.
- Повторный или устаревший ответ возвращает `CHANGE_REQUEST_STALE` без изменения цены.
- При dispute или cancellation pending-запрос автоматически закрывается.

### UI states

- Мастер: форма, pending-banner, accepted/rejected timeline event.
- Клиент: blocking-card с суммами, причиной и кнопками «Принять»/«Отклонить».
- Оба участника: системное событие в заказе и чате.

### Acceptance criteria

- Мастер не может изменить `agreedPriceRubles` напрямую.
- Только `ACCEPTED` обновляет цену заказа и будущую сумму платежа.
- История показывает обе суммы, причину и участников решения.
- Два параллельных ответа не создают двойного изменения.
- Unauthorized и invalid-state сценарии покрыты тестами.

## 3. Order evidence: фото до, процесс и после

### Goal и user story

Как клиент, я хочу видеть доказательства исходного состояния и результата, чтобы прозрачно принять работу или открыть спор.

### Flow

1. После «Я на месте» мастер загружает минимум одно фото `BEFORE`.
2. Только после этого доступно «Начать работу».
3. Во время работы можно добавлять `PROCESS`: детали, материалы и промежуточный результат.
4. Перед «Работа выполнена» мастер загружает минимум одно фото `AFTER`.
5. Клиент получает timeline evidence вместе с приёмкой.

### Data contract

`OrderEvidence`:

- `id`, `orderId`, `mediaId`, `uploadedByUserId`;
- `stage`: `BEFORE | PROCESS | AFTER`;
- `caption`, `createdAt`;
- неизменяемые `mimeType`, `byteSize`, `sha256` в media record.

Ограничения: 1–8 фото на этап, JPG/PNG/WebP, до 8 МБ, подпись до 300 символов.

### Server rules и безопасность

- Загружать evidence может назначенный мастер; клиент может добавлять evidence только в dispute.
- `BEFORE` доступно после прибытия, `PROCESS` — после начала, `AFTER` — во время выполнения.
- `IN_PROGRESS` требует `BEFORE`; `COMPLETED_BY_MASTER` требует `AFTER`.
- Проверяются MIME, binary signature, размер и ownership; EXIF GPS удаляется при обработке.
- После завершения evidence нельзя удалять обычным пользовательским действием.

### UI и ошибки

- Step gate объясняет, какого фото не хватает.
- Upload имеет progress, retry и понятное сообщение о неподдерживаемом файле.
- При частичной ошибке уже сохранённые изображения не теряются.

### Acceptance criteria

- Нельзя начать без `BEFORE` и завершить без `AFTER`.
- Все участники видят одинаковый evidence timeline.
- Администратор видит evidence в dispute без доступа к посторонним заказам.

## 4. Мини-чат заказа

### Goal и user story

Как участник заказа, я хочу хранить уточнения, цену и доказательства внутри платформы, чтобы не терять договорённости во внешних мессенджерах.

### Flow

1. После предложения создаётся приватный thread клиента и конкретного мастера.
2. До выбора запрещены телефон, email, ссылки и точный адрес; интерфейс показывает район.
3. После назначения thread выбранного мастера становится основным, остальные закрываются для новых сообщений.
4. Цена, выбор, статусы, change order и завершение добавляются как `SYSTEM` messages.
5. Участники могут отправлять текст и фото и пожаловаться на сообщение.

### Data contract

`OrderConversation`: `id`, `orderId`, `clientId`, `masterId`, `status`, `createdAt`, `closedAt`.

`OrderMessage`:

- `id`, `conversationId`, `senderUserId`;
- `kind`: `TEXT | IMAGE | SYSTEM`;
- `body`, `mediaId`, `systemEventType`, `createdAt`;
- `moderationStatus`: `VISIBLE | FLAGGED | HIDDEN`.

Пагинация cursor-based, порядок по `(createdAt, id)`. Idempotency key предотвращает дубликат при retry.

### Server rules и безопасность

- Читать и писать могут только участники thread; администратор получает доступ только по dispute/жалобе с audit log.
- 1–2 000 символов; не более 5 изображений в сообщении.
- До назначения действует маскирование контактов и адресов; найденное значение отклоняется с объяснением.
- System messages создаёт только сервер.
- Retention определяется юридической политикой и не может быть короче активного гарантийного срока и спора.

### UI и ошибки

- Inbox не нужен в первой версии: чат открывается только из заказа.
- Показываются sending/sent/failed, unread count и retry.
- Offline не блокирует ввод; сообщение отправляется после восстановления соединения только с тем же idempotency key.

### Acceptance criteria

- Кнопка «Написать» открывает реальный thread, а не пустой control.
- Чужой пользователь получает 404/forbidden без раскрытия существования thread.
- Системные изменения цены совпадают с order history.

## 5. Warranty: гарантия мастера

### Goal и user story

Как клиент, я хочу видеть срок и условия гарантии конкретного мастера в паспорте дома и открыть связанное обращение при повторной проблеме.

### Flow

1. Мастер указывает гарантийный срок в предложении; default для MVP — 30 дней.
2. Клиент видит условие до выбора.
3. После подтверждения результата гарантия активируется от `completedAt`.
4. Паспорт дома показывает активные и истёкшие гарантии.
5. Клиент открывает гарантийное обращение из записи; оно связано с исходным заказом и мастером.

### Data contract

`Warranty`:

- `id`, `orderId`, `masterId`, `clientId`;
- `durationDays`, `terms`, `startsAt`, `endsAt`;
- `status`: `PENDING | ACTIVE | CLAIMED | EXPIRED | VOID`;
- `createdAt`.

`WarrantyClaim`: `id`, `warrantyId`, `description`, `status`, `createdAt`, `resolvedAt` и evidence клиента.

### Server rules и UI

- После выбора срок меняется только через подтверждённый change request без изменения уже начавшегося срока.
- Отмена/возврат до завершения делает гарантию `VOID`.
- Платформа явно сообщает: обязательство несёт мастер; платформа не выплачивает компенсацию.
- В паспорте нельзя показывать выдуманный счётчик: данные строятся только по реальным `Warranty` records.

### Acceptance criteria

- По одному завершённому заказу создаётся не более одной гарантии.
- Claim можно открыть только до `endsAt` и только владельцу заказа.
- Администратор видит исходный заказ, условия, evidence и историю claim.

## 6. Product analytics и dashboard пилота

### Goal

Измерять ликвидность и подтверждённое выполнение без отправки адресов, сообщений, документов и координат в аналитику.

### Data contract

`AnalyticsEvent`:

- `id`, `name`, `occurredAt`, `anonymousId`, `userId`, `orderId`;
- `role`, `categoryId`, `serviceAreaId`, `orderType`;
- `sessionId`, `correlationId`, `schemaVersion`, `properties`.

Обязательные события:

`order_started`, `order_published`, `match_created`, `offer_created`, `first_offer_received`, `candidate_list_viewed`, `master_selected`, `master_confirmed`, `master_on_the_way`, `master_arrived`, `change_order_requested`, `change_order_accepted`, `completion_claimed`, `completion_confirmed`, `dispute_opened`, `review_submitted`, `repeat_order_started`.

### Rules, dashboard и качество

- Event пишется сервером для подтверждённых доменных действий; UI-view events допускаются с клиента.
- Idempotency key: `event name + aggregate id + aggregate version`.
- Запрещённые properties: полный адрес, телефон, email, документ, текст описания/чата, media URL, координаты.
- Dashboard: funnel, time-to-first-offer, completion, cancellation, no-show, dispute, change-order rate, price delta, evidence completion, 30/90-day repeat и второй цикл подписки.
- Все метрики фильтруются по периоду, категории, зоне и типу заказа; малые когорты не экспортируются публично.

### Acceptance criteria

- Повторная обработка действия не удваивает доменное событие.
- Funnel можно воспроизвести для тестового заказа по correlation id.
- Автоматический privacy-test отклоняет запрещённые поля.

## 7. Реальная геолокация мастера

### Release gate

Функция включается только после consent UX, threat model, выбранного картографического провайдера и проверки обработки персональных данных в РФ. До gate используется подпись «Демо маршрута», а не «Живая геолокация».

### Flow и data contract

- Мастер явно включает передачу после нажатия «Еду».
- `LocationSession`: `id`, `orderId`, `masterId`, `status`, `consentedAt`, `startedAt`, `stoppedAt`.
- `LocationPoint`: `sessionId`, `latitude`, `longitude`, `accuracyMeters`, `capturedAt`, `sequence`.
- Клиент получает последнее положение и рассчитанный ETA; отсутствие свежей точки более 60 секунд показывает «Связь с геолокацией потеряна».
- На `MASTER_ARRIVED`, cancellation или logout session останавливается сервером.

### Security и acceptance criteria

- Координаты доступны только участникам активного назначения.
- История точек не отображается после визита и удаляется по короткой retention policy; order history хранит только факт sharing и ETA events.
- Нельзя начать session для чужого или неактивного заказа.
- При запрете разрешения lifecycle заказа продолжает работать без карты.

## 8. Платёж, резервирование и комиссия 5%

### Release gate

До включения обязательны выбранный российский PSP, юридическая схема для физлиц/самозанятых/ИП, онлайн-чеки, webhook verification, reconciliation и support runbook. Платформа не хранит карточные данные.

### Flow

1. При подтверждении мастера клиент резервирует согласованную сумму у PSP.
2. Принятый change order увеличивает или пересоздаёт резерв только после подтверждения клиента.
3. После клиентского подтверждения результата PSP переводит мастеру 95%, платформа получает 5%.
4. Dispute удерживает доступную сумму до решения.
5. Отмена и решение спора создают полный или частичный возврат по политике.

### Data contract

`PaymentIntent`: `id`, `orderId`, `provider`, `providerReference`, `amountRubles`, `status`, `version`, timestamps.

Statuses: `CREATED | REQUIRES_ACTION | RESERVED | CAPTURED | PARTIALLY_REFUNDED | REFUNDED | DISPUTED | FAILED | CANCELLED`.

`PaymentLedgerEntry`: `id`, `paymentIntentId`, `type`, `amountRubles`, `currency`, `providerEventId`, `createdAt`.

Ledger types: `RESERVE`, `CAPTURE`, `MASTER_PAYOUT`, `PLATFORM_FEE`, `REFUND`, `REVERSAL`.

### Server rules и acceptance criteria

- PSP webhook является источником истины платежного статуса; каждый provider event обрабатывается идемпотентно.
- Сумма ledger всегда сходится с reserved/captured/refunded totals.
- Платёж нельзя выплатить до клиентского подтверждения или операционного решения.
- Клиент до подтверждения видит сумму, комиссию платформы и правила возврата; мастер видит ожидаемую выплату 95%.

## 9. PostgreSQL cutover

### Goal и стратегия

Сделать PostgreSQL единственным runtime storage. Постоянный dual-write запрещён. Для пилота используется короткое maintenance window и offline migration.

### План

1. Инвентаризировать все таблицы, ограничения, индексы и legacy statuses активного SQLite слоя.
2. Довести Prisma schema до полного покрытия и убрать несовместимые дубли статусов.
3. Создать повторяемый exporter SQLite → validated intermediate format → PostgreSQL importer.
4. На rehearsal-копии сравнить counts, foreign keys, денежные totals, status history и media hashes.
5. Остановить writes, сделать backup, выполнить финальный export/import, запустить smoke, переключить `DATABASE_URL`.
6. При нарушении acceptance criteria вернуть старый runtime и backup; не пытаться чинить данные в production вручную.
7. После стабильного периода удалить `better-sqlite3` и переходные инструкции отдельным commit.

### Acceptance criteria

- Все 24+ domain tests проходят на PostgreSQL.
- Counts и ключевые агрегаты совпадают; orphan records отсутствуют.
- Один и тот же набор repository contracts используется приложением и тестами.
- Backup restore и rollback проверены до cutover.
- README меняется на «PostgreSQL active» только после успешного cutover.

## 10. Порядок поставки

1. `codex/feat-order-transparency`: change order → evidence → mini-chat.
2. `codex/feat-home-trust`: warranty → analytics dashboard.
3. Отдельные gated epics: payments → live location → PostgreSQL cutover.

Каждый этап выпускается вертикальным срезом: schema, server rules, UI, audit/history, domain tests и role-based smoke test.
