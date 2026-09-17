import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-order-chat-test.db";
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
  insertUser.run(strangerId, "Посторонний", `${strangerId}@example.test`, now, now);
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
    ) VALUES (?, ?, 'MASTER_CONFIRMED', 'Течёт смеситель', 'plumbing', 'Москва',
      'Тестовая', '1', 'NOW', 'NORMAL', 250000, 250000, 250000, ?, 8, ?, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now, now);

  const draftOrderId = randomUUID();
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city,
      address_street, address_house, schedule_kind, order_type,
      base_price_minor, total_price_minor, current_step, created_at, updated_at
    ) VALUES (?, ?, 'DRAFT', 'Пока без мастера', 'plumbing', 'Москва',
      'Тестовая', '2', 'NOW', 'NORMAL', 250000, 250000, 8, ?, ?)`,
  ).run(draftOrderId, clientId, now, now);

  return { clientId, masterId, strangerId, orderId, draftOrderId };
}

test("client and master can exchange messages, in the order they were sent", async () => {
  const { listOrderMessages, sendOrderMessage } = await import("../src/lib/orders/chat");
  const { clientId, masterId, orderId } = await setup();

  sendOrderMessage({ orderId, senderId: clientId, body: "Во сколько будете?" });
  sendOrderMessage({ orderId, senderId: masterId, body: "Около 18:00, подъезжаю" });

  const messages = listOrderMessages(orderId);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].senderRole, "CLIENT");
  assert.equal(messages[0].body, "Во сколько будете?");
  assert.equal(messages[1].senderRole, "MASTER");
  assert.equal(messages[1].senderName, "Мастер");
});

test("a user with no connection to the order cannot send a message into it", async () => {
  const { sendOrderMessage } = await import("../src/lib/orders/chat");
  const { strangerId, orderId } = await setup();

  assert.throws(
    () => sendOrderMessage({ orderId, senderId: strangerId, body: "Пустите меня в чат" }),
    /ORDER_ACCESS_DENIED/,
  );
});

test("chat is not available before a master is assigned", async () => {
  const { canAccessOrderChat, sendOrderMessage } = await import("../src/lib/orders/chat");
  const { clientId, draftOrderId } = await setup();

  assert.equal(canAccessOrderChat(draftOrderId, clientId), false);
  assert.throws(
    () => sendOrderMessage({ orderId: draftOrderId, senderId: clientId, body: "Есть кто?" }),
    /CHAT_NOT_AVAILABLE/,
  );
});
