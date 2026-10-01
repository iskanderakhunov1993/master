import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-change-order-test.db";
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
  const strangerId = randomUUID();

  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
  insertUser.run(strangerId, "Посторонний мастер", `${strangerId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(masterId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(strangerId, now);
  const insertMasterProfile = database.prepare(
    `INSERT INTO master_profiles (master_id, verification_status, is_online, onboarding_completed, onboarding_step, created_at, updated_at)
    VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?)`,
  );
  insertMasterProfile.run(masterId, now, now);
  insertMasterProfile.run(strangerId, now, now);

  const orderId = randomUUID();
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city,
      address_street, address_house, schedule_kind, order_type,
      base_price_minor, total_price_minor, agreed_price_minor, selected_master_id,
      current_step, created_at, updated_at, submitted_at
    ) VALUES (?, ?, 'MASTER_ARRIVED', 'Течёт смеситель', 'plumbing', 'Москва',
      'Тестовая', '1', 'NOW', 'NORMAL', 250000, 250000, 250000, ?, 8, ?, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now, now);

  return { database, now, clientId, masterId, strangerId, orderId };
}

test("work cannot start or finish without proof photos", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { addOrderWorkMedia } = await import("../src/lib/orders/work-media");
  const { now, masterId, orderId } = await setup();

  assert.throws(
    () => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "IN_PROGRESS", now }),
    /BEFORE_PHOTO_REQUIRED/,
  );

  addOrderWorkMedia({
    masterId,
    orderId,
    stage: "BEFORE",
    fileName: "before.jpg",
    mimeType: "image/jpeg",
    byteSize: 4,
    content: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "IN_PROGRESS", now: now + 1000 });

  assert.throws(
    () => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER", now: now + 2000 }),
    /AFTER_PHOTO_REQUIRED/,
  );

  addOrderWorkMedia({
    masterId,
    orderId,
    stage: "AFTER",
    fileName: "after.jpg",
    mimeType: "image/jpeg",
    byteSize: 4,
    content: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER", now: now + 3000 });
});

test("evidence photos are visible only to the order's own client and master", async () => {
  const { addOrderWorkMedia, getOrderWorkMediaForViewer } = await import("../src/lib/orders/work-media");
  const { clientId, masterId, strangerId, orderId } = await setup();

  const photo = addOrderWorkMedia({
    masterId,
    orderId,
    stage: "BEFORE",
    fileName: "before.jpg",
    mimeType: "image/jpeg",
    byteSize: 4,
    content: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  });

  assert.notEqual(getOrderWorkMediaForViewer(clientId, photo.id), undefined);
  assert.notEqual(getOrderWorkMediaForViewer(masterId, photo.id), undefined);
  assert.equal(getOrderWorkMediaForViewer(strangerId, photo.id), undefined);
});

test("a stranger master cannot upload evidence, and a photo cannot be added outside its stage's status", async () => {
  const { addOrderWorkMedia } = await import("../src/lib/orders/work-media");
  const { strangerId, masterId, orderId } = await setup();

  assert.throws(
    () => addOrderWorkMedia({
      masterId: strangerId,
      orderId,
      stage: "BEFORE",
      fileName: "before.jpg",
      mimeType: "image/jpeg",
      byteSize: 4,
      content: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    }),
    /ORDER_ACCESS_DENIED/,
  );

  // Order is at MASTER_ARRIVED; an "after" photo makes no sense yet.
  assert.throws(
    () => addOrderWorkMedia({
      masterId,
      orderId,
      stage: "AFTER",
      fileName: "after.jpg",
      mimeType: "image/jpeg",
      byteSize: 4,
      content: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    }),
    /WORK_MEDIA_WRONG_STAGE/,
  );
});

test("change order: price stays put until the client explicitly accepts", async () => {
  const { createChangeRequest, respondToChangeRequest, listOrderChangeRequests } = await import("../src/lib/orders/change-requests");
  const { clientId, masterId, strangerId, orderId, database } = await setup();

  // Only the assigned master may propose, and only one pending request at a time.
  assert.throws(
    () => createChangeRequest({ masterId: strangerId, orderId, proposedPriceRubles: 3000, reason: "Нужен демонтаж плитки" }),
    /ORDER_ACCESS_DENIED/,
  );

  const request = createChangeRequest({ masterId, orderId, proposedPriceRubles: 3000, reason: "Нужен демонтаж плитки" });
  assert.equal(request.previousPriceRubles, 2500);
  assert.equal(request.proposedPriceRubles, 3000);
  assert.equal(request.status, "PENDING");

  assert.throws(
    () => createChangeRequest({ masterId, orderId, proposedPriceRubles: 3200, reason: "Ещё одна причина текста" }),
    /CHANGE_REQUEST_ALREADY_PENDING/,
  );

  // The client rejects: the old price still applies.
  const rejected = respondToChangeRequest({ clientId, orderId, requestId: request.id, accept: false });
  assert.equal(rejected.status, "REJECTED");
  const priceAfterReject = (database.prepare("SELECT agreed_price_minor AS price FROM orders WHERE id = ?").get(orderId) as { price: number }).price;
  assert.equal(priceAfterReject, 250000);

  // Responding twice to the same (now-resolved) request is rejected, not silently repeated.
  assert.throws(
    () => respondToChangeRequest({ clientId, orderId, requestId: request.id, accept: true }),
    /CHANGE_REQUEST_STALE/,
  );

  // Master can ask again; this time the client accepts and the price actually moves.
  const secondRequest = createChangeRequest({ masterId, orderId, proposedPriceRubles: 3200, reason: "Уточнённая смета работ" });
  const accepted = respondToChangeRequest({ clientId, orderId, requestId: secondRequest.id, accept: true });
  assert.equal(accepted.status, "ACCEPTED");
  const priceAfterAccept = (database.prepare("SELECT agreed_price_minor AS price FROM orders WHERE id = ?").get(orderId) as { price: number }).price;
  assert.equal(priceAfterAccept, 320000);

  assert.equal(listOrderChangeRequests(orderId).length, 2);
});

test("a pending price change blocks marking work complete", async () => {
  const { createChangeRequest } = await import("../src/lib/orders/change-requests");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { addOrderWorkMedia } = await import("../src/lib/orders/work-media");
  const { masterId, orderId, now } = await setup();

  addOrderWorkMedia({ masterId, orderId, stage: "BEFORE", fileName: "b.jpg", mimeType: "image/jpeg", byteSize: 4, content: Buffer.from([0xff, 0xd8, 0xff, 0x00]) });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "IN_PROGRESS", now: now + 1000 });
  addOrderWorkMedia({ masterId, orderId, stage: "AFTER", fileName: "a.jpg", mimeType: "image/jpeg", byteSize: 4, content: Buffer.from([0xff, 0xd8, 0xff, 0x00]) });

  createChangeRequest({ masterId, orderId, proposedPriceRubles: 4000, reason: "Обнаружена скрытая проводка" });
  assert.throws(
    () => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER", now: now + 2000 }),
    /CHANGE_REQUEST_PENDING/,
  );
});

test("cancelling before work starts retires any pending price change with it", async () => {
  const { createChangeRequest } = await import("../src/lib/orders/change-requests");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { masterId, orderId, now, database } = await setup();

  createChangeRequest({ masterId, orderId, proposedPriceRubles: 4000, reason: "Обнаружена скрытая проводка" });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "CANCELLED_BY_MASTER", now: now + 1000 });

  const pendingAfterCancel = database
    .prepare("SELECT COUNT(*) AS count FROM order_change_requests WHERE order_id = ? AND status = 'PENDING'")
    .get(orderId) as { count: number };
  assert.equal(pendingAfterCancel.count, 0);
});
