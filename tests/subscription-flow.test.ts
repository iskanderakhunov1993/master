import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-subscription-flow-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

test("subscription creates a private recurring order and advances only while active", async () => {
  const { createClientAddress } = await import("../src/lib/addresses/repository");
  const { createUser } = await import("../src/lib/auth/repository");
  const { getDb } = await import("../src/lib/db");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const {
    createClientSubscription,
    getClientSubscription,
    updateClientSubscriptionStatus,
  } = await import("../src/lib/subscriptions/repository");

  const database = getDb();
  const now = Date.now();
  const client = createUser({
    name: "Клиент подписки",
    email: `${randomUUID()}@example.test`,
    passwordHash: "test",
    role: "CLIENT",
  });
  const stranger = createUser({
    name: "Другой клиент",
    email: `${randomUUID()}@example.test`,
    passwordHash: "test",
    role: "CLIENT",
  });
  const master = createUser({
    name: "Мастер подписки",
    email: `${randomUUID()}@example.test`,
    passwordHash: "test",
    role: "MASTER",
  });
  database
    .prepare(
      `INSERT INTO master_profiles (
        master_id, verification_status, is_online, onboarding_step,
        onboarding_completed, created_at, updated_at
      ) VALUES (?, 'VERIFIED', 1, 6, 1, ?, ?)`,
    )
    .run(master.id, now, now);
  database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)").run(master.id, now);
  database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)").run(master.id, now);

  const address = createClientAddress(client.id, {
    city: "Москва",
    street: "Закрытая улица",
    house: "7",
    apartment: "42",
    comment: "Код домофона 1010",
    isPrimary: true,
  });
  const firstServiceAt = now + 2 * 24 * 60 * 60 * 1000;
  const created = createClientSubscription(client.id, {
    categoryId: "plumbing",
    subcategoryId: "plumbing-faucet",
    addressId: address.id,
    serviceAreaId: "moscow-cao",
    description: "Регулярно проверять соединения и состояние смесителя.",
    frequency: "MONTHLY",
    firstServiceAt,
    priceRubles: 3_500,
  }, now);

  assert.equal(created.subscription.currentCycle, 1);
  assert.equal(created.subscription.currentOrderStatus, "SEARCHING_MASTERS");
  const firstOrder = database
    .prepare(
      `SELECT address_street AS street, address_apartment AS apartment,
        scheduled_at AS scheduledAt, total_price_minor AS totalPriceMinor
      FROM orders WHERE id = ?`,
    )
    .get(created.orderId) as { street: string; apartment: string; scheduledAt: number; totalPriceMinor: number };
  assert.equal(firstOrder.street, "Закрытая улица");
  assert.equal(firstOrder.apartment, "42");
  assert.equal(firstOrder.scheduledAt, firstServiceAt);
  assert.equal(firstOrder.totalPriceMinor, 350_000);
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM order_matches WHERE order_id = ?").get(created.orderId) as { count: number }).count,
    1,
  );

  database
    .prepare("UPDATE orders SET status = 'COMPLETED_BY_MASTER', selected_master_id = ? WHERE id = ?")
    .run(master.id, created.orderId);
  transitionOrder({
    orderId: created.orderId,
    actorId: client.id,
    actorRole: "CLIENT",
    toStatus: "COMPLETED",
    now: now + 1_000,
  });
  const secondCycle = getClientSubscription(client.id, created.subscription.id)!;
  assert.equal(secondCycle.currentCycle, 2);
  assert.equal(secondCycle.currentOrderStatus, "SEARCHING_MASTERS");
  assert.ok(secondCycle.nextServiceAt > firstServiceAt);

  updateClientSubscriptionStatus(client.id, created.subscription.id, "PAUSED", now + 2_000);
  database
    .prepare("UPDATE orders SET status = 'COMPLETED_BY_MASTER', selected_master_id = ? WHERE id = ?")
    .run(master.id, secondCycle.currentOrderId);
  transitionOrder({
    orderId: secondCycle.currentOrderId!,
    actorId: client.id,
    actorRole: "CLIENT",
    toStatus: "COMPLETED",
    now: now + 3_000,
  });
  assert.equal(getClientSubscription(client.id, created.subscription.id)?.currentCycle, 2);

  updateClientSubscriptionStatus(client.id, created.subscription.id, "ACTIVE", now + 4_000);
  assert.equal(getClientSubscription(client.id, created.subscription.id)?.currentCycle, 3);
  assert.throws(
    () => updateClientSubscriptionStatus(stranger.id, created.subscription.id, "PAUSED", now + 5_000),
    /SUBSCRIPTION_NOT_FOUND/,
  );
  assert.deepEqual(database.pragma("foreign_key_check"), []);
});

