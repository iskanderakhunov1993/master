import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-transparency-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

test("change order, evidence gates and chat preserve the agreed order record", async () => {
  const { getDb } = await import("../src/lib/db");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const {
    addOrderEvidence,
    addOrderMessage,
    createOrderChangeRequest,
    getOrderTransparency,
    respondToOrderChangeRequest,
  } = await import("../src/lib/orders/transparency");
  const database = getDb();
  const now = Date.now();
  const clientId = randomUUID();
  const masterId = randomUUID();
  const strangerId = randomUUID();
  const orderId = randomUUID();
  const insertUser = database.prepare(
    "INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, 'test', ?, ?)",
  );
  insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
  insertUser.run(strangerId, "Чужой мастер", `${strangerId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  for (const id of [masterId, strangerId]) {
    database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(id, now);
    database.prepare("INSERT INTO master_profiles (master_id, onboarding_step, onboarding_completed, created_at, updated_at) VALUES (?, 6, 1, ?, ?)").run(id, now, now);
  }
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city, address_street, address_house,
      schedule_kind, order_type, base_price_minor, total_price_minor, agreed_price_minor,
      selected_master_id, current_step, created_at, updated_at
    ) VALUES (?, ?, 'MASTER_ARRIVED', 'Починить протечку', 'plumbing', 'Москва', 'Тестовая', '1',
      'NOW', 'NORMAL', 300000, 300000, 300000, ?, 8, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now);
  database.prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)").run(orderId, masterId, now);

  assert.throws(() => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "IN_PROGRESS" }), /EVIDENCE_BEFORE_REQUIRED/);
  addOrderEvidence({ orderId, masterId, stage: "BEFORE", fileName: "before.png", mimeType: "image/png", byteSize: 8, content: Buffer.alloc(8) });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "IN_PROGRESS" });

  const requestId = createOrderChangeRequest({ orderId, masterId, proposedPriceRubles: 4_000, reason: "После осмотра требуется демонтаж старой детали" });
  assert.throws(() => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER" }), /CHANGE_ORDER_PENDING_COMPLETION/);
  respondToOrderChangeRequest({ requestId, clientId, accept: true });
  assert.equal((database.prepare("SELECT agreed_price_minor AS price FROM orders WHERE id = ?").get(orderId) as { price: number }).price, 400000);
  assert.throws(() => respondToOrderChangeRequest({ requestId, clientId, accept: false }), /CHANGE_ORDER_ALREADY_RESPONDED/);
  assert.throws(() => transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER" }), /EVIDENCE_AFTER_REQUIRED/);
  addOrderEvidence({ orderId, masterId, stage: "AFTER", fileName: "after.png", mimeType: "image/png", byteSize: 8, content: Buffer.alloc(8) });
  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "COMPLETED_BY_MASTER" });

  addOrderMessage({ orderId, actorId: clientId, actorRole: "CLIENT", body: "Спасибо, принимаю после проверки." });
  assert.throws(() => addOrderMessage({ orderId, actorId: strangerId, actorRole: "MASTER", body: "Не мой заказ" }), /ORDER_ACCESS_DENIED/);
  const transparency = getOrderTransparency(orderId);
  assert.equal(transparency.changeRequests[0]?.status, "ACCEPTED");
  assert.deepEqual(transparency.evidence.map((item) => item.stage), ["BEFORE", "AFTER"]);
  assert.equal(transparency.messages.some((message) => message.body.includes("Спасибо")), true);
  assert.ok((database.prepare("SELECT COUNT(*) AS count FROM analytics_events WHERE order_id = ?").get(orderId) as { count: number }).count >= 5);
});
