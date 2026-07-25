import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const testDatabaseFilename = "master-ryadom-selection-test.db";
process.env.DATABASE_FILENAME = testDatabaseFilename;
process.env.MASTER_OFFER_TTL_MINUTES = "5";

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${testDatabaseFilename}${suffix}`), { force: true });
}

test("client sees at most three ranked candidates and safely selects one master", async () => {
  const { getDb } = await import("../src/lib/db");
  const { matchOrder } = await import("../src/lib/marketplace/matching");
  const { createMasterOffer } = await import("../src/lib/marketplace/offers");
  const { listRankedCandidates, scoreCandidate } = await import("../src/lib/marketplace/ranking");
  const {
    confirmMasterSelection,
    getSelectedMasterForClient,
    getSelectedOrderForMaster,
    selectMasterOffer,
  } = await import("../src/lib/marketplace/selection");

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

  function createMaster(index: number) {
    const masterId = createUser("MASTER", `Мастер ${index}`);
    const completedJobs = 20 + index * 20;
    database
      .prepare(
        `INSERT INTO master_profiles (
          master_id, verification_status, is_online, onboarding_completed,
          onboarding_step, completed_jobs, rating_x100, reviews_count,
          master_cancellations, no_shows, late_arrivals, confirmed_completions,
          created_at, updated_at
        ) VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
      )
      .run(
        masterId,
        completedJobs,
        440 + index * 10,
        10 + index * 15,
        Math.max(0, 5 - index),
        completedJobs,
        now,
        now,
      );
    database
      .prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)")
      .run(masterId, now);
    database
      .prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)")
      .run(masterId, now);
    database
      .prepare(
        `INSERT INTO master_category_stats (master_id, category_id, completed_jobs, updated_at)
        VALUES (?, 'plumbing', ?, ?)`,
      )
      .run(masterId, 5 + index * 10, now);
    return masterId;
  }

  const clientId = createUser("CLIENT", "Клиент выбора");
  const masterIds = [0, 1, 2, 3].map(createMaster);

  function createOrder() {
    const orderId = randomUUID();
    database
      .prepare(
        `INSERT INTO orders (
          id, client_id, status, description, category_id, subcategory_id,
          address_city, address_street, address_house, address_apartment,
          address_comment, schedule_kind, order_type, base_price_minor,
          urgency_multiplier_bps, total_price_minor, current_step,
          created_at, updated_at, submitted_at
        ) VALUES (?, ?, 'SEARCHING_MASTERS', 'Нужно устранить протечку',
          'plumbing', 'plumbing-leak', 'Москва', 'Секретная улица', '15', '88',
          'Домофон 4242', 'NOW', 'NORMAL', 300000, 10000, 300000, 8, ?, ?, ?)`,
      )
      .run(orderId, clientId, now, now, now);
    database
      .prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')")
      .run(orderId);
    return orderId;
  }

  const orderId = createOrder();
  matchOrder(orderId, now);
  const offerIds = masterIds.map((masterId, index) => createMasterOffer({
    orderId,
    masterId,
    proposedPriceRubles: 4200 - index * 200,
    etaMinutes: 60 - index * 10,
    acceptClientPrice: false,
    now,
  }).id);

  const candidates = listRankedCandidates(clientId, orderId, now);
  assert.equal(candidates.length, 3);
  assert.ok(candidates[0]!.rankingScore >= candidates[1]!.rankingScore);
  assert.ok(candidates[1]!.rankingScore >= candidates[2]!.rankingScore);
  assert.equal("paid" in candidates[0]!, false);
  assert.ok(candidates.every((candidate) => candidate.similarJobs > 0));

  const directScore = scoreCandidate({
    reliabilityScore: 98,
    rating: 4.9,
    similarJobs: 37,
    distanceKm: 2,
    etaMinutes: 35,
    proposedPriceRubles: 4000,
    lowestPriceRubles: 3800,
  });
  assert.ok(directScore > 80 && directScore <= 100);

  const chosen = candidates[0]!;
  const selected = selectMasterOffer({ clientId, orderId, offerId: chosen.offerId, now });
  assert.equal(selected.masterId, chosen.masterId);
  assert.equal(selected.agreedPriceRubles, chosen.proposedPriceRubles);

  const storedOrder = database
    .prepare(
      `SELECT status, selected_master_id AS selectedMasterId,
        selected_offer_id AS selectedOfferId, agreed_price_minor AS agreedPriceMinor
      FROM orders WHERE id = ?`,
    )
    .get(orderId) as {
      status: string;
      selectedMasterId: string;
      selectedOfferId: string;
      agreedPriceMinor: number;
    };
  assert.deepEqual(storedOrder, {
    status: "MASTER_SELECTED",
    selectedMasterId: chosen.masterId,
    selectedOfferId: chosen.offerId,
    agreedPriceMinor: chosen.proposedPriceRubles * 100,
  });
  assert.equal(
    (database.prepare("SELECT status FROM master_offers WHERE id = ?").get(chosen.offerId) as { status: string }).status,
    "ACCEPTED",
  );
  for (const offerId of offerIds.filter((id) => id !== chosen.offerId)) {
    assert.equal(
      (database.prepare("SELECT status FROM master_offers WHERE id = ?").get(offerId) as { status: string }).status,
      "REJECTED",
    );
  }

  const selectedForClient = getSelectedMasterForClient(clientId, orderId);
  assert.equal(selectedForClient?.name, chosen.name);
  assert.throws(
    () => selectMasterOffer({ clientId, orderId, offerId: offerIds.find((id) => id !== chosen.offerId)!, now }),
    /MASTER_ALREADY_SELECTED/,
  );

  const exactOrder = getSelectedOrderForMaster(chosen.masterId, orderId);
  assert.equal(exactOrder?.street, "Секретная улица");
  assert.equal(exactOrder?.apartment, "88");
  assert.equal(exactOrder?.addressComment, "Домофон 4242");
  const otherMasterId = masterIds.find((id) => id !== chosen.masterId)!;
  assert.equal(getSelectedOrderForMaster(otherMasterId, orderId), null);

  confirmMasterSelection(chosen.masterId, orderId, now + 1_000);
  assert.equal(
    (database.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string }).status,
    "MASTER_CONFIRMED",
  );
  assert.throws(
    () => confirmMasterSelection(chosen.masterId, orderId, now + 2_000),
    /SELECTION_ALREADY_CONFIRMED/,
  );
});

test("expired offers and cancelled orders cannot be selected", async () => {
  const { getDb } = await import("../src/lib/db");
  const { matchOrder } = await import("../src/lib/marketplace/matching");
  const { createMasterOffer } = await import("../src/lib/marketplace/offers");
  const { selectMasterOffer } = await import("../src/lib/marketplace/selection");
  const database = getDb();
  const now = Date.now();

  function makeFixture() {
    const clientId = randomUUID();
    const masterId = randomUUID();
    const orderId = randomUUID();
    const insertUser = database.prepare(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'test', ?, ?)`,
    );
    insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
    insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
    database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
    database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(masterId, now);
    database
      .prepare(
        `INSERT INTO master_profiles (
          master_id, verification_status, is_online, onboarding_completed,
          onboarding_step, created_at, updated_at
        ) VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?)`,
      )
      .run(masterId, now, now);
    database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)").run(masterId, now);
    database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)").run(masterId, now);
    database
      .prepare(
        `INSERT INTO orders (
          id, client_id, status, description, category_id, address_city,
          address_street, address_house, schedule_kind, order_type,
          base_price_minor, total_price_minor, current_step, created_at, updated_at, submitted_at
        ) VALUES (?, ?, 'SEARCHING_MASTERS', 'Протечка', 'plumbing', 'Москва',
          'Тайная', '1', 'NOW', 'NORMAL', 300000, 300000, 8, ?, ?, ?)`,
      )
      .run(orderId, clientId, now, now, now);
    database.prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')").run(orderId);
    matchOrder(orderId, now);
    const offer = createMasterOffer({ orderId, masterId, etaMinutes: 35, acceptClientPrice: true, now });
    return { clientId, orderId, offerId: offer.id };
  }

  const expired = makeFixture();
  assert.throws(
    () => selectMasterOffer({ ...expired, now: now + 6 * 60_000 }),
    /ORDER_NOT_SELECTABLE|OFFER_NOT_AVAILABLE/,
  );

  const cancelled = makeFixture();
  database.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(cancelled.orderId);
  assert.throws(
    () => selectMasterOffer({ ...cancelled, now }),
    /ORDER_NOT_SELECTABLE/,
  );
});

test("an offer from a master who went Offline is no longer shown or selectable", async () => {
  const { getDb } = await import("../src/lib/db");
  const { matchOrder } = await import("../src/lib/marketplace/matching");
  const { createMasterOffer } = await import("../src/lib/marketplace/offers");
  const { listRankedCandidates } = await import("../src/lib/marketplace/ranking");
  const { selectMasterOffer } = await import("../src/lib/marketplace/selection");
  const database = getDb();
  const now = Date.now();
  const clientId = randomUUID();
  const masterId = randomUUID();
  const orderId = randomUUID();
  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(clientId, "Клиент Offline", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер Offline", `${masterId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(masterId, now);
  database
    .prepare(
      `INSERT INTO master_profiles (
        master_id, verification_status, is_online, onboarding_completed,
        onboarding_step, created_at, updated_at
      ) VALUES (?, 'VERIFIED', 1, 1, 6, ?, ?)`,
    )
    .run(masterId, now, now);
  database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)").run(masterId, now);
  database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)").run(masterId, now);
  database
    .prepare(
      `INSERT INTO orders (
        id, client_id, status, description, category_id, address_city,
        address_street, address_house, schedule_kind, order_type,
        base_price_minor, total_price_minor, current_step, created_at, updated_at, submitted_at
      ) VALUES (?, ?, 'SEARCHING_MASTERS', 'Протечка трубы', 'plumbing', 'Москва',
        'Тайная', '1', 'NOW', 'NORMAL', 300000, 300000, 8, ?, ?, ?)`,
    )
    .run(orderId, clientId, now, now, now);
  database.prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')").run(orderId);
  matchOrder(orderId, now);
  const offer = createMasterOffer({ orderId, masterId, etaMinutes: 35, acceptClientPrice: true, now });

  database.prepare("UPDATE master_profiles SET is_online = 0 WHERE master_id = ?").run(masterId);
  assert.equal(listRankedCandidates(clientId, orderId, now + 1).length, 0);
  assert.throws(
    () => selectMasterOffer({ clientId, orderId, offerId: offer.id, now: now + 1 }),
    /OFFER_NOT_AVAILABLE/,
  );
});
