import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-no-show-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

async function setup(status: string, scheduledAt: number | null, scheduleKind = "CUSTOM") {
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
      address_street, address_house, schedule_kind, scheduled_at, order_type,
      base_price_minor, total_price_minor, agreed_price_minor, selected_master_id,
      current_step, created_at, updated_at, submitted_at
    ) VALUES (?, ?, ?, 'Течёт смеситель', 'plumbing', 'Москва',
      'Тестовая', '1', ?, ?, 'NORMAL', 250000, 250000, 250000, ?, 8, ?, ?, ?)`,
  ).run(orderId, clientId, status, scheduleKind, scheduledAt, masterId, now, now, now);

  return { clientId, masterId, orderId };
}

test("a no-show cannot be reported before the grace window has passed", async () => {
  const { reportMasterNoShow } = await import("../src/lib/orders/lifecycle");
  const scheduledAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
  const { clientId, orderId } = await setup("MASTER_CONFIRMED", scheduledAt);

  assert.throws(
    () => reportMasterNoShow({ orderId, clientId }),
    /NO_SHOW_TOO_EARLY/,
  );
});

test("a no-show cannot be reported for a same-day 'NOW' order (no fixed time to be overdue against)", async () => {
  const { reportMasterNoShow } = await import("../src/lib/orders/lifecycle");
  const { clientId, orderId } = await setup("MASTER_CONFIRMED", null, "NOW");

  assert.throws(
    () => reportMasterNoShow({ orderId, clientId }),
    /NO_SHOW_REQUIRES_SCHEDULE/,
  );
});

test("past the grace window, the client can report a no-show; it counts against the master, not as a self-cancellation", async () => {
  const { reportMasterNoShow } = await import("../src/lib/orders/lifecycle");
  const { getDb } = await import("../src/lib/db");
  const scheduledAt = Date.now() - 90 * 60 * 1000; // 90 minutes ago
  const { clientId, masterId, orderId } = await setup("MASTER_CONFIRMED", scheduledAt);

  const result = reportMasterNoShow({ orderId, clientId });
  assert.equal(result.toStatus, "CANCELLED_BY_MASTER");

  const profile = getDb()
    .prepare("SELECT no_shows AS noShows, master_cancellations AS masterCancellations FROM master_profiles WHERE master_id = ?")
    .get(masterId) as { noShows: number; masterCancellations: number };
  assert.equal(profile.noShows, 1);
  assert.equal(profile.masterCancellations, 0);
});

test("a self-initiated master cancellation still counts as a cancellation, not a no-show", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { getDb } = await import("../src/lib/db");
  const { masterId, orderId } = await setup("MASTER_CONFIRMED", null, "NOW");

  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "CANCELLED_BY_MASTER" });

  const profile = getDb()
    .prepare("SELECT no_shows AS noShows, master_cancellations AS masterCancellations FROM master_profiles WHERE master_id = ?")
    .get(masterId) as { noShows: number; masterCancellations: number };
  assert.equal(profile.masterCancellations, 1);
  assert.equal(profile.noShows, 0);
});

test("arriving well past the scheduled time is recorded as a late arrival", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { getDb } = await import("../src/lib/db");
  const scheduledAt = Date.now() - 40 * 60 * 1000; // 40 minutes ago
  const { masterId, orderId } = await setup("MASTER_ON_THE_WAY", scheduledAt);

  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "MASTER_ARRIVED" });

  const profile = getDb()
    .prepare("SELECT late_arrivals AS lateArrivals FROM master_profiles WHERE master_id = ?")
    .get(masterId) as { lateArrivals: number };
  assert.equal(profile.lateArrivals, 1);
});

test("arriving within the grace window is not recorded as late", async () => {
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { getDb } = await import("../src/lib/db");
  const scheduledAt = Date.now() - 5 * 60 * 1000; // 5 minutes ago, within grace
  const { masterId, orderId } = await setup("MASTER_ON_THE_WAY", scheduledAt);

  transitionOrder({ orderId, actorId: masterId, actorRole: "MASTER", toStatus: "MASTER_ARRIVED" });

  const profile = getDb()
    .prepare("SELECT late_arrivals AS lateArrivals FROM master_profiles WHERE master_id = ?")
    .get(masterId) as { lateArrivals: number };
  assert.equal(profile.lateArrivals, 0);
});
