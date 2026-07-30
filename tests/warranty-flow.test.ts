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

test("confirmed work creates a master warranty and an evidenced claim", async () => {
  const { getDb } = await import("../src/lib/db");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { listClientWarranties, openWarrantyClaim } = await import("../src/lib/warranties/repository");
  const database = getDb();
  const now = Date.now();
  const clientId = randomUUID();
  const otherClientId = randomUUID();
  const masterId = randomUUID();
  const orderId = randomUUID();
  const insertUser = database.prepare(
    "INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, 'test', ?, ?)",
  );
  insertUser.run(clientId, "Клиент", `${clientId}@example.test`, now, now);
  insertUser.run(otherClientId, "Другой клиент", `${otherClientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер", `${masterId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(otherClientId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(masterId, now);
  database.prepare("INSERT INTO master_profiles (master_id, onboarding_step, onboarding_completed, created_at, updated_at) VALUES (?, 6, 1, ?, ?)").run(masterId, now, now);
  database.prepare(
    `INSERT INTO orders (
      id, client_id, status, description, category_id, address_city, address_street, address_house,
      schedule_kind, order_type, base_price_minor, total_price_minor, agreed_price_minor,
      selected_master_id, current_step, created_at, updated_at
    ) VALUES (?, ?, 'COMPLETED_BY_MASTER', 'Замена смесителя', 'plumbing', 'Москва', 'Тестовая', '1',
      'NOW', 'NORMAL', 1200000, 1200000, 1200000, ?, 8, ?, ?)`,
  ).run(orderId, clientId, masterId, now, now);
  database.prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)").run(orderId, masterId, now);

  transitionOrder({ orderId, actorId: clientId, actorRole: "CLIENT", toStatus: "COMPLETED", now });
  const warranties = listClientWarranties(clientId, now + 1);
  assert.equal(warranties.length, 1);
  assert.equal(warranties[0]?.durationDays, 30);
  assert.equal(warranties[0]?.status, "ACTIVE");
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM warranties WHERE order_id = ?").get(orderId) as { count: number }).count, 1);

  assert.throws(() => openWarrantyClaim({
    clientId: otherClientId,
    warrantyId: warranties[0]!.id,
    description: "Повторно появилась протечка под смесителем",
    evidence: { fileName: "problem.png", mimeType: "image/png", byteSize: 8, content: Buffer.alloc(8) },
    now: now + 1000,
  }), /WARRANTY_ACCESS_DENIED/);

  openWarrantyClaim({
    clientId,
    warrantyId: warranties[0]!.id,
    description: "Повторно появилась протечка под смесителем",
    evidence: { fileName: "problem.png", mimeType: "image/png", byteSize: 8, content: Buffer.alloc(8) },
    now: now + 1000,
  });
  assert.equal(listClientWarranties(clientId, now + 2000)[0]?.status, "CLAIMED");
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM warranty_claim_evidence").get() as { count: number }).count, 1);
  assert.throws(() => openWarrantyClaim({
    clientId,
    warrantyId: warranties[0]!.id,
    description: "Ещё одно обращение по той же работе",
    evidence: { fileName: "problem.png", mimeType: "image/png", byteSize: 8, content: Buffer.alloc(8) },
    now: now + 2000,
  }), /WARRANTY_CLAIM_EXISTS/);
});
