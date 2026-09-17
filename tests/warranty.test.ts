import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-warranty-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

async function setup() {
  const { getDb } = await import("../src/lib/db");
  const database = getDb();
  const now = Date.now();
  const clientId = randomUUID();
  const masterId = randomUUID();

  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
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
    ) VALUES (?, ?, 'COMPLETED_BY_MASTER', 'Течёт смеситель', 'plumbing', 'Москва',
      'Тестовая', '1', 'NOW', 'NORMAL', 250000, 250000, 250000, ?, 8, ?, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now, now);

  return { clientId, masterId, orderId, now };
}

test("completing an order starts a warranty with the configured duration", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { getWarrantyForOrder } = await import("../src/lib/orders/warranty");
  const { clientId, masterId, orderId, now } = await setup();

  transitionOrder({ orderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED", now: now + 1000 });

  // Read as of the exact moment the warranty started, so the day count is deterministic.
  const warranty = getWarrantyForOrder(orderId, now + 1000);
  assert.notEqual(warranty, null);
  assert.equal(warranty?.durationDays, 30);
  assert.equal(warranty?.isActive, true);
  assert.equal(warranty?.daysRemaining, 30);
  void masterId;
});

test("a client can file exactly one claim per warranty, and only while it is active", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { fileWarrantyClaim, getWarrantyForOrder } = await import("../src/lib/orders/warranty");
  const { clientId, orderId, now } = await setup();

  transitionOrder({ orderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED", now: now + 1000 });
  const warranty = getWarrantyForOrder(orderId)!;

  const complaintId = fileWarrantyClaim({ clientId, warrantyId: warranty.id, description: "Смеситель снова протекает через неделю" });
  assert.ok(complaintId);

  assert.throws(
    () => fileWarrantyClaim({ clientId, warrantyId: warranty.id, description: "Ещё раз, для проверки" }),
    /WARRANTY_ALREADY_CLAIMED/,
  );

  const afterClaim = getWarrantyForOrder(orderId);
  assert.equal(afterClaim?.claimComplaintId, complaintId);

  const database = (await import("../src/lib/db")).getDb();
  const complaint = database.prepare("SELECT kind, subject, reporter_id AS reporterId, against_user_id AS againstId FROM complaints WHERE id = ?").get(complaintId) as {
    kind: string; subject: string; reporterId: string; againstId: string;
  };
  assert.equal(complaint.kind, "DISPUTE");
  assert.equal(complaint.reporterId, clientId);
});

test("a stranger cannot file a claim against someone else's warranty", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { fileWarrantyClaim, getWarrantyForOrder } = await import("../src/lib/orders/warranty");
  const { clientId, orderId, now } = await setup();

  transitionOrder({ orderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED", now: now + 1000 });
  const warranty = getWarrantyForOrder(orderId)!;

  assert.throws(
    () => fileWarrantyClaim({ clientId: randomUUID(), warrantyId: warranty.id, description: "Пытаюсь открыть чужую гарантию" }),
    /ORDER_ACCESS_DENIED/,
  );
});
