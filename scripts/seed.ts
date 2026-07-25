import { hashSync } from "bcryptjs";

import { DEMO_USERS, type DemoUser } from "../src/lib/auth/demo-users";
import { getDb } from "../src/lib/db";

const database = getDb();
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const password = "Demo123!";

const additionalDemoUsers: DemoUser[] = [
  { name: "Михаил Смирнов", email: "electrician@master-ryadom.ru", password, role: "MASTER" },
  { name: "Сергей Иванов", email: "handyman@master-ryadom.ru", password, role: "MASTER" },
];
const seedUsers = [...DEMO_USERS, ...additionalDemoUsers];

const seedUser = database.transaction((demoUser: DemoUser) => {
  const existing = database
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(demoUser.email) as { id: string } | undefined;
  const id = existing?.id ?? crypto.randomUUID();
  const passwordHash = hashSync(demoUser.password, 12);

  database
    .prepare(
      `INSERT INTO users (
        id, name, email, password_hash, is_blocked, blocked_at,
        blocked_by, block_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        password_hash = excluded.password_hash,
        is_blocked = 0,
        blocked_at = NULL,
        blocked_by = NULL,
        block_reason = NULL,
        updated_at = excluded.updated_at`,
    )
    .run(id, demoUser.name, demoUser.email, passwordHash, now, now);
  const user = database.prepare("SELECT id FROM users WHERE email = ?").get(demoUser.email) as { id: string };
  database.prepare("UPDATE user_roles SET is_primary = 0 WHERE user_id = ?").run(user.id);
  database
    .prepare(
      `INSERT INTO user_roles (user_id, role, is_primary, created_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(user_id, role) DO UPDATE SET is_primary = 1`,
    )
    .run(user.id, demoUser.role, now);
});

for (const user of seedUsers) seedUser(user);

function userId(email: string) {
  return (database.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string }).id;
}

const clientId = userId("client@master-ryadom.ru");
const alexanderId = userId("master@master-ryadom.ru");
const mikhailId = userId("electrician@master-ryadom.ru");
const sergeyId = userId("handyman@master-ryadom.ru");

type DemoMaster = {
  id: string;
  phone: string;
  experienceYears: number;
  bio: string;
  completedJobs: number;
  ratingX100: number;
  reviewsCount: number;
  cancellations: number;
  noShows: number;
  lateArrivals: number;
  confirmedCompletions: number;
  categories: Array<[string, number]>;
  areas: string[];
};

const masters: DemoMaster[] = [
  {
    id: alexanderId,
    phone: "+7 999 123-45-67",
    experienceYears: 12,
    bio: "Сантехник. Устраняю протечки, меняю смесители и подключаю бытовую технику. Согласовываю стоимость до начала работ.",
    completedJobs: 214,
    ratingX100: 490,
    reviewsCount: 126,
    cancellations: 4,
    noShows: 0,
    lateArrivals: 5,
    confirmedCompletions: 204,
    categories: [["plumbing", 37], ["installation", 48], ["small-repair", 29]],
    areas: ["moscow-cao", "moscow-sao", "moscow-svao", "moscow-zao"],
  },
  {
    id: mikhailId,
    phone: "+7 999 234-56-78",
    experienceYears: 9,
    bio: "Электрик. Диагностирую проводку, ремонтирую розетки и устанавливаю освещение. Работаю с понятной сметой.",
    completedJobs: 138,
    ratingX100: 480,
    reviewsCount: 84,
    cancellations: 5,
    noShows: 1,
    lateArrivals: 8,
    confirmedCompletions: 127,
    categories: [["electrical", 51], ["installation", 34], ["small-repair", 18]],
    areas: ["moscow-cao", "moscow-sao", "moscow-svao", "moscow-vao"],
  },
  {
    id: sergeyId,
    phone: "+7 999 345-67-89",
    experienceYears: 7,
    bio: "Мастер на час. Помогаю с мелким ремонтом, сборкой мебели, установкой и несложными электромонтажными работами.",
    completedJobs: 91,
    ratingX100: 470,
    reviewsCount: 53,
    cancellations: 6,
    noShows: 1,
    lateArrivals: 10,
    confirmedCompletions: 82,
    categories: [["small-repair", 32], ["furniture-assembly", 24], ["installation", 21], ["electrical", 14]],
    areas: ["moscow-cao", "moscow-zao", "moscow-uzao", "moscow-szao"],
  },
];

type DemoOrder = {
  id: string;
  status: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  scheduleKind: "NOW" | "TODAY" | "CUSTOM";
  scheduledAt: number | null;
  orderType: "NORMAL" | "URGENT";
  basePriceMinor: number;
  totalPriceMinor: number;
  street: string;
  house: string;
  apartment: string;
  addressComment: string;
  updatedAt: number;
  selectedMasterId?: string;
  agreedPriceMinor?: number;
};

const orders: DemoOrder[] = [
  {
    id: "demo-marketplace-order",
    status: "OFFERS_RECEIVED",
    description: "Розетка искрит при подключении зарядного устройства. Нужно проверить линию и заменить механизм.",
    categoryId: "electrical",
    subcategoryId: "electrical-outlet",
    scheduleKind: "NOW",
    scheduledAt: null,
    orderType: "URGENT",
    basePriceMinor: 250_000,
    totalPriceMinor: 500_000,
    street: "Тверская улица",
    house: "18",
    apartment: "27",
    addressComment: "Позвонить за 10 минут",
    updatedAt: now - 5 * 60 * 1000,
  },
  {
    id: "demo-active-order",
    status: "MASTER_CONFIRMED",
    description: "Течёт соединение под кухонной раковиной после включения воды.",
    categoryId: "plumbing",
    subcategoryId: "plumbing-leak",
    scheduleKind: "CUSTOM",
    scheduledAt: now - 10 * 60 * 1000,
    orderType: "NORMAL",
    basePriceMinor: 4_500_00,
    totalPriceMinor: 4_500_00,
    street: "Большая Никитская улица",
    house: "22",
    apartment: "14",
    addressComment: "Домофон 14, подъезд со двора",
    updatedAt: now - 12 * 60 * 1000,
    selectedMasterId: alexanderId,
    agreedPriceMinor: 4_500_00,
  },
  {
    id: "demo-completed-plumbing",
    status: "REVIEWED",
    description: "Заменить старый смеситель в ванной и проверить соединения.",
    categoryId: "plumbing",
    subcategoryId: "plumbing-faucet",
    scheduleKind: "CUSTOM",
    scheduledAt: now - 10 * day,
    orderType: "NORMAL",
    basePriceMinor: 4_200_00,
    totalPriceMinor: 4_200_00,
    street: "улица Арбат",
    house: "31",
    apartment: "42",
    addressComment: "",
    updatedAt: now - 10 * day,
    selectedMasterId: alexanderId,
    agreedPriceMinor: 4_200_00,
  },
  {
    id: "demo-completed-electrical",
    status: "REVIEWED",
    description: "Установить два потолочных светильника и проверить выключатель.",
    categoryId: "electrical",
    subcategoryId: "electrical-lighting",
    scheduleKind: "CUSTOM",
    scheduledAt: now - 25 * day,
    orderType: "NORMAL",
    basePriceMinor: 5_200_00,
    totalPriceMinor: 5_200_00,
    street: "Петровка",
    house: "17",
    apartment: "8",
    addressComment: "",
    updatedAt: now - 25 * day,
    selectedMasterId: mikhailId,
    agreedPriceMinor: 5_200_00,
  },
  {
    id: "demo-cancelled-order",
    status: "CANCELLED_BY_CLIENT",
    description: "Собрать прикроватную тумбу.",
    categoryId: "furniture-assembly",
    subcategoryId: "furniture-cabinet",
    scheduleKind: "CUSTOM",
    scheduledAt: now - 4 * day,
    orderType: "NORMAL",
    basePriceMinor: 2_000_00,
    totalPriceMinor: 2_000_00,
    street: "Садовая-Кудринская улица",
    house: "9",
    apartment: "16",
    addressComment: "",
    updatedAt: now - 5 * day,
  },
];

database.transaction(() => {
  database
    .prepare(
      `INSERT INTO client_addresses (
        id, client_id, city, street, house, apartment, comment,
        is_primary, created_at, updated_at
      ) VALUES ('demo-client-address', ?, 'Москва', 'Тверская улица', '18', '27',
        'Позвонить за 10 минут', 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        client_id = excluded.client_id,
        city = excluded.city,
        street = excluded.street,
        house = excluded.house,
        apartment = excluded.apartment,
        comment = excluded.comment,
        is_primary = 1,
        updated_at = excluded.updated_at`,
    )
    .run(clientId, now, now);

  for (const master of masters) {
    database
      .prepare(
        `INSERT INTO master_profiles (
          master_id, phone, experience_years, bio, verification_status,
          is_online, is_blocked, onboarding_step, onboarding_completed,
          completed_jobs, rating_x100, reviews_count, master_cancellations,
          no_shows, late_arrivals, confirmed_completions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'VERIFIED', 1, 0, 6, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(master_id) DO UPDATE SET
          phone = excluded.phone,
          experience_years = excluded.experience_years,
          bio = excluded.bio,
          verification_status = 'VERIFIED',
          verification_rejection_reason = NULL,
          is_online = 1,
          is_blocked = 0,
          onboarding_step = 6,
          onboarding_completed = 1,
          completed_jobs = excluded.completed_jobs,
          rating_x100 = excluded.rating_x100,
          reviews_count = excluded.reviews_count,
          master_cancellations = excluded.master_cancellations,
          no_shows = excluded.no_shows,
          late_arrivals = excluded.late_arrivals,
          confirmed_completions = excluded.confirmed_completions,
          updated_at = excluded.updated_at`,
      )
      .run(
        master.id, master.phone, master.experienceYears, master.bio,
        master.completedJobs, master.ratingX100, master.reviewsCount,
        master.cancellations, master.noShows, master.lateArrivals,
        master.confirmedCompletions, now, now,
      );
    database.prepare("DELETE FROM master_categories WHERE master_id = ?").run(master.id);
    database.prepare("DELETE FROM master_service_areas WHERE master_id = ?").run(master.id);
    database.prepare("DELETE FROM master_category_stats WHERE master_id = ?").run(master.id);
    for (const [categoryId, completedJobs] of master.categories) {
      database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, ?, ?)").run(master.id, categoryId, now);
      database
        .prepare("INSERT INTO master_category_stats (master_id, category_id, completed_jobs, updated_at) VALUES (?, ?, ?, ?)")
        .run(master.id, categoryId, completedJobs, now);
    }
    for (const areaId of master.areas) {
      database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, ?, ?)").run(master.id, areaId, now);
    }
  }

  for (const order of orders) database.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
  const insertOrder = database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, subcategory_id,
      address_id, address_city, address_street, address_house, address_apartment,
      address_comment, schedule_kind, scheduled_at, order_type, base_price_minor,
      urgency_multiplier_bps, total_price_minor, current_step, created_at,
      updated_at, submitted_at, selected_master_id, agreed_price_minor,
      master_selected_at, master_confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'demo-client-address', 'Москва', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 8, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const order of orders) {
    const submittedAt = order.updatedAt - 20 * 60 * 1000;
    insertOrder.run(
      order.id, clientId, order.status, order.description, order.categoryId,
      order.subcategoryId, order.street, order.house, order.apartment,
      order.addressComment || null, order.scheduleKind, order.scheduledAt,
      order.orderType, order.basePriceMinor, order.orderType === "URGENT" ? 20_000 : 10_000,
      order.totalPriceMinor, submittedAt, order.updatedAt, submittedAt,
      order.selectedMasterId ?? null, order.agreedPriceMinor ?? null,
      order.selectedMasterId ? submittedAt + 5 * 60 * 1000 : null,
      order.status === "MASTER_CONFIRMED" ? submittedAt + 8 * 60 * 1000 : null,
    );
    database
      .prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')")
      .run(order.id);
  }

  database.prepare("DELETE FROM subscription_orders WHERE subscription_id = 'demo-service-subscription'").run();
  database
    .prepare(
      `INSERT INTO service_subscriptions (
        id, client_id, category_id, subcategory_id, address_id, service_area_id,
        description, address_city, address_street, address_house,
        address_apartment, address_comment, frequency, next_service_at,
        base_price_minor, status, created_at, updated_at
      ) VALUES (
        'demo-service-subscription', ?, 'plumbing', 'plumbing-leak',
        'demo-client-address', 'moscow-cao', ?, 'Москва', ?, ?, ?, ?,
        'MONTHLY', ?, 450000, 'ACTIVE', ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        client_id = excluded.client_id,
        category_id = excluded.category_id,
        subcategory_id = excluded.subcategory_id,
        address_id = excluded.address_id,
        service_area_id = excluded.service_area_id,
        description = excluded.description,
        address_city = excluded.address_city,
        address_street = excluded.address_street,
        address_house = excluded.address_house,
        address_apartment = excluded.address_apartment,
        address_comment = excluded.address_comment,
        frequency = excluded.frequency,
        next_service_at = excluded.next_service_at,
        base_price_minor = excluded.base_price_minor,
        status = 'ACTIVE',
        paused_at = NULL,
        cancelled_at = NULL,
        updated_at = excluded.updated_at`,
    )
    .run(
      clientId,
      "Проверять соединения под кухонной мойкой и устранять небольшие протечки.",
      "Большая Никитская улица",
      "22",
      "14",
      "Домофон 14, подъезд со двора",
      orders.find((order) => order.id === "demo-active-order")!.scheduledAt,
      now - 30 * day,
      now,
    );
  database
    .prepare(
      `INSERT INTO subscription_orders (subscription_id, order_id, cycle_number, created_at)
      VALUES ('demo-service-subscription', 'demo-active-order', 1, ?)`,
    )
    .run(now - 30 * day);

  const matchExpiresAt = now + 7 * day;
  const insertMatch = database.prepare(
    `INSERT INTO order_matches (
      id, order_id, master_id, status, approx_distance_km_x10,
      created_at, expires_at, updated_at
    ) VALUES (?, 'demo-marketplace-order', ?, 'OFFERED', ?, ?, ?, ?)`,
  );
  insertMatch.run("demo-match-mikhail", mikhailId, 24, now - 8 * 60 * 1000, matchExpiresAt, now - 5 * 60 * 1000);
  insertMatch.run("demo-match-sergey", sergeyId, 41, now - 8 * 60 * 1000, matchExpiresAt, now - 5 * 60 * 1000);

  const insertOffer = database.prepare(
    `INSERT INTO master_offers (
      id, order_id, master_id, proposed_price_minor, eta_minutes,
      comment, status, created_at, expires_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertOffer.run("demo-offer-mikhail", "demo-marketplace-order", mikhailId, 500_000, 25, "Могу приехать в течение получаса.", "ACTIVE", now - 7 * 60 * 1000, matchExpiresAt, now - 7 * 60 * 1000);
  insertOffer.run("demo-offer-sergey", "demo-marketplace-order", sergeyId, 550_000, 40, "Возьму нужный механизм с собой.", "ACTIVE", now - 6 * 60 * 1000, matchExpiresAt, now - 6 * 60 * 1000);

  const assignedOrders = [
    ["demo-active-order", alexanderId, "demo-offer-active", 450_000, 35],
    ["demo-completed-plumbing", alexanderId, "demo-offer-completed-plumbing", 420_000, 30],
    ["demo-completed-electrical", mikhailId, "demo-offer-completed-electrical", 520_000, 45],
  ] as const;
  for (const [orderId, masterId, offerId, price, eta] of assignedOrders) {
    const order = orders.find((candidate) => candidate.id === orderId)!;
    insertOffer.run(offerId, orderId, masterId, price, eta, null, "ACCEPTED", order.updatedAt - 30 * 60 * 1000, order.updatedAt + day, order.updatedAt);
    database.prepare("UPDATE orders SET selected_offer_id = ? WHERE id = ?").run(offerId, orderId);
    database.prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)").run(orderId, masterId, order.updatedAt - 20 * 60 * 1000);
  }

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const insertPhoto = database.prepare(
    `INSERT INTO order_media (
      id, order_id, client_id, file_name, mime_type, byte_size, content, created_at
    ) VALUES (?, ?, ?, ?, 'image/png', ?, ?, ?)`,
  );
  insertPhoto.run("demo-photo-search", "demo-marketplace-order", clientId, "rozetka.png", png.byteLength, png, now - 15 * 60 * 1000);
  insertPhoto.run("demo-photo-active", "demo-active-order", clientId, "protechka.png", png.byteLength, png, now - 40 * 60 * 1000);
  insertPhoto.run("demo-photo-completed", "demo-completed-plumbing", clientId, "smesitel.png", png.byteLength, png, now - 11 * day);

  const historySequences: Record<string, string[]> = {
    "demo-marketplace-order": ["SEARCHING_MASTERS", "OFFERS_RECEIVED"],
    "demo-active-order": ["SEARCHING_MASTERS", "OFFERS_RECEIVED", "MASTER_SELECTED", "MASTER_CONFIRMED"],
    "demo-completed-plumbing": ["SEARCHING_MASTERS", "OFFERS_RECEIVED", "MASTER_SELECTED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY", "MASTER_ARRIVED", "IN_PROGRESS", "COMPLETED_BY_MASTER", "COMPLETED", "REVIEWED"],
    "demo-completed-electrical": ["SEARCHING_MASTERS", "OFFERS_RECEIVED", "MASTER_SELECTED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY", "MASTER_ARRIVED", "IN_PROGRESS", "COMPLETED_BY_MASTER", "COMPLETED", "REVIEWED"],
    "demo-cancelled-order": ["SEARCHING_MASTERS", "CANCELLED_BY_CLIENT"],
  };
  const insertHistory = database.prepare(
    `INSERT INTO order_status_history (
      id, order_id, from_status, to_status, actor_user_id, actor_role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const order of orders) {
    const sequence = historySequences[order.id];
    const start = order.updatedAt - sequence.length * 60 * 1000;
    sequence.forEach((status, index) => {
      const previous = index === 0 ? "DRAFT" : sequence[index - 1];
      const masterAction = [
        "OFFERS_RECEIVED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY",
        "MASTER_ARRIVED", "IN_PROGRESS", "COMPLETED_BY_MASTER",
      ].includes(status);
      insertHistory.run(
        `demo-history-${order.id}-${index}`,
        order.id,
        previous,
        status,
        masterAction ? order.selectedMasterId ?? mikhailId : clientId,
        masterAction ? "MASTER" : "CLIENT",
        start + index * 60 * 1000,
      );
    });
  }

  const demoMasterIds = masters.map((master) => master.id);
  const masterPlaceholders = demoMasterIds.map(() => "?").join(", ");
  database.prepare(`DELETE FROM master_reviews WHERE id LIKE 'demo-%' AND master_id IN (${masterPlaceholders})`).run(...demoMasterIds);
  database.prepare(`DELETE FROM master_work_history WHERE id LIKE 'demo-%' AND master_id IN (${masterPlaceholders})`).run(...demoMasterIds);

  const reviewRows = [
    ["demo-review-alexander-1", alexanderId, "Мария", 5, "Быстро нашёл протечку, всё объяснил и аккуратно устранил проблему.", 5, 5, 5, 5, now - 8 * day],
    ["demo-review-alexander-2", alexanderId, "Игорь", 5, "Приехал вовремя, заранее подтвердил цену. Рекомендую.", 5, 5, 5, 5, now - 21 * day],
    ["demo-review-mikhail-1", mikhailId, "Елена", 5, "Проверил проводку и заменил розетку без лишних работ.", 5, 5, 5, 5, now - 12 * day],
    ["demo-review-mikhail-2", mikhailId, "Павел", 4, "Работа выполнена хорошо, стоимость совпала с договорённостью.", 5, 4, 5, 5, now - 29 * day],
    ["demo-review-sergey-1", sergeyId, "Ольга", 5, "Аккуратно собрал шкаф и убрал упаковку после работы.", 5, 4, 5, 5, now - 6 * day],
    ["demo-review-sergey-2", sergeyId, "Денис", 4, "Всё сделано по договорённости, общаться было удобно.", 4, 4, 5, 5, now - 17 * day],
  ] as const;
  const insertMasterReview = database.prepare(
    `INSERT INTO master_reviews (
      id, master_id, client_name, rating, body, quality_rating,
      punctuality_rating, communication_rating, agreement_rating,
      created_at, is_published
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  for (const review of reviewRows) insertMasterReview.run(...review);

  const workRows = [
    ["demo-work-alexander-1", alexanderId, "Устранение протечки", "Заменены сифон и повреждённое уплотнение под кухонной мойкой.", now - 8 * day],
    ["demo-work-alexander-2", alexanderId, "Установка смесителя", "Установлен смеситель и проверены соединения под давлением.", now - 18 * day],
    ["demo-work-mikhail-1", mikhailId, "Замена розеток", "Установлены четыре розетки и проверена линия под нагрузкой.", now - 12 * day],
    ["demo-work-mikhail-2", mikhailId, "Монтаж освещения", "Подключены потолочные светильники и новый выключатель.", now - 25 * day],
    ["demo-work-sergey-1", sergeyId, "Сборка шкафа", "Собран и закреплён к стене платяной шкаф.", now - 6 * day],
    ["demo-work-sergey-2", sergeyId, "Установка полки", "Полка выровнена и закреплена на бетонной стене.", now - 20 * day],
  ] as const;
  const insertWork = database.prepare(
    "INSERT INTO master_work_history (id, master_id, title, description, completed_at) VALUES (?, ?, ?, ?, ?)",
  );
  for (const work of workRows) insertWork.run(...work);

  const insertOrderReview = database.prepare(
    `INSERT INTO order_reviews (
      id, order_id, reviewer_id, reviewee_id, reviewer_role,
      overall_rating, quality_rating, punctuality_rating,
      communication_rating, agreement_rating, comment, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertOrderReview.run("demo-order-review-client-plumbing", "demo-completed-plumbing", clientId, alexanderId, "CLIENT", 5, 5, 5, 5, 5, "Всё аккуратно и по согласованной цене.", now - 10 * day);
  insertOrderReview.run("demo-order-review-master-plumbing", "demo-completed-plumbing", alexanderId, clientId, "MASTER", 5, null, null, null, null, "Быстро согласовали детали заказа.", now - 10 * day + 60_000);
  insertOrderReview.run("demo-order-review-client-electrical", "demo-completed-electrical", clientId, mikhailId, "CLIENT", 5, 5, 5, 5, 5, "Светильники установлены аккуратно.", now - 25 * day);

  const tasks = [
    ["demo-task-shelf", "Повесить полку", "Закрепить полку в гостиной на бетонной стене.", "installation", "MEDIUM", now + 2 * day, "PLANNED", null],
    ["demo-task-outlet", "Починить розетку", "Розетка искрит при подключении зарядки.", "electrical", "HIGH", null, "TODO", "demo-marketplace-order"],
    ["demo-task-cabinet", "Собрать шкаф", "Шкаф доставят в пятницу, инструкция и крепёж в комплекте.", "furniture-assembly", "MEDIUM", now + 5 * day, "PLANNED", null],
    ["demo-task-faucet", "Заменить смеситель", "Смеситель установлен и проверен мастером.", "plumbing", "LOW", now - 10 * day, "DONE", "demo-completed-plumbing"],
  ] as const;
  const upsertTask = database.prepare(
    `INSERT INTO client_tasks (
      id, client_id, title, description, category_id, priority,
      desired_date, status, linked_order_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      client_id = excluded.client_id,
      title = excluded.title,
      description = excluded.description,
      category_id = excluded.category_id,
      priority = excluded.priority,
      desired_date = excluded.desired_date,
      status = excluded.status,
      linked_order_id = excluded.linked_order_id,
      updated_at = excluded.updated_at`,
  );
  for (const task of tasks) upsertTask.run(task[0], clientId, task[1], task[2], task[3], task[4], task[5], task[6], task[7], now - 30 * day, now);
})();// transaction

console.log(`Seed completed: ${seedUsers.length} demo users, ${orders.length} orders and 4 tasks are ready.`);
