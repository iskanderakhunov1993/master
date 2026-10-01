import { randomUUID } from "node:crypto";

import { listClientAddresses } from "@/lib/addresses/repository";
import type { ClientAddress } from "@/lib/addresses/types";
import { getDb } from "@/lib/db";
import { matchOrder } from "@/lib/marketplace/matching";
import { expireOffers } from "@/lib/marketplace/offers";

import { calculateUrgentPrice, getUrgencyConfig } from "./config";
import { appendOrderStatusHistory } from "./lifecycle";
import type {
  ClientDashboardData,
  ClientTaskSummary,
  OrderDraft,
  OrderPhoto,
  OrderStatus,
  OrderSummary,
  OrderType,
  OrderWizardData,
  ScheduleKind,
  ServiceCategory,
  OrderServiceArea,
} from "./types";

type DraftRow = {
  id: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  addressId: string | null;
  serviceAreaId: string | null;
  addressCity: string | null;
  addressStreet: string | null;
  addressHouse: string | null;
  addressApartment: string | null;
  addressComment: string | null;
  scheduleKind: ScheduleKind | null;
  scheduledAt: number | null;
  orderType: OrderType;
  basePriceMinor: number | null;
  urgencyMultiplierBps: number;
  totalPriceMinor: number | null;
  currentStep: number;
};

type SummaryRow = {
  id: string;
  status: OrderSummary["status"];
  description: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  city: string | null;
  street: string | null;
  house: string | null;
  apartment: string | null;
  scheduleKind: ScheduleKind | null;
  scheduledAt: number | null;
  orderType: OrderType;
  basePriceMinor: number | null;
  urgencyMultiplierBps: number;
  totalPriceMinor: number | null;
  submittedAt: number | null;
  updatedAt: number;
  photoCount: number;
  etaMinutes: number | null;
};

const draftSelect = `
  SELECT
    id,
    description,
    category_id AS categoryId,
    subcategory_id AS subcategoryId,
    address_id AS addressId,
    (SELECT service_area_id FROM order_service_areas WHERE order_id = orders.id) AS serviceAreaId,
    address_city AS addressCity,
    address_street AS addressStreet,
    address_house AS addressHouse,
    address_apartment AS addressApartment,
    address_comment AS addressComment,
    schedule_kind AS scheduleKind,
    scheduled_at AS scheduledAt,
    order_type AS orderType,
    base_price_minor AS basePriceMinor,
    urgency_multiplier_bps AS urgencyMultiplierBps,
    total_price_minor AS totalPriceMinor,
    current_step AS currentStep
  FROM orders`;

const summarySelect = `
  SELECT
    orders.id,
    orders.status,
    orders.description,
    service_categories.name AS categoryName,
    service_subcategories.name AS subcategoryName,
    orders.address_city AS city,
    orders.address_street AS street,
    orders.address_house AS house,
    orders.address_apartment AS apartment,
    orders.schedule_kind AS scheduleKind,
    orders.scheduled_at AS scheduledAt,
    orders.order_type AS orderType,
    orders.base_price_minor AS basePriceMinor,
    orders.urgency_multiplier_bps AS urgencyMultiplierBps,
    orders.total_price_minor AS totalPriceMinor,
    orders.submitted_at AS submittedAt,
    orders.updated_at AS updatedAt,
    master_offers.eta_minutes AS etaMinutes,
    COUNT(order_media.id) AS photoCount
  FROM orders
  LEFT JOIN service_categories ON service_categories.id = orders.category_id
  LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
  LEFT JOIN master_offers ON master_offers.id = orders.selected_offer_id
  LEFT JOIN order_media ON order_media.order_id = orders.id`;

function mapDraft(row: DraftRow): OrderDraft {
  return {
    id: row.id,
    description: row.description ?? "",
    categoryId: row.categoryId ?? "",
    subcategoryId: row.subcategoryId ?? "",
    addressId: row.addressId ?? "",
    serviceAreaId: row.serviceAreaId ?? "",
    address: {
      city: row.addressCity ?? "",
      street: row.addressStreet ?? "",
      house: row.addressHouse ?? "",
      apartment: row.addressApartment ?? "",
      comment: row.addressComment ?? "",
    },
    scheduleKind: row.scheduleKind ?? "",
    scheduledAt: row.scheduledAt,
    orderType: row.orderType,
    basePriceRubles: row.basePriceMinor === null ? null : row.basePriceMinor / 100,
    urgencyMultiplierBps: row.urgencyMultiplierBps,
    totalPriceRubles: row.totalPriceMinor === null ? null : row.totalPriceMinor / 100,
    currentStep: row.currentStep,
    photos: [],
  };
}

function mapSummary(row: SummaryRow): OrderSummary {
  return {
    id: row.id,
    status: row.status,
    description: row.description ?? "",
    categoryName: row.categoryName ?? "Без категории",
    subcategoryName: row.subcategoryName ?? "",
    city: row.city ?? "",
    street: row.street ?? "",
    house: row.house ?? "",
    apartment: row.apartment ?? "",
    scheduleKind: row.scheduleKind ?? "NOW",
    scheduledAt: row.scheduledAt,
    orderType: row.orderType,
    basePriceRubles: (row.basePriceMinor ?? 0) / 100,
    urgencyMultiplierBps: row.urgencyMultiplierBps,
    totalPriceRubles: (row.totalPriceMinor ?? 0) / 100,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    photoCount: row.photoCount,
    etaMinutes: row.etaMinutes,
  };
}

function getDraftRow(clientId: string, orderId: string) {
  return getDb()
    .prepare(`${draftSelect} WHERE id = ? AND client_id = ? AND status = 'DRAFT'`)
    .get(orderId, clientId) as DraftRow | undefined;
}

function requireDraftRow(clientId: string, orderId: string) {
  const draft = getDraftRow(clientId, orderId);
  if (!draft) throw new Error("DRAFT_NOT_FOUND");
  return draft;
}

export function isOwnedDraft(clientId: string, orderId: string) {
  return Boolean(getDraftRow(clientId, orderId));
}

export function listOrderPhotos(clientId: string, orderId: string) {
  const rows = getDb()
    .prepare(
      `SELECT order_media.id, order_media.file_name AS fileName, order_media.byte_size AS byteSize
      FROM order_media
      INNER JOIN orders ON orders.id = order_media.order_id
      WHERE order_media.order_id = ? AND orders.client_id = ?
      ORDER BY order_media.created_at`,
    )
    .all(orderId, clientId) as Array<{ id: string; fileName: string; byteSize: number }>;

  return rows.map<OrderPhoto>((row) => ({
    ...row,
    url: `/api/order-media/${row.id}`,
  }));
}

export function listServiceCategories() {
  const categories = getDb()
    .prepare(
      `SELECT id, slug, name
      FROM service_categories
      WHERE is_active = 1
      ORDER BY sort_order, name`,
    )
    .all() as Array<{ id: string; slug: string; name: string }>;
  const subcategories = getDb()
    .prepare(
      `SELECT id, category_id AS categoryId, slug, name
      FROM service_subcategories
      WHERE is_active = 1
      ORDER BY sort_order, name`,
    )
    .all() as Array<{ id: string; categoryId: string; slug: string; name: string }>;

  return categories.map<ServiceCategory>((category) => ({
    ...category,
    subcategories: subcategories
      .filter((subcategory) => subcategory.categoryId === category.id)
      .map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: subcategory.name,
      })),
  }));
}

export function listOrderServiceAreas() {
  return getDb()
    .prepare(
      `SELECT id, city, name
      FROM service_areas
      WHERE is_active = 1
      ORDER BY city, sort_order, name`,
    )
    .all() as OrderServiceArea[];
}

export function getOrCreateOrderWizardData(
  clientId: string,
  preferredType?: OrderType,
  sourceTaskId?: string,
): OrderWizardData {
  const database = getDb();
  const sourceTask = sourceTaskId
    ? database
        .prepare(
          `SELECT
            id, title, description, category_id AS categoryId,
            desired_date AS desiredDate, linked_order_id AS linkedOrderId
          FROM client_tasks WHERE id = ? AND client_id = ?`,
        )
        .get(sourceTaskId, clientId) as
          | {
              id: string;
              title: string;
              description: string | null;
              categoryId: string | null;
              desiredDate: number | null;
              linkedOrderId: string | null;
            }
          | undefined
    : undefined;
  if (sourceTaskId && !sourceTask) throw new Error("TASK_NOT_FOUND");

  let draft = sourceTask?.linkedOrderId
    ? database
        .prepare(`${draftSelect} WHERE id = ? AND client_id = ? AND status = 'DRAFT'`)
        .get(sourceTask.linkedOrderId, clientId) as DraftRow | undefined
    : database
        .prepare(`${draftSelect} WHERE client_id = ? AND status = 'DRAFT' ORDER BY updated_at DESC LIMIT 1`)
        .get(clientId) as DraftRow | undefined;

  if (sourceTask?.linkedOrderId && !draft) throw new Error("TASK_ALREADY_HAS_ORDER");

  if (!draft) {
    const id = randomUUID();
    const now = Date.now();
    const orderType = preferredType === "URGENT" ? "URGENT" : "NORMAL";
    const multiplierBps = orderType === "URGENT" ? getUrgencyConfig().basisPoints : 10_000;
    database
      .prepare(
        `INSERT INTO orders (
          id, client_id, status, order_type, urgency_multiplier_bps,
          current_step, created_at, updated_at
        ) VALUES (?, ?, 'DRAFT', ?, ?, 1, ?, ?)`,
      )
      .run(id, clientId, orderType, multiplierBps, now, now);
    draft = getDraftRow(clientId, id)!;
  } else if (preferredType === "URGENT" && draft.orderType !== "URGENT") {
    const multiplierBps = getUrgencyConfig().basisPoints;
    const totalPriceMinor = draft.basePriceMinor === null
      ? null
      : calculateUrgentPrice(draft.basePriceMinor, multiplierBps);
    database
      .prepare(
        `UPDATE orders
        SET order_type = 'URGENT', urgency_multiplier_bps = ?, total_price_minor = ?,
            updated_at = ?, version = version + 1
        WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
      )
      .run(multiplierBps, totalPriceMinor, Date.now(), draft.id, clientId);
    draft = getDraftRow(clientId, draft.id)!;
  }

  if (sourceTask && sourceTask.linkedOrderId !== draft.id) {
    const now = Date.now();
    database.transaction(() => {
      const description = [sourceTask.title.trim(), sourceTask.description?.trim()]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 1000);
      const scheduledAt = sourceTask.desiredDate && sourceTask.desiredDate > now
        ? sourceTask.desiredDate
        : null;
      database
        .prepare("UPDATE client_tasks SET linked_order_id = NULL, updated_at = ? WHERE linked_order_id = ?")
        .run(now, draft!.id);
      database.prepare("DELETE FROM order_media WHERE order_id = ?").run(draft!.id);
      database.prepare("DELETE FROM order_service_areas WHERE order_id = ?").run(draft!.id);
      database
        .prepare(
          `UPDATE orders SET
            description = ?, category_id = ?, subcategory_id = NULL,
            address_id = NULL, address_city = NULL, address_street = NULL,
            address_house = NULL, address_apartment = NULL, address_comment = NULL,
            schedule_kind = ?, scheduled_at = ?, order_type = 'NORMAL',
            base_price_minor = NULL, urgency_multiplier_bps = 10000,
            total_price_minor = NULL, current_step = 1,
            updated_at = ?, version = version + 1
          WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
        )
        .run(
          description,
          sourceTask.categoryId,
          scheduledAt ? "CUSTOM" : null,
          scheduledAt,
          now,
          draft!.id,
          clientId,
        );
      const taskPhotos = database
        .prepare(
          `SELECT file_name AS fileName, mime_type AS mimeType,
            byte_size AS byteSize, content, created_at AS createdAt
          FROM client_task_media WHERE task_id = ? ORDER BY created_at LIMIT 5`,
        )
        .all(sourceTask.id) as Array<{
          fileName: string;
          mimeType: string;
          byteSize: number;
          content: Buffer;
          createdAt: number;
        }>;
      const insertPhoto = database.prepare(
        `INSERT INTO order_media (
          id, order_id, client_id, file_name, mime_type, byte_size, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const photo of taskPhotos) {
        insertPhoto.run(
          randomUUID(),
          draft!.id,
          clientId,
          photo.fileName,
          photo.mimeType,
          photo.byteSize,
          photo.content,
          photo.createdAt,
        );
      }
      database
        .prepare(
          `UPDATE client_tasks
          SET linked_order_id = ?, status = CASE
            WHEN desired_date IS NULL THEN 'TODO' ELSE 'PLANNED'
          END, updated_at = ?
          WHERE id = ? AND client_id = ? AND linked_order_id IS NULL`,
        )
        .run(draft!.id, now, sourceTask.id, clientId);
    })();
    draft = getDraftRow(clientId, draft.id)!;
  }

  const mappedDraft = mapDraft(draft);
  mappedDraft.photos = listOrderPhotos(clientId, draft.id);

  return {
    draft: mappedDraft,
    categories: listServiceCategories(),
    addresses: listClientAddresses(clientId),
    serviceAreas: listOrderServiceAreas(),
    urgencyMultiplier: getUrgencyConfig().multiplier,
  };
}

export function savePhotoStep(clientId: string, orderId: string) {
  requireDraftRow(clientId, orderId);
  getDb()
    .prepare(
      `UPDATE orders SET current_step = 2, updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(Date.now(), orderId, clientId);
}

export function saveDescriptionStep(clientId: string, orderId: string, description: string) {
  requireDraftRow(clientId, orderId);
  getDb()
    .prepare(
      `UPDATE orders SET description = ?, current_step = 3, updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(description, Date.now(), orderId, clientId);
}

export function saveCategoryStep(
  clientId: string,
  orderId: string,
  categoryId: string,
  subcategoryId: string | null,
) {
  requireDraftRow(clientId, orderId);
  const category = getDb()
    .prepare("SELECT id FROM service_categories WHERE id = ? AND is_active = 1")
    .get(categoryId) as { id: string } | undefined;
  if (!category) throw new Error("CATEGORY_NOT_FOUND");

  if (subcategoryId) {
    const subcategory = getDb()
      .prepare(
        `SELECT id FROM service_subcategories
        WHERE id = ? AND category_id = ? AND is_active = 1`,
      )
      .get(subcategoryId, categoryId) as { id: string } | undefined;
    if (!subcategory) throw new Error("SUBCATEGORY_NOT_FOUND");
  }

  getDb()
    .prepare(
      `UPDATE orders
      SET category_id = ?, subcategory_id = ?, current_step = 4,
          updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(categoryId, subcategoryId, Date.now(), orderId, clientId);
}

export function saveAddressStep(
  clientId: string,
  orderId: string,
  address: ClientAddress,
  serviceAreaId: string,
) {
  const database = getDb();
  database.transaction(() => {
    requireDraftRow(clientId, orderId);
    const area = database
      .prepare("SELECT id, city FROM service_areas WHERE id = ? AND is_active = 1")
      .get(serviceAreaId) as { id: string; city: string } | undefined;
    if (!area) throw new Error("SERVICE_AREA_NOT_FOUND");
    if (area.city.trim().toLocaleLowerCase("ru-RU") !== address.city.trim().toLocaleLowerCase("ru-RU")) {
      throw new Error("SERVICE_AREA_CITY_MISMATCH");
    }

    database
      .prepare(
        `UPDATE orders
        SET address_id = ?, address_city = ?, address_street = ?, address_house = ?,
            address_apartment = ?, address_comment = ?, current_step = 5,
            updated_at = ?, version = version + 1
        WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
      )
      .run(
        address.id || null,
        address.city,
        address.street,
        address.house,
        address.apartment || null,
        address.comment || null,
        Date.now(),
        orderId,
        clientId,
      );
    database
      .prepare(
        `INSERT INTO order_service_areas (order_id, service_area_id)
        VALUES (?, ?)
        ON CONFLICT(order_id) DO UPDATE SET service_area_id = excluded.service_area_id`,
      )
      .run(orderId, serviceAreaId);
  })();
}

export function saveScheduleStep(
  clientId: string,
  orderId: string,
  scheduleKind: ScheduleKind,
  scheduledAt: number | null,
) {
  requireDraftRow(clientId, orderId);
  getDb()
    .prepare(
      `UPDATE orders
      SET schedule_kind = ?, scheduled_at = ?, current_step = 6,
          updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(scheduleKind, scheduledAt, Date.now(), orderId, clientId);
}

export function saveOrderTypeStep(
  clientId: string,
  orderId: string,
  orderType: OrderType,
) {
  const draft = requireDraftRow(clientId, orderId);
  const multiplierBps = orderType === "URGENT" ? getUrgencyConfig().basisPoints : 10_000;
  const totalPriceMinor = draft.basePriceMinor === null
    ? null
    : calculateUrgentPrice(draft.basePriceMinor, multiplierBps);

  getDb()
    .prepare(
      `UPDATE orders
      SET order_type = ?, urgency_multiplier_bps = ?, total_price_minor = ?,
          current_step = 7, updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(orderType, multiplierBps, totalPriceMinor, Date.now(), orderId, clientId);

  return { multiplierBps, totalPriceMinor };
}

export function savePriceStep(
  clientId: string,
  orderId: string,
  basePriceRubles: number,
) {
  const draft = requireDraftRow(clientId, orderId);
  const basePriceMinor = Math.round(basePriceRubles * 100);
  const totalPriceMinor = calculateUrgentPrice(basePriceMinor, draft.urgencyMultiplierBps);

  getDb()
    .prepare(
      `UPDATE orders
      SET base_price_minor = ?, total_price_minor = ?, current_step = 8,
          updated_at = ?, version = version + 1
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(basePriceMinor, totalPriceMinor, Date.now(), orderId, clientId);

  return { totalPriceMinor };
}

export function setDraftCurrentStep(clientId: string, orderId: string, step: number) {
  requireDraftRow(clientId, orderId);
  getDb()
    .prepare(
      `UPDATE orders SET current_step = ?, updated_at = ?
      WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
    )
    .run(Math.min(8, Math.max(1, step)), Date.now(), orderId, clientId);
}

export function submitOrder(clientId: string, orderId: string) {
  const database = getDb();

  return database.transaction(() => {
    const draft = requireDraftRow(clientId, orderId);
    const now = Date.now();
    if (!draft.description || draft.description.trim().length < 10) throw new Error("DESCRIPTION_REQUIRED");
    if (!draft.categoryId) throw new Error("CATEGORY_REQUIRED");
    if (!draft.addressCity || !draft.addressStreet || !draft.addressHouse) throw new Error("ADDRESS_REQUIRED");
    const hasServiceArea = database
      .prepare("SELECT 1 FROM order_service_areas WHERE order_id = ?")
      .get(orderId);
    if (!hasServiceArea) throw new Error("SERVICE_AREA_REQUIRED");
    if (!draft.scheduleKind) throw new Error("SCHEDULE_REQUIRED");
    if (draft.scheduleKind !== "NOW" && !draft.scheduledAt) throw new Error("SCHEDULE_TIME_REQUIRED");
    if (draft.scheduleKind !== "NOW" && draft.scheduledAt! <= now) throw new Error("SCHEDULE_TIME_PAST");
    if (!draft.basePriceMinor || draft.basePriceMinor < 50_000) throw new Error("PRICE_REQUIRED");

    const result = database
      .prepare(
        `UPDATE orders
        SET status = 'SEARCHING_MASTERS', submitted_at = ?, updated_at = ?,
            version = version + 1
        WHERE id = ? AND client_id = ? AND status = 'DRAFT'`,
      )
      .run(now, now, orderId, clientId);

    if (result.changes !== 1) throw new Error("ORDER_SUBMIT_CONFLICT");
    appendOrderStatusHistory(database, {
      orderId,
      fromStatus: "DRAFT",
      toStatus: "SEARCHING_MASTERS",
      actorUserId: clientId,
      actorRole: "CLIENT",
      createdAt: now,
    });
    matchOrder(orderId, now);
    return orderId;
  })();
}

export function listClientOrders(clientId: string, limit = 20) {
  expireOffers();
  const rows = getDb()
    .prepare(
      `${summarySelect}
      WHERE orders.client_id = ? AND orders.status != 'DRAFT'
      GROUP BY orders.id
      ORDER BY orders.updated_at DESC
      LIMIT ?`,
    )
    .all(clientId, limit) as SummaryRow[];

  return rows.map(mapSummary);
}

export function getClientOrder(clientId: string, orderId: string) {
  expireOffers();
  const row = getDb()
    .prepare(
      `${summarySelect}
      WHERE orders.client_id = ? AND orders.id = ? AND orders.status != 'DRAFT'
      GROUP BY orders.id`,
    )
    .get(clientId, orderId) as SummaryRow | undefined;

  return row ? mapSummary(row) : null;
}

export function getClientDashboardData(clientId: string): ClientDashboardData {
  const orders = listClientOrders(clientId, 5);
  const activeStatuses: OrderStatus[] = [
    "SEARCHING_MASTERS", "OFFERS_RECEIVED", "MASTER_SELECTED",
    "MASTER_CONFIRMED", "MASTER_ON_THE_WAY", "MASTER_ARRIVED",
    "IN_PROGRESS", "COMPLETED_BY_MASTER", "DISPUTED",
    "AWAITING_SELECTION", "SEARCH_EXHAUSTED", "ASSIGNED", "EN_ROUTE",
    "ARRIVED", "AWAITING_CONFIRMATION",
  ];
  const activeStatusPlaceholders = activeStatuses.map(() => "?").join(", ");
  const activeRow = getDb()
    .prepare(
      `${summarySelect}
      WHERE orders.client_id = ? AND orders.status IN (${activeStatusPlaceholders})
      GROUP BY orders.id
      ORDER BY CASE orders.status
        WHEN 'IN_PROGRESS' THEN 1
        WHEN 'MASTER_ARRIVED' THEN 2
        WHEN 'ARRIVED' THEN 2
        WHEN 'MASTER_ON_THE_WAY' THEN 3
        WHEN 'EN_ROUTE' THEN 3
        WHEN 'COMPLETED_BY_MASTER' THEN 4
        WHEN 'AWAITING_CONFIRMATION' THEN 4
        WHEN 'MASTER_CONFIRMED' THEN 5
        WHEN 'MASTER_SELECTED' THEN 6
        WHEN 'ASSIGNED' THEN 6
        WHEN 'DISPUTED' THEN 7
        WHEN 'OFFERS_RECEIVED' THEN 8
        WHEN 'AWAITING_SELECTION' THEN 8
        WHEN 'SEARCHING_MASTERS' THEN 9
        WHEN 'SEARCH_EXHAUSTED' THEN 10
        ELSE 11
      END, orders.updated_at DESC
      LIMIT 1`,
    )
    .get(clientId, ...activeStatuses) as SummaryRow | undefined;
  const activeOrder = activeRow ? mapSummary(activeRow) : null;
  const tasks = getDb()
    .prepare(
      `SELECT id, title, desired_date AS dueAt
      FROM client_tasks
      WHERE client_id = ? AND status != 'DONE' AND (desired_date IS NULL OR desired_date >= ?)
      ORDER BY desired_date IS NULL, desired_date
      LIMIT 4`,
    )
    .all(clientId, Date.now()) as ClientTaskSummary[];

  return {
    activeOrder,
    recentOrders: orders.slice(0, 3),
    upcomingTasks: tasks,
  };
}

export function addOrderMedia(input: {
  clientId: string;
  orderId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
}) {
  const database = getDb();
  return database.transaction(() => {
    requireDraftRow(input.clientId, input.orderId);
    const mediaCount = (database
      .prepare("SELECT COUNT(*) AS count FROM order_media WHERE order_id = ? AND client_id = ?")
      .get(input.orderId, input.clientId) as { count: number }).count;
    if (mediaCount >= 5) throw new Error("PHOTO_LIMIT");

    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO order_media (
          id, order_id, client_id, file_name, mime_type, byte_size, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.orderId,
        input.clientId,
        input.fileName,
        input.mimeType,
        input.byteSize,
        input.content,
        Date.now(),
      );
    return { id, url: `/api/order-media/${id}`, fileName: input.fileName, byteSize: input.byteSize };
  })();
}

export function replaceOrderMedia(input: {
  clientId: string;
  orderId: string;
  mediaId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
}) {
  requireDraftRow(input.clientId, input.orderId);
  const result = getDb()
    .prepare(
      `UPDATE order_media
      SET file_name = ?, mime_type = ?, byte_size = ?, content = ?, created_at = ?
      WHERE id = ? AND order_id = ? AND client_id = ?`,
    )
    .run(
      input.fileName,
      input.mimeType,
      input.byteSize,
      input.content,
      Date.now(),
      input.mediaId,
      input.orderId,
      input.clientId,
    );
  if (result.changes !== 1) throw new Error("PHOTO_NOT_FOUND");
  return {
    id: input.mediaId,
    url: `/api/order-media/${input.mediaId}?v=${Date.now()}`,
    fileName: input.fileName,
    byteSize: input.byteSize,
  };
}

export function deleteOrderMedia(clientId: string, orderId: string, mediaId: string) {
  requireDraftRow(clientId, orderId);
  return getDb()
    .prepare("DELETE FROM order_media WHERE id = ? AND order_id = ? AND client_id = ?")
    .run(mediaId, orderId, clientId).changes === 1;
}

export function getOwnedOrderMedia(clientId: string, mediaId: string) {
  return getDb()
    .prepare(
      `SELECT order_media.mime_type AS mimeType, order_media.content, order_media.byte_size AS byteSize
      FROM order_media
      INNER JOIN orders ON orders.id = order_media.order_id
      WHERE order_media.id = ? AND orders.client_id = ?`,
    )
    .get(mediaId, clientId) as { mimeType: string; content: Buffer; byteSize: number } | undefined;
}

export function getOrderMediaForMaster(masterId: string, mediaId: string, now = Date.now()) {
  return getDb()
    .prepare(
      `SELECT order_media.mime_type AS mimeType, order_media.content, order_media.byte_size AS byteSize
      FROM order_media
      INNER JOIN orders ON orders.id = order_media.order_id
      INNER JOIN master_profiles ON master_profiles.master_id = ?
      LEFT JOIN order_matches
        ON order_matches.order_id = orders.id
        AND order_matches.master_id = master_profiles.master_id
      WHERE order_media.id = ?
        AND master_profiles.is_blocked = 0
        AND master_profiles.verification_status = 'VERIFIED'
        AND (
          (
            orders.status IN ('SEARCHING_MASTERS', 'OFFERS_RECEIVED')
            AND master_profiles.is_online = 1
            AND (
              (order_matches.status IN ('NEW', 'VIEWED') AND order_matches.expires_at > ?)
              OR EXISTS (
                SELECT 1 FROM master_offers
                WHERE master_offers.order_id = orders.id
                  AND master_offers.master_id = master_profiles.master_id
                  AND master_offers.status = 'ACTIVE'
                  AND master_offers.expires_at > ?
              )
            )
          )
          OR EXISTS (
            SELECT 1 FROM order_assignments
            WHERE order_assignments.order_id = orders.id
              AND order_assignments.master_id = ?
          )
        )`,
    )
    .get(masterId, mediaId, now, now, masterId) as
      | { mimeType: string; content: Buffer; byteSize: number }
      | undefined;
}
