import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-admin-dispute-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

async function setup() {
  const { getDb } = await import("../src/lib/db");
  const database = getDb();
  const now = Date.now();
  const adminId = randomUUID();
  const clientId = randomUUID();
  const masterId = randomUUID();

  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(adminId, "Админ", `${adminId}@example.test`, now, now);
  insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'ADMIN', 1, ?)").run(adminId, now);
  database.prepare(
    `INSERT INTO master_profiles (master_id, verification_status, is_online, onboarding_completed, onboarding_step, created_at, updated_at)
    VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?)`,
  ).run(masterId, now, now);

  const orderId = randomUUID();
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city,
      address_street, address_house, schedule_kind, order_type,
      base_price_minor, total_price_minor, agreed_price_minor, selected_master_id,
      current_step, created_at, updated_at, submitted_at
    ) VALUES (?, ?, 'DISPUTED', 'Плохо закреплена полка', 'plumbing', 'Москва',
      'Тестовая', '1', 'NOW', 'NORMAL', 250000, 250000, 250000, ?, 8, ?, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now, now);

  const complaintId = randomUUID();
  database.prepare(
    `INSERT INTO complaints (
      id, order_id, reporter_id, against_user_id, kind, status, subject, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'DISPUTE', 'OPEN', 'Проблема с выполнением заказа', 'Полка упала на следующий день', ?, ?)`,
  ).run(complaintId, orderId, clientId, masterId, now, now);

  return { adminId, clientId, masterId, orderId, complaintId };
}

test("an admin can claim a case, then resolve it with a recorded decision", async () => {
  const { getAdminComplaintCase, resolveComplaint } = await import("../src/lib/admin/repository");
  const { adminId, complaintId } = await setup();

  resolveComplaint({ adminId, complaintId, status: "IN_REVIEW" });
  let current = getAdminComplaintCase(complaintId);
  assert.equal(current?.status, "IN_REVIEW");
  assert.equal(current?.resolvedAt, null);

  resolveComplaint({ adminId, complaintId, status: "RESOLVED", resolution: "Мастер переделает крепление за свой счёт." });
  current = getAdminComplaintCase(complaintId);
  assert.equal(current?.status, "RESOLVED");
  assert.equal(current?.resolution, "Мастер переделает крепление за свой счёт.");
  assert.notEqual(current?.resolvedAt, null);
  assert.equal(current?.resolvedByName, "Админ");
});

test("a resolved case cannot be resolved again", async () => {
  const { resolveComplaint } = await import("../src/lib/admin/repository");
  const { adminId, complaintId } = await setup();

  resolveComplaint({ adminId, complaintId, status: "REJECTED", resolution: "Гарантия не покрывает такой случай." });
  assert.throws(
    () => resolveComplaint({ adminId, complaintId, status: "RESOLVED", resolution: "Повторная попытка" }),
    /COMPLAINT_NOT_ACTIONABLE/,
  );
});

test("the case view carries the full order context an admin needs to decide", async () => {
  const { getAdminComplaintCase } = await import("../src/lib/admin/repository");
  const { complaintId } = await setup();

  const complaintCase = getAdminComplaintCase(complaintId);
  assert.equal(complaintCase?.order.client.name, "Клиент");
  assert.equal(complaintCase?.order.master?.name, "Мастер");
  assert.equal(complaintCase?.order.description, "Плохо закреплена полка");
  assert.equal(complaintCase?.reporterName, "Клиент");
  assert.equal(complaintCase?.againstName, "Мастер");
});
