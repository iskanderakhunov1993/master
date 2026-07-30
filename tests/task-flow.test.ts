import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-task-flow-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

test("task prefills an order and follows the selected/completed lifecycle", async () => {
  const { getDb } = await import("../src/lib/db");
  const { listClientCalendarEvents, listMasterCalendarEvents } = await import("../src/lib/calendar/repository");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { getOrCreateOrderWizardData } = await import("../src/lib/orders/repository");
  const { addTaskMedia, createClientTask, getClientTask } = await import("../src/lib/tasks/repository");
  const { syncTaskStatusForOrder } = await import("../src/lib/tasks/sync");

  const database = getDb();
  const now = Date.now();
  const desiredDate = now + 3 * 24 * 60 * 60 * 1000;
  const clientId = randomUUID();
  const masterId = randomUUID();
  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(clientId, "Клиент задач", `${clientId}@example.test`, now, now);
  insertUser.run(masterId, "Мастер задач", `${masterId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'MASTER', 1, ?)").run(masterId, now);
  database
    .prepare(
      `INSERT INTO master_profiles (
        master_id, verification_status, onboarding_completed, onboarding_step,
        created_at, updated_at
      ) VALUES (?, 'VERIFIED', 1, 6, ?, ?)`,
    )
    .run(masterId, now, now);

  const task = createClientTask(clientId, {
    title: "Починить розетку",
    description: "Искрит при подключении зарядного устройства.",
    categoryId: "electrical",
    priority: "HIGH",
    desiredDate,
  });
  addTaskMedia({
    clientId,
    taskId: task.id,
    fileName: "socket.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });

  const wizard = getOrCreateOrderWizardData(clientId, undefined, task.id);
  assert.match(wizard.draft.description, /Починить розетку/);
  assert.match(wizard.draft.description, /Искрит/);
  assert.equal(wizard.draft.categoryId, "electrical");
  assert.equal(wizard.draft.scheduleKind, "CUSTOM");
  assert.equal(wizard.draft.scheduledAt, desiredDate);
  assert.equal(wizard.draft.photos.length, 1);
  assert.equal(getClientTask(clientId, task.id)?.linkedOrderId, wizard.draft.id);

  database
    .prepare(
      `UPDATE orders SET
        status = 'MASTER_SELECTED', selected_master_id = ?,
        address_city = 'Москва', address_street = 'Тестовая', address_house = '1',
        agreed_price_minor = 300000, total_price_minor = 300000,
        master_selected_at = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(masterId, now, now, wizard.draft.id);
  database
    .prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)")
    .run(wizard.draft.id, masterId, now);
  syncTaskStatusForOrder(database, wizard.draft.id, "MASTER_SELECTED", now);
  assert.equal(getClientTask(clientId, task.id)?.status, "MASTER_FOUND");
  const masterEvent = listMasterCalendarEvents(masterId).find((event) => event.id === `order-${wizard.draft.id}`);
  assert.equal(masterEvent?.clientName, "Клиент задач");
  assert.match(masterEvent?.location ?? "", /Тестовая/);

  const masterTransitions = [
    "MASTER_CONFIRMED",
    "MASTER_ON_THE_WAY",
    "MASTER_ARRIVED",
    "IN_PROGRESS",
    "COMPLETED_BY_MASTER",
  ] as const;
  const { addOrderEvidence } = await import("../src/lib/orders/transparency");
  for (const [index, status] of masterTransitions.entries()) {
    if (status === "IN_PROGRESS") {
      addOrderEvidence({ orderId: wizard.draft.id, masterId, stage: "BEFORE", fileName: "before.png", mimeType: "image/png", byteSize: 8, content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) });
    }
    if (status === "COMPLETED_BY_MASTER") {
      addOrderEvidence({ orderId: wizard.draft.id, masterId, stage: "AFTER", fileName: "after.png", mimeType: "image/png", byteSize: 8, content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) });
    }
    transitionOrder({
      orderId: wizard.draft.id,
      actorId: masterId,
      actorRole: "MASTER",
      toStatus: status,
      now: now + (index + 1) * 1000,
    });
  }
  transitionOrder({
    orderId: wizard.draft.id,
    actorId: clientId,
    actorRole: "CLIENT",
    toStatus: "COMPLETED",
    now: now + 10_000,
  });

  assert.equal(getClientTask(clientId, task.id)?.status, "DONE");
  const events = listClientCalendarEvents(clientId);
  assert.equal(events.find((event) => event.id === `task-${task.id}`)?.tone, "COMPLETED");
  assert.equal(
    (database.prepare("SELECT COUNT(*) AS count FROM order_status_history WHERE order_id = ?").get(wizard.draft.id) as { count: number }).count,
    6,
  );
});

test("optimistic task move rejects a stale update", async () => {
  const { createClientTask, moveClientTask } = await import("../src/lib/tasks/repository");
  const { getDb } = await import("../src/lib/db");
  const database = getDb();
  const now = Date.now();
  const clientId = randomUUID();
  database
    .prepare("INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, 'Клиент', ?, 'test', ?, ?)")
    .run(clientId, `${clientId}@example.test`, now, now);
  database.prepare("INSERT INTO user_roles (user_id, role, is_primary, created_at) VALUES (?, 'CLIENT', 1, ?)").run(clientId, now);
  const task = createClientTask(clientId, { title: "Собрать шкаф", priority: "MEDIUM" });
  const moved = moveClientTask(clientId, task.id, "PLANNED", task.updatedAt);
  assert.equal(moved.status, "PLANNED");
  assert.throws(() => moveClientTask(clientId, task.id, "DONE", task.updatedAt), /TASK_UPDATE_CONFLICT/);
});
