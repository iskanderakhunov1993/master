import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const testDatabaseFilename = "master-ryadom-master-test.db";
process.env.DATABASE_FILENAME = testDatabaseFilename;

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${testDatabaseFilename}${suffix}`), { force: true });
}

test("reliability formula is transparent, bounded and handles no history", async () => {
  const { calculateReliability } = await import("../src/lib/masters/reliability");

  const empty = calculateReliability({
    completedJobs: 0,
    masterCancellations: 0,
    noShows: 0,
    lateArrivals: 0,
    confirmedCompletions: 0,
  });
  assert.equal(empty.score, null);
  assert.equal(empty.label, "Нет данных");

  const perfect = calculateReliability({
    completedJobs: 20,
    masterCancellations: 0,
    noShows: 0,
    lateArrivals: 0,
    confirmedCompletions: 20,
  });
  assert.equal(perfect.score, 100);
  assert.equal(perfect.label, "Отличная");

  const imperfect = calculateReliability({
    completedJobs: 8,
    masterCancellations: 2,
    noShows: 1,
    lateArrivals: 2,
    confirmedCompletions: 6,
  });
  assert.ok(imperfect.score !== null && imperfect.score >= 0 && imperfect.score < 100);
  assert.equal(imperfect.metrics.length, 5);
  assert.ok(imperfect.metrics.some((metric) => metric.penalty > 0));
});

test("master completes onboarding, verification, presence and matching flow", async () => {
  const { getDb } = await import("../src/lib/db");
  const {
    addMasterMedia,
    completeMasterOnboarding,
    decideVerification,
    deleteMasterMedia,
    ensureMasterProfile,
    getMasterDashboardData,
    getMasterProfile,
    getPublicMasterProfileData,
    listPendingVerificationApplications,
    saveMasterBasic,
    saveMasterCategories,
    saveMasterExperience,
    saveMasterServiceAreas,
    setMasterOnline,
    submitVerification,
  } = await import("../src/lib/masters/repository");

  const database = getDb();
  const masterId = randomUUID();
  const adminId = randomUUID();
  const clientId = randomUUID();
  const now = Date.now();
  const insertUser = database.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'test', ?, ?)`,
  );
  insertUser.run(masterId, "Тестовый мастер", `master-${masterId}@example.test`, now, now);
  insertUser.run(adminId, "Тестовый администратор", `admin-${adminId}@example.test`, now, now);
  insertUser.run(clientId, "Тестовый клиент", `client-${clientId}@example.test`, now, now);
  const insertRole = database.prepare(
    `INSERT INTO user_roles (user_id, role, is_primary, created_at)
    VALUES (?, ?, 1, ?)`,
  );
  insertRole.run(masterId, "MASTER", now);
  insertRole.run(adminId, "ADMIN", now);
  insertRole.run(clientId, "CLIENT", now);

  ensureMasterProfile(masterId);
  assert.equal(getMasterProfile(masterId).verificationStatus, "NOT_STARTED");
  assert.equal(getPublicMasterProfileData(masterId), null);

  saveMasterBasic(masterId, { name: "Алексей Петров", phone: "+7 900 000-00-00" });
  const avatar = addMasterMedia({
    masterId,
    kind: "AVATAR",
    fileName: "avatar.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  assert.equal(getMasterProfile(masterId).avatar?.id, avatar.id);

  const firstDocument = addMasterMedia({
    masterId,
    kind: "IDENTITY",
    fileName: "passport-first.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  const firstApplicationId = submitVerification({
    masterId,
    legalName: "Алексей Петров",
    documentLastFour: "1234",
    documentMediaId: firstDocument.id,
  });
  assert.equal(getMasterProfile(masterId).verificationStatus, "PENDING");
  assert.equal(listPendingVerificationApplications()[0]?.id, firstApplicationId);

  saveMasterCategories(masterId, ["plumbing", "electrical"]);
  saveMasterServiceAreas(masterId, ["moscow-cao", "moscow-sao"]);
  saveMasterExperience(masterId, {
    experienceYears: 6,
    bio: "Работаю с сантехникой и электрикой, заранее согласовываю цену и время приезда.",
  });
  completeMasterOnboarding(masterId);
  assert.throws(() => setMasterOnline(masterId, true), /MASTER_NOT_VERIFIED/);

  decideVerification({
    applicationId: firstApplicationId,
    adminId,
    decision: "REJECTED",
    rejectionReason: "Фотография документа нечёткая",
  });
  const rejectedProfile = getMasterProfile(masterId);
  assert.equal(rejectedProfile.verificationStatus, "REJECTED");
  assert.equal(rejectedProfile.verificationRejectionReason, "Фотография документа нечёткая");

  const secondDocument = addMasterMedia({
    masterId,
    kind: "IDENTITY",
    fileName: "passport-second.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  const secondApplicationId = submitVerification({
    masterId,
    legalName: "Алексей Петров",
    documentLastFour: "1234",
    documentMediaId: secondDocument.id,
  });
  decideVerification({ applicationId: secondApplicationId, adminId, decision: "VERIFIED" });
  assert.equal(getMasterProfile(masterId).verificationStatus, "VERIFIED");
  assert.equal(getMasterProfile(masterId).onboardingCompleted, true);
  assert.ok(getPublicMasterProfileData(masterId));

  const portfolio = addMasterMedia({
    masterId,
    kind: "PORTFOLIO",
    fileName: "work.png",
    mimeType: "image/png",
    byteSize: 8,
    content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  assert.equal(getMasterProfile(masterId).portfolio.length, 1);
  assert.equal(deleteMasterMedia(masterId, portfolio.id, "PORTFOLIO"), true);
  assert.equal(getMasterProfile(masterId).portfolio.length, 0);

  const orderId = randomUUID();
  database
    .prepare(
      `INSERT INTO orders (
        id, client_id, status, description, category_id, subcategory_id,
        address_city, address_street, address_house, address_apartment,
        schedule_kind, order_type, base_price_minor, urgency_multiplier_bps,
        total_price_minor, current_step, created_at, updated_at, submitted_at
      ) VALUES (?, ?, 'SEARCHING_MASTERS', ?, 'plumbing', 'plumbing-leak',
        'Москва', 'Секретная улица', '99', '12', 'NOW', 'NORMAL', 300000,
        10000, 300000, 8, ?, ?, ?)`,
    )
    .run(orderId, clientId, "Нужно устранить протечку под раковиной", now, now, now);
  database
    .prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, 'moscow-cao')")
    .run(orderId);

  setMasterOnline(masterId, true);
  const onlineDashboard = getMasterDashboardData(masterId);
  assert.equal(onlineDashboard.profile.isOnline, true);
  assert.equal(onlineDashboard.availableOrders.length, 1);
  assert.equal(onlineDashboard.availableOrders[0]?.locationLabel, "Центральный округ");
  assert.equal(JSON.stringify(onlineDashboard.availableOrders).includes("Секретная улица"), false);

  setMasterOnline(masterId, false);
  assert.equal(getMasterDashboardData(masterId).availableOrders.length, 0);
  setMasterOnline(masterId, true);

  database.prepare("UPDATE orders SET status = 'ASSIGNED' WHERE id = ?").run(orderId);
  database
    .prepare("INSERT INTO order_assignments (order_id, master_id, assigned_at) VALUES (?, ?, ?)")
    .run(orderId, masterId, now);
  const assignedDashboard = getMasterDashboardData(masterId);
  assert.equal(assignedDashboard.availableOrders.length, 0);
  assert.equal(assignedDashboard.activeOrder?.id, orderId);
  assert.equal(assignedDashboard.activeOrder?.locationLabel, "Секретная улица, 99");
});
