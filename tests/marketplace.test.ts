import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const testDatabaseFilename = "master-ryadom-marketplace-test.db";
process.env.DATABASE_FILENAME = testDatabaseFilename;
process.env.MASTER_OFFER_TTL_MINUTES = "5";

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${testDatabaseFilename}${suffix}`), { force: true });
}

test("marketplace matching, privacy and offer rules", async (context) => {
  const { getDb } = await import("../src/lib/db");
  const {
    findEligibleMasterIds,
    listMatchedOrdersForMaster,
    matchOrder,
  } = await import("../src/lib/marketplace/matching");
  const { createMasterOffer, expireOffers, listMasterOffers } = await import("../src/lib/marketplace/offers");
  const { getOrderMediaForMaster } = await import("../src/lib/orders/repository");

  const database = getDb();
  const now = Date.now();

  function createUser(role: "CLIENT" | "MASTER", name: string) {
    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, 'test', ?, ?)`,
      )
      .run(id, name, `${id}@example.test`, now, now);
    database
      .prepare(
        `INSERT INTO user_roles (user_id, role, is_primary, created_at)
        VALUES (?, ?, 1, ?)`,
      )
      .run(id, role, now);
    return id;
  }

  function createMaster(input: {
    category?: string;
    area?: string;
    online?: boolean;
    verified?: boolean;
  } = {}) {
    const id = createUser("MASTER", "Тестовый мастер");
    database
      .prepare(
        `INSERT INTO master_profiles (
          master_id, verification_status, is_online, onboarding_completed,
          onboarding_step, created_at, updated_at
        ) VALUES (?, ?, ?, 1, 6, ?, ?)`,
      )
      .run(id, input.verified === false ? "PENDING" : "VERIFIED", input.online === false ? 0 : 1, now, now);
    database
      .prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, ?, ?)")
      .run(id, input.category ?? "plumbing", now);
    database
      .prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, ?, ?)")
      .run(id, input.area ?? "moscow-cao", now);
    return id;
  }

  function createOrder(input: {
    category?: string;
    area?: string;
    status?: "SEARCHING_MASTERS" | "CANCELLED";
    withPhoto?: boolean;
  } = {}) {
    const clientId = createUser("CLIENT", "Секретный клиент");
    const orderId = randomUUID();
    database
      .prepare(
        `INSERT INTO orders (
          id, client_id, status, description, category_id,
          address_city, address_street, address_house, address_apartment,
          address_comment, schedule_kind, order_type, base_price_minor,
          urgency_multiplier_bps, total_price_minor, current_step,
          created_at, updated_at, submitted_at
        ) VALUES (?, ?, ?, 'Течёт труба под кухонной раковиной', ?,
          'Москва', 'Совершенно секретная улица', '77', '404', 'Код домофона 9999',
          'NOW', 'NORMAL', 300000, 10000, 300000, 8, ?, ?, ?)`,
      )
      .run(orderId, clientId, input.status ?? "SEARCHING_MASTERS", input.category ?? "plumbing", now, now, now);
    database
      .prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, ?)")
      .run(orderId, input.area ?? "moscow-cao");
    let mediaId = "";
    if (input.withPhoto) {
      mediaId = randomUUID();
      database
        .prepare(
          `INSERT INTO order_media (
            id, order_id, client_id, file_name, mime_type, byte_size, content, created_at
          ) VALUES (?, ?, ?, 'problem.png', 'image/png', 4, ?, ?)`,
        )
        .run(mediaId, orderId, clientId, Buffer.from([137, 80, 78, 71]), now);
    }
    return { clientId, orderId, mediaId };
  }

  await context.test("category matching", () => {
    const masterId = createMaster({ category: "plumbing" });
    const { orderId } = createOrder({ category: "electrical" });
    assert.equal(findEligibleMasterIds(orderId).includes(masterId), false);
  });

  await context.test("service area matching", () => {
    const masterId = createMaster({ area: "moscow-sao" });
    const { orderId } = createOrder({ area: "moscow-cao" });
    assert.equal(findEligibleMasterIds(orderId).includes(masterId), false);
  });

  await context.test("Offline master", () => {
    const masterId = createMaster({ online: false });
    const { orderId } = createOrder();
    assert.equal(findEligibleMasterIds(orderId).includes(masterId), false);
  });

  await context.test("unverified master", () => {
    const masterId = createMaster({ verified: false });
    const { orderId } = createOrder();
    assert.equal(findEligibleMasterIds(orderId).includes(masterId), false);
  });

  await context.test("address privacy", () => {
    const masterId = createMaster();
    const strangerId = createMaster({ area: "moscow-sao" });
    const { orderId, mediaId } = createOrder({ withPhoto: true });
    matchOrder(orderId, now);
    const order = listMatchedOrdersForMaster(masterId, now).find((candidate) => candidate.orderId === orderId);
    assert.ok(order);
    const projection = JSON.stringify(order);
    assert.equal(projection.includes("Совершенно секретная улица"), false);
    assert.equal("apartment" in order, false);
    assert.equal("addressComment" in order, false);
    assert.equal(projection.includes("Секретный клиент"), false);
    assert.equal(projection.includes("Код домофона"), false);
    assert.equal(order.serviceAreaName, "Центральный округ");
    assert.ok(getOrderMediaForMaster(masterId, mediaId, now));
    assert.equal(getOrderMediaForMaster(strangerId, mediaId, now), undefined);
  });

  await context.test("duplicate offer", () => {
    const masterId = createMaster();
    const { orderId } = createOrder();
    matchOrder(orderId, now);
    const input = {
      masterId,
      orderId,
      etaMinutes: 35,
      acceptClientPrice: true,
      now,
    };
    const offer = createMasterOffer(input);
    assert.equal(offer.proposedPriceRubles, 3000);
    assert.throws(() => createMasterOffer(input), /DUPLICATE_OFFER/);
    const status = database.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string };
    assert.equal(status.status, "OFFERS_RECEIVED");
  });

  await context.test("expired offer", () => {
    const masterId = createMaster();
    const { orderId } = createOrder();
    matchOrder(orderId, now);
    createMasterOffer({
      masterId,
      orderId,
      proposedPriceRubles: 4000,
      etaMinutes: 35,
      comment: "Приеду со своей деталью",
      acceptClientPrice: false,
      now,
    });
    const afterExpiry = now + 6 * 60_000;
    assert.ok(expireOffers(afterExpiry) >= 1);
    assert.equal(listMasterOffers(masterId, afterExpiry)[0]?.status, "EXPIRED");
    const order = database.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string };
    assert.equal(order.status, "SEARCHING_MASTERS");
    const replacement = createMasterOffer({
      masterId,
      orderId,
      etaMinutes: 45,
      acceptClientPrice: true,
      now: afterExpiry,
    });
    assert.equal(replacement.status, "ACTIVE");
  });

  await context.test("cancelled and incompatible active orders reject offers", () => {
    const masterId = createMaster();
    const cancelled = createOrder({ status: "CANCELLED" });
    assert.throws(() => matchOrder(cancelled.orderId, now), /ORDER_NOT_OPEN/);

    const assigned = createOrder();
    database.prepare("UPDATE orders SET status = 'ASSIGNED' WHERE id = ?").run(assigned.orderId);
    database
      .prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)")
      .run(assigned.orderId, masterId, now);
    const open = createOrder();
    assert.equal(findEligibleMasterIds(open.orderId).includes(masterId), false);
  });
});
