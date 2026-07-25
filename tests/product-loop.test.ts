import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-product-loop-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

test("complete client → master → review loop keeps privacy, history, metrics and calendars consistent", async () => {
  const { createUser } = await import("../src/lib/auth/repository");
  const { createClientAddress } = await import("../src/lib/addresses/repository");
  const { listClientCalendarEvents, listMasterCalendarEvents } = await import("../src/lib/calendar/repository");
  const { getDb } = await import("../src/lib/db");
  const { listMatchedOrdersForMaster } = await import("../src/lib/marketplace/matching");
  const { createMasterOffer } = await import("../src/lib/marketplace/offers");
  const { listRankedCandidates } = await import("../src/lib/marketplace/ranking");
  const { selectMasterOffer } = await import("../src/lib/marketplace/selection");
  const { getMasterDashboardData, getMasterProfileData, getPublicMasterProfileData } = await import("../src/lib/masters/repository");
  const { classifyOrderForHistory, getClientOrderDetails, getMasterOrderDetails, listMasterOrders } = await import("../src/lib/orders/details");
  const { transitionOrder } = await import("../src/lib/orders/lifecycle");
  const { submitClientReview } = await import("../src/lib/orders/reviews");
  const {
    getClientDashboardData,
    getClientOrder,
    getOrCreateOrderWizardData,
    listClientOrders,
    saveAddressStep,
    saveCategoryStep,
    saveDescriptionStep,
    saveOrderTypeStep,
    savePhotoStep,
    savePriceStep,
    saveScheduleStep,
    submitOrder,
  } = await import("../src/lib/orders/repository");
  const { addTaskMedia, createClientTask, getClientTask } = await import("../src/lib/tasks/repository");

  const database = getDb();
  const now = Date.now();
  const scheduledAt = now + 3 * 60 * 60 * 1000;
  const client = createUser({
    name: "Новый клиент",
    email: `${randomUUID()}@example.test`,
    passwordHash: "test",
    role: "CLIENT",
  });
  const master = createUser({
    name: "Новый мастер",
    email: `${randomUUID()}@example.test`,
    passwordHash: "test",
    role: "MASTER",
  });
  database
    .prepare(
      `INSERT INTO master_profiles (
        master_id, phone, experience_years, bio, verification_status,
        is_online, onboarding_step, onboarding_completed, created_at, updated_at
      ) VALUES (?, '+7 999 000-00-00', 5, 'Сантехник с опытом.',
        'VERIFIED', 1, 6, 1, ?, ?)`,
    )
    .run(master.id, now, now);
  database.prepare("INSERT INTO master_categories (master_id, category_id, created_at) VALUES (?, 'plumbing', ?)").run(master.id, now);
  database.prepare("INSERT INTO master_service_areas (master_id, service_area_id, created_at) VALUES (?, 'moscow-cao', ?)").run(master.id, now);

  const address = createClientAddress(client.id, {
    city: "Москва",
    street: "Секретная улица",
    house: "15",
    apartment: "88",
    comment: "Домофон 4242",
    isPrimary: true,
  });
  const task = createClientTask(client.id, {
    title: "Устранить протечку",
    description: "Течёт соединение под раковиной.",
    categoryId: "plumbing",
    priority: "HIGH",
    desiredDate: scheduledAt,
  });
  addTaskMedia({
    clientId: client.id,
    taskId: task.id,
    fileName: "problem.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });

  const wizard = getOrCreateOrderWizardData(client.id, "NORMAL", task.id);
  assert.equal(wizard.draft.photos.length, 1);
  assert.equal(wizard.draft.categoryId, "plumbing");
  savePhotoStep(client.id, wizard.draft.id);
  saveDescriptionStep(client.id, wizard.draft.id, "Течёт соединение под раковиной после включения воды.");
  saveCategoryStep(client.id, wizard.draft.id, "plumbing", "plumbing-leak");
  saveAddressStep(client.id, wizard.draft.id, address, "moscow-cao");
  saveScheduleStep(client.id, wizard.draft.id, "CUSTOM", scheduledAt);
  saveOrderTypeStep(client.id, wizard.draft.id, "NORMAL");
  savePriceStep(client.id, wizard.draft.id, 3_000);
  submitOrder(client.id, wizard.draft.id);
  assert.equal(getClientOrder(client.id, wizard.draft.id)?.status, "SEARCHING_MASTERS");

  const feed = listMatchedOrdersForMaster(master.id, now + 1_000);
  assert.equal(feed.length, 1);
  assert.equal(feed[0]?.photos.length, 1);
  assert.equal("street" in feed[0]!, false);
  assert.equal(getMasterOrderDetails(master.id, wizard.draft.id), null);

  const offer = createMasterOffer({
    orderId: wizard.draft.id,
    masterId: master.id,
    proposedPriceRubles: 3_500,
    etaMinutes: 35,
    comment: "Смогу приехать сегодня.",
    acceptClientPrice: false,
    now: now + 2_000,
  });
  const candidates = listRankedCandidates(client.id, wizard.draft.id, now + 3_000);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.proposedPriceRubles, 3_500);
  assert.equal(getPublicMasterProfileData(master.id)?.profile.verificationStatus, "VERIFIED");

  selectMasterOffer({ clientId: client.id, orderId: wizard.draft.id, offerId: offer.id, now: now + 4_000 });
  assert.equal(getClientTask(client.id, task.id)?.status, "MASTER_FOUND");
  const selectedDetails = getMasterOrderDetails(master.id, wizard.draft.id);
  assert.equal(selectedDetails?.street, "Секретная улица");
  assert.equal(selectedDetails?.apartment, "88");
  assert.equal(listMasterCalendarEvents(master.id).some((event) => event.id === `order-${wizard.draft.id}`), true);
  assert.equal(getMasterDashboardData(master.id).activeOrder, null);
  assert.equal(getMasterDashboardData(master.id).upcomingOrders[0]?.id, wizard.draft.id);

  for (const [index, status] of [
    "MASTER_CONFIRMED",
    "MASTER_ON_THE_WAY",
    "MASTER_ARRIVED",
    "IN_PROGRESS",
    "COMPLETED_BY_MASTER",
  ].entries()) {
    transitionOrder({
      orderId: wizard.draft.id,
      actorId: master.id,
      actorRole: "MASTER",
      toStatus: status as "MASTER_CONFIRMED" | "MASTER_ON_THE_WAY" | "MASTER_ARRIVED" | "IN_PROGRESS" | "COMPLETED_BY_MASTER",
      now: now + (index + 5) * 1_000,
    });
  }
  transitionOrder({
    orderId: wizard.draft.id,
    actorId: client.id,
    actorRole: "CLIENT",
    toStatus: "COMPLETED",
    now: now + 11_000,
  });
  assert.equal(getMasterProfileData(master.id).profile.statistics.completedJobs, 1);

  submitClientReview({
    clientId: client.id,
    orderId: wizard.draft.id,
    overallRating: 5,
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5,
    agreementRating: 5,
    comment: "Всё выполнено аккуратно.",
    now: now + 12_000,
  });
  assert.throws(() => submitClientReview({
    clientId: client.id,
    orderId: wizard.draft.id,
    overallRating: 5,
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5,
    agreementRating: 5,
    now: now + 13_000,
  }), /REVIEW_ALREADY_EXISTS/);

  const completedOrder = getClientOrder(client.id, wizard.draft.id)!;
  assert.equal(completedOrder.status, "REVIEWED");
  assert.equal(classifyOrderForHistory(completedOrder), "COMPLETED");
  assert.equal(classifyOrderForHistory(listMasterOrders(master.id)[0]!), "COMPLETED");
  assert.equal(getClientOrderDetails(client.id, wizard.draft.id)?.reviews.length, 1);
  assert.equal(getClientTask(client.id, task.id)?.status, "DONE");
  assert.equal(getClientDashboardData(client.id).activeOrder, null);
  assert.equal(listClientOrders(client.id).some((order) => order.status === "REVIEWED"), true);
  assert.equal(listClientCalendarEvents(client.id).find((event) => event.id === `task-${task.id}`)?.tone, "COMPLETED");
  assert.equal(listMasterCalendarEvents(master.id).some((event) => event.id === `order-${wizard.draft.id}`), false);
  assert.deepEqual(database.pragma("foreign_key_check"), []);
});
