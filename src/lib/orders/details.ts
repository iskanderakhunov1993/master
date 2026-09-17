import { getDb } from "@/lib/db";

import { listOrderChangeRequests, type OrderChangeRequest } from "./change-requests";
import { specialistLabel } from "../marketplace/ranking";
import type { OrderStatus, OrderSummary, OrderType, ScheduleKind } from "./types";
import { listOrderWorkMedia, type WorkPhoto } from "./work-media";

export type OrderHistoryEntry = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorRole: "CLIENT" | "MASTER" | "ADMIN" | "SYSTEM";
  actorName: string;
  reason: string;
  createdAt: number;
};

export type OrderReviewDetails = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "CLIENT" | "MASTER";
  overallRating: number;
  qualityRating: number | null;
  punctualityRating: number | null;
  communicationRating: number | null;
  agreementRating: number | null;
  comment: string;
  createdAt: number;
};

export type OrderDetails = {
  id: string;
  status: OrderStatus;
  description: string;
  categoryName: string;
  subcategoryName: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  addressComment: string;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  agreedPriceRubles: number;
  etaMinutes: number | null;
  submittedAt: number | null;
  updatedAt: number;
  selectedAt: number | null;
  photos: Array<{ id: string; url: string; fileName: string }>;
  client: { id: string; name: string; email: string };
  master: null | {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
    specialization: string;
    rating: number | null;
    reviewsCount: number;
  };
  history: OrderHistoryEntry[];
  reviews: OrderReviewDetails[];
  changeRequests: OrderChangeRequest[];
  workPhotos: WorkPhoto[];
};

type DetailsRow = {
  id: string;
  status: OrderStatus;
  description: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  subcategoryName: string | null;
  city: string | null;
  street: string | null;
  house: string | null;
  apartment: string | null;
  addressComment: string | null;
  scheduleKind: ScheduleKind | null;
  scheduledAt: number | null;
  orderType: OrderType;
  agreedPriceMinor: number | null;
  totalPriceMinor: number | null;
  etaMinutes: number | null;
  submittedAt: number | null;
  updatedAt: number;
  selectedAt: number | null;
  clientId: string;
  clientName: string;
  clientEmail: string;
  masterId: string | null;
  masterName: string | null;
  masterPhone: string | null;
  avatarId: string | null;
  masterRatingX100: number | null;
  masterReviewsCount: number | null;
};

const detailsSelect = `
  SELECT
    orders.id,
    orders.status,
    orders.description,
    service_categories.name AS categoryName,
    service_categories.slug AS categorySlug,
    service_subcategories.name AS subcategoryName,
    orders.address_city AS city,
    orders.address_street AS street,
    orders.address_house AS house,
    orders.address_apartment AS apartment,
    orders.address_comment AS addressComment,
    orders.schedule_kind AS scheduleKind,
    orders.scheduled_at AS scheduledAt,
    orders.order_type AS orderType,
    orders.agreed_price_minor AS agreedPriceMinor,
    orders.total_price_minor AS totalPriceMinor,
    master_offers.eta_minutes AS etaMinutes,
    orders.submitted_at AS submittedAt,
    orders.updated_at AS updatedAt,
    orders.master_selected_at AS selectedAt,
    orders.client_id AS clientId,
    client.name AS clientName,
    client.email AS clientEmail,
    orders.selected_master_id AS masterId,
    master.name AS masterName,
    master_profiles.phone AS masterPhone,
    (
      SELECT id FROM master_media
      WHERE master_media.master_id = orders.selected_master_id
        AND master_media.kind = 'AVATAR'
      ORDER BY master_media.created_at DESC LIMIT 1
    ) AS avatarId,
    master_profiles.rating_x100 AS masterRatingX100,
    master_profiles.reviews_count AS masterReviewsCount
  FROM orders
  INNER JOIN users AS client ON client.id = orders.client_id
  LEFT JOIN users AS master ON master.id = orders.selected_master_id
  LEFT JOIN master_profiles ON master_profiles.master_id = orders.selected_master_id
  LEFT JOIN master_offers ON master_offers.id = orders.selected_offer_id
  LEFT JOIN service_categories ON service_categories.id = orders.category_id
  LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id`;

function loadDetails(row: DetailsRow): OrderDetails {
  const database = getDb();
  const photos = database
    .prepare(
      `SELECT id, file_name AS fileName
      FROM order_media WHERE order_id = ? ORDER BY created_at`,
    )
    .all(row.id) as Array<{ id: string; fileName: string }>;
  const history = database
    .prepare(
      `SELECT
        order_status_history.id,
        order_status_history.from_status AS fromStatus,
        order_status_history.to_status AS toStatus,
        order_status_history.actor_role AS actorRole,
        COALESCE(users.name, '') AS actorName,
        COALESCE(order_status_history.reason, '') AS reason,
        order_status_history.created_at AS createdAt
      FROM order_status_history
      LEFT JOIN users ON users.id = order_status_history.actor_user_id
      WHERE order_status_history.order_id = ?
      ORDER BY order_status_history.created_at, order_status_history.id`,
    )
    .all(row.id) as OrderHistoryEntry[];
  const reviews = database
    .prepare(
      `SELECT
        order_reviews.id,
        order_reviews.reviewer_id AS reviewerId,
        users.name AS reviewerName,
        order_reviews.reviewer_role AS reviewerRole,
        order_reviews.overall_rating AS overallRating,
        order_reviews.quality_rating AS qualityRating,
        order_reviews.punctuality_rating AS punctualityRating,
        order_reviews.communication_rating AS communicationRating,
        order_reviews.agreement_rating AS agreementRating,
        COALESCE(order_reviews.comment, '') AS comment,
        order_reviews.created_at AS createdAt
      FROM order_reviews
      INNER JOIN users ON users.id = order_reviews.reviewer_id
      WHERE order_reviews.order_id = ?
      ORDER BY order_reviews.created_at`,
    )
    .all(row.id) as OrderReviewDetails[];

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
    addressComment: row.addressComment ?? "",
    scheduleKind: row.scheduleKind ?? "NOW",
    scheduledAt: row.scheduledAt,
    orderType: row.orderType,
    agreedPriceRubles: (row.agreedPriceMinor ?? row.totalPriceMinor ?? 0) / 100,
    etaMinutes: row.etaMinutes,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    selectedAt: row.selectedAt,
    photos: photos.map((photo) => ({ ...photo, url: `/api/order-media/${photo.id}` })),
    client: { id: row.clientId, name: row.clientName, email: row.clientEmail },
    master: row.masterId && row.masterName
      ? {
          id: row.masterId,
          name: row.masterName,
          phone: row.masterPhone ?? "",
          avatarUrl: row.avatarId ? `/api/master-media/${row.avatarId}` : null,
          specialization: specialistLabel(row.categorySlug ?? "", row.categoryName ?? "Мастер"),
          rating: row.masterRatingX100 ? row.masterRatingX100 / 100 : null,
          reviewsCount: row.masterReviewsCount ?? 0,
        }
      : null,
    history: history.length > 0
      ? history
      : [{
          id: `current-${row.id}`,
          fromStatus: null,
          toStatus: row.status,
          actorRole: "SYSTEM",
          actorName: "",
          reason: "",
          createdAt: row.updatedAt,
        }],
    reviews,
    changeRequests: listOrderChangeRequests(row.id),
    workPhotos: listOrderWorkMedia(row.id),
  };
}

export function getClientOrderDetails(clientId: string, orderId: string) {
  const row = getDb()
    .prepare(`${detailsSelect} WHERE orders.id = ? AND orders.client_id = ? AND orders.status != 'DRAFT'`)
    .get(orderId, clientId) as DetailsRow | undefined;
  return row ? loadDetails(row) : null;
}

export function getMasterOrderDetails(masterId: string, orderId: string) {
  const row = getDb()
    .prepare(
      `${detailsSelect}
      INNER JOIN order_assignments ON order_assignments.order_id = orders.id
      WHERE orders.id = ? AND order_assignments.master_id = ?`,
    )
    .get(orderId, masterId) as DetailsRow | undefined;
  return row ? loadDetails(row) : null;
}

type MasterSummaryRow = {
  id: string;
  status: OrderStatus;
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
};

export function listMasterOrders(masterId: string, limit = 50): OrderSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT
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
        COALESCE(orders.agreed_price_minor, orders.total_price_minor) AS totalPriceMinor,
        orders.submitted_at AS submittedAt,
        orders.updated_at AS updatedAt,
        COUNT(order_media.id) AS photoCount
      FROM orders
      INNER JOIN order_assignments ON order_assignments.order_id = orders.id
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      LEFT JOIN order_media ON order_media.order_id = orders.id
      WHERE order_assignments.master_id = ?
      GROUP BY orders.id
      ORDER BY orders.updated_at DESC
      LIMIT ?`,
    )
    .all(masterId, limit) as MasterSummaryRow[];

  return rows.map((row) => ({
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
  }));
}

export type OrderHistoryTab = "ACTIVE" | "PLANNED" | "COMPLETED" | "CANCELLED";

const completedStatuses: OrderStatus[] = ["COMPLETED", "REVIEWED"];
const cancelledStatuses: OrderStatus[] = [
  "CANCELLED_BY_CLIENT",
  "CANCELLED_BY_MASTER",
  "CANCELLED",
];
const plannedStatuses: OrderStatus[] = ["MASTER_SELECTED", "MASTER_CONFIRMED"];

export function classifyOrderForHistory(
  order: Pick<OrderSummary, "status" | "scheduledAt">,
  now = Date.now(),
): OrderHistoryTab {
  if (completedStatuses.includes(order.status)) return "COMPLETED";
  if (cancelledStatuses.includes(order.status)) return "CANCELLED";
  if (order.scheduledAt && order.scheduledAt > now && plannedStatuses.includes(order.status)) {
    return "PLANNED";
  }
  return "ACTIVE";
}
