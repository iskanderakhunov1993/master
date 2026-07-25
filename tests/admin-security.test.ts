import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const testDatabaseFilename = "master-ryadom-admin-security-test.db";
process.env.DATABASE_FILENAME = testDatabaseFilename;

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${testDatabaseFilename}${suffix}`), { force: true });
}

test("role authorization and public registration reject privilege escalation", async () => {
  const { canAccessRoleArea } = await import("../src/lib/auth/authorization");
  const { registerSchema } = await import("../src/lib/auth/validation");

  assert.equal(canAccessRoleArea("ADMIN", "ADMIN"), true);
  assert.equal(canAccessRoleArea("CLIENT", "ADMIN"), false);
  assert.equal(canAccessRoleArea("MASTER", "CLIENT"), false);
  assert.equal(registerSchema.safeParse({
    name: "Поддельный администратор",
    email: "fake-admin@example.test",
    password: "strong-password",
    role: "ADMIN",
  }).success, false);
});

test("admin mutations are protected and blocking revokes access", async () => {
  const { getDb } = await import("../src/lib/db");
  const { createSessionRecord } = await import("../src/lib/auth/repository");
  const { createAdminCategory, setUserBlocked } = await import("../src/lib/admin/repository");
  const { decideVerification } = await import("../src/lib/masters/repository");
  const { findEligibleMasterIds } = await import("../src/lib/marketplace/matching");
  const database = getDb();
  const now = Date.now();

  function user(role: "CLIENT" | "MASTER" | "ADMIN", name: string) {
    const id = randomUUID();
    database.prepare(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'test', ?, ?)`,
    ).run(id, name, `${id}@example.test`, now, now);
    database.prepare(
      "INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, ?, 1, ?)",
    ).run(id, role, now);
    return id;
  }

  const adminId = user("ADMIN", "Администратор");
  const clientId = user("CLIENT", "Клиент");
  const masterId = user("MASTER", "Мастер");
  database.prepare(
    `INSERT INTO master_profiles (
      master_id, verification_status, is_online, onboarding_completed,
      onboarding_step, created_at, updated_at
    ) VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?)`,
  ).run(masterId, now, now);
  database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)").run(masterId, now);
  database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)").run(masterId, now);

  const orderId = randomUUID();
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city,
      address_street, address_house, schedule_kind, order_type,
      base_price_minor, total_price_minor, current_step, created_at, updated_at, submitted_at
    ) VALUES (?, ?, 'SEARCHING_MASTERS', 'Проверка блокировки', 'plumbing', 'Москва',
      'Тестовая', '1', 'NOW', 'NORMAL', 300000, 300000, 8, ?, ?, ?)`,
  ).run(orderId, clientId, now, now, now);
  database.prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')").run(orderId);
  assert.equal(findEligibleMasterIds(orderId).includes(masterId), true);

  createSessionRecord({ userId: masterId, tokenHash: `token-${masterId}`, expiresAt: now + 60_000 });
  assert.throws(() => setUserBlocked({ adminId: clientId, userId: masterId, blocked: true }), /ADMIN_ACCESS_REQUIRED/);
  assert.throws(() => createAdminCategory(clientId, "Недоступная категория"), /ADMIN_ACCESS_REQUIRED/);

  assert.equal(setUserBlocked({ adminId, userId: masterId, blocked: true, reason: "Тест" }), true);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?").get(masterId) as { count: number }).count, 0);
  assert.deepEqual(
    database.prepare(
      `SELECT users.is_blocked AS userBlocked, master_profiles.is_blocked AS profileBlocked,
        master_profiles.is_online AS isOnline
      FROM users INNER JOIN master_profiles ON master_profiles.master_id = users.id WHERE users.id = ?`,
    ).get(masterId),
    { userBlocked: 1, profileBlocked: 1, isOnline: 0 },
  );
  assert.equal(findEligibleMasterIds(orderId).includes(masterId), false);
  assert.equal(setUserBlocked({ adminId, userId: masterId, blocked: false }), true);

  const mediaId = randomUUID();
  database.prepare(
    `INSERT INTO master_media (id, master_id, kind, file_name, mime_type, byte_size, content, created_at)
    VALUES (?, ?, 'IDENTITY', 'passport.png', 'image/png', 4, ?, ?)`,
  ).run(mediaId, masterId, Buffer.from([137, 80, 78, 71]), now);
  const applicationId = randomUUID();
  database.prepare(
    `INSERT INTO master_verification_applications (
      id, master_id, legal_name, document_type, document_last_four,
      document_media_id, status, submitted_at
    ) VALUES (?, ?, 'Тестовый Мастер', 'PASSPORT', '1234', ?, 'PENDING', ?)`,
  ).run(applicationId, masterId, mediaId, now);
  database.prepare("UPDATE master_profiles SET verification_status = 'PENDING' WHERE master_id = ?").run(masterId);
  assert.throws(() => decideVerification({ applicationId, adminId: clientId, decision: "VERIFIED" }), /ADMIN_ACCESS_REQUIRED/);
  decideVerification({ applicationId, adminId, decision: "VERIFIED" });
  assert.equal(
    (database.prepare("SELECT verification_status AS status FROM master_profiles WHERE master_id = ?").get(masterId) as { status: string }).status,
    "VERIFIED",
  );
});

test("ownership, lifecycle, complaints and reviews are enforced server-side", async () => {
  const { getDb } = await import("../src/lib/db");
  const { createClientAddress, deleteClientAddress, updateClientAddress } = await import("../src/lib/addresses/repository");
  const { createClientTask, deleteClientTask, updateClientTask } = await import("../src/lib/tasks/repository");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { submitClientReview } = await import("../src/lib/orders/reviews");
  const database = getDb();
  const now = Date.now();

  function user(role: "CLIENT" | "MASTER", name: string) {
    const id = randomUUID();
    database.prepare(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'test', ?, ?)`,
    ).run(id, name, `${id}@example.test`, now, now);
    database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, ?, 1, ?)").run(id, role, now);
    return id;
  }

  const clientId = user("CLIENT", "Владелец");
  const strangerId = user("CLIENT", "Чужой клиент");
  const masterId = user("MASTER", "Исполнитель");
  database.prepare(
    `INSERT INTO master_profiles (master_id, verification_status, onboarding_completed,
      onboarding_step, created_at, updated_at)
    VALUES (?, 'VERIFIED', 1, 6, ?, ?)`,
  ).run(masterId, now, now);

  const address = createClientAddress(clientId, { city: "Москва", street: "Секретная", house: "10", apartment: "7", comment: "" });
  assert.equal(updateClientAddress(strangerId, address.id, { city: "Москва", street: "Взлом", house: "1", apartment: "", comment: "" }), null);
  assert.equal(deleteClientAddress(strangerId, address.id), false);

  const task = createClientTask(clientId, { title: "Частная задача", description: "Только владельцу", categoryId: "plumbing", priority: "MEDIUM", desiredDate: null });
  assert.throws(() => updateClientTask(strangerId, task.id, { title: "Подмена", description: "", categoryId: "", priority: "LOW", desiredDate: null }), /TASK_NOT_FOUND/);
  assert.throws(() => deleteClientTask(strangerId, task.id), /TASK_NOT_FOUND/);

  function assignedOrder(status: "MASTER_CONFIRMED" | "COMPLETED_BY_MASTER") {
    const id = randomUUID();
    database.prepare(
      `INSERT INTO orders (
        id, client_id, status, description, category_id, address_city, address_street,
        address_house, schedule_kind, order_type, base_price_minor, total_price_minor,
        agreed_price_minor, current_step, selected_master_id, created_at, updated_at, submitted_at
      ) VALUES (?, ?, ?, 'Жизненный цикл', 'plumbing', 'Москва', 'Секретная', '10',
        'NOW', 'NORMAL', 300000, 300000, 300000, 8, ?, ?, ?, ?)`,
    ).run(id, clientId, status, masterId, now, now, now);
    database.prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)").run(id, masterId, now);
    return id;
  }

  const activeOrderId = assignedOrder("MASTER_CONFIRMED");
  assert.throws(() => transitionOrder({ orderId: activeOrderId, actorId: strangerId, actorRole: "CLIENT", toStatus: "CANCELLED_BY_CLIENT" }), /ORDER_ACCESS_DENIED/);
  assert.throws(() => transitionOrder({ orderId: activeOrderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER" }), /ORDER_TRANSITION_NOT_ALLOWED/);

  const disputedOrderId = assignedOrder("COMPLETED_BY_MASTER");
  transitionOrder({ orderId: disputedOrderId, actorId: clientId, actorRole: "CLIENT", toStatus: "DISPUTED", reason: "Работа не завершена" });
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM complaints WHERE order_id = ?").get(disputedOrderId) as { count: number }).count, 1);

  const completedOrderId = assignedOrder("COMPLETED_BY_MASTER");
  transitionOrder({ orderId: completedOrderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED" });
  assert.throws(() => transitionOrder({ orderId: completedOrderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED" }), /ORDER_TRANSITION_NOT_ALLOWED/);
  const review = { clientId, orderId: completedOrderId, overallRating: 5, qualityRating: 5, punctualityRating: 4, communicationRating: 5, agreementRating: 5, comment: "Всё хорошо" };
  submitClientReview(review);
  assert.throws(() => submitClientReview(review), /REVIEW_ALREADY_EXISTS/);
  assert.throws(() => submitClientReview({ ...review, clientId: strangerId }), /REVIEW_ACCESS_DENIED/);
});
