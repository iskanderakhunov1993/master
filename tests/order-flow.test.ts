import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const testDatabaseFilename = "master-ryadom-test.db";
process.env.DATABASE_FILENAME = testDatabaseFilename;
process.env.URGENCY_MULTIPLIER = "1.75";

for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${testDatabaseFilename}${suffix}`), { force: true });
}

test("urgent price uses the configured multiplier and safe bounds", async () => {
  const { calculateUrgentPrice, getUrgencyConfig } = await import("../src/lib/orders/config");

  assert.deepEqual(getUrgencyConfig(), { multiplier: 1.75, basisPoints: 17_500 });
  assert.equal(calculateUrgentPrice(300_000, 17_500), 525_000);

  process.env.URGENCY_MULTIPLIER = "99";
  assert.deepEqual(getUrgencyConfig(), { multiplier: 5, basisPoints: 50_000 });
  process.env.URGENCY_MULTIPLIER = "1.75";
});

test("photo validation checks MIME type, size and binary signature", async () => {
  const { MAX_ORDER_PHOTO_SIZE, validateOrderPhoto } = await import("../src/lib/orders/media");
  const pngSignature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.equal(validateOrderPhoto({ mimeType: "image/png", byteSize: pngSignature.length, content: pngSignature }), null);
  assert.equal(validateOrderPhoto({ mimeType: "image/svg+xml", byteSize: 100 })?.code, "INVALID_TYPE");
  assert.equal(validateOrderPhoto({ mimeType: "image/png", byteSize: MAX_ORDER_PHOTO_SIZE + 1 })?.code, "INVALID_SIZE");
  assert.equal(validateOrderPhoto({ mimeType: "image/png", byteSize: 8, content: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) })?.code, "INVALID_CONTENT");
});

test("client can persist and submit the complete order flow", async () => {
  const { getDb } = await import("../src/lib/db");
  const { createClientAddress, deleteClientAddress } = await import("../src/lib/addresses/repository");
  const {
    addOrderMedia,
    deleteOrderMedia,
    getClientOrder,
    getOrCreateOrderWizardData,
    listOrderPhotos,
    replaceOrderMedia,
    saveAddressStep,
    saveCategoryStep,
    saveDescriptionStep,
    saveOrderTypeStep,
    savePhotoStep,
    savePriceStep,
    saveScheduleStep,
    submitOrder,
  } = await import("../src/lib/orders/repository");

  const database = getDb();
  const clientId = randomUUID();
  const now = Date.now();
  database
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(clientId, "Тестовый клиент", `client-${clientId}@example.test`, "test", now, now);
  database
    .prepare(
      `INSERT INTO user_roles (user_id, role, is_primary, created_at)
      VALUES (?, 'CLIENT', 1, ?)`,
    )
    .run(clientId, now);

  const address = createClientAddress(clientId, {
    city: "Москва",
    street: "Тестовая улица",
    house: "12",
    apartment: "45",
    comment: "Домофон 45",
    isPrimary: true,
  });
  const wizard = getOrCreateOrderWizardData(clientId, "URGENT");
  const orderId = wizard.draft.id;

  assert.equal(wizard.categories.length, 6);
  assert.equal(wizard.draft.orderType, "URGENT");
  assert.equal(wizard.urgencyMultiplier, 1.75);

  const uploaded = addOrderMedia({
    clientId,
    orderId,
    fileName: "problem.png",
    mimeType: "image/png",
    byteSize: 4,
    content: Buffer.from([137, 80, 78, 71]),
  });
  assert.equal(listOrderPhotos(clientId, orderId).length, 1);
  replaceOrderMedia({
    clientId,
    orderId,
    mediaId: uploaded.id,
    fileName: "problem-new.webp",
    mimeType: "image/webp",
    byteSize: 4,
    content: Buffer.from("RIFF"),
  });
  assert.equal(listOrderPhotos(clientId, orderId)[0]?.fileName, "problem-new.webp");
  assert.equal(deleteOrderMedia(clientId, orderId, uploaded.id), true);
  assert.equal(listOrderPhotos(clientId, orderId).length, 0);

  savePhotoStep(clientId, orderId);
  saveDescriptionStep(clientId, orderId, "Течёт под раковиной после включения воды");
  saveCategoryStep(clientId, orderId, "plumbing", "plumbing-leak");
  saveAddressStep(clientId, orderId, address, "moscow-cao");
  saveScheduleStep(clientId, orderId, "CUSTOM", now + 2 * 60 * 60 * 1000);
  saveOrderTypeStep(clientId, orderId, "URGENT");
  const price = savePriceStep(clientId, orderId, 3_000);

  assert.equal(price.totalPriceMinor, 525_000);
  assert.equal(submitOrder(clientId, orderId), orderId);

  const order = getClientOrder(clientId, orderId);
  assert.ok(order);
  assert.equal(order.status, "SEARCHING_MASTERS");
  assert.equal(order.categoryName, "Сантехника");
  assert.equal(order.subcategoryName, "Протечка");
  assert.equal(order.totalPriceRubles, 5_250);
  assert.equal(order.street, "Тестовая улица");

  assert.equal(deleteClientAddress(clientId, address.id), true);
  const orderAfterAddressDeletion = getClientOrder(clientId, orderId);
  assert.equal(orderAfterAddressDeletion?.street, "Тестовая улица");
  assert.equal(orderAfterAddressDeletion?.house, "12");
});
