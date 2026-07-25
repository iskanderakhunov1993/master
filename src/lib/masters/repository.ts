import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { listMatchedOrdersForMaster, matchOpenOrdersForMaster } from "@/lib/marketplace/matching";
import { expireOffers } from "@/lib/marketplace/offers";
import type { OrderStatus, OrderType, ScheduleKind } from "@/lib/orders/types";

import { MAX_MASTER_PORTFOLIO_ITEMS } from "./media";
import { calculateReliability } from "./reliability";
import type {
  MasterCategory,
  MasterDashboardData,
  MasterMedia,
  MasterMediaKind,
  MasterOrderCard,
  MasterProfile,
  MasterProfileData,
  MasterReview,
  MasterWorkHistoryItem,
  ServiceArea,
  VerificationApplication,
  VerificationStatus,
} from "./types";

type ProfileRow = {
  masterId: string;
  name: string;
  email: string;
  phone: string | null;
  experienceYears: number;
  bio: string | null;
  verificationStatus: VerificationStatus;
  verificationRejectionReason: string | null;
  isOnline: number;
  onboardingStep: number;
  onboardingCompleted: number;
  completedJobs: number;
  ratingX100: number;
  reviewsCount: number;
  masterCancellations: number;
  noShows: number;
  lateArrivals: number;
  confirmedCompletions: number;
};

type MediaRow = {
  id: string;
  kind: MasterMediaKind;
  fileName: string;
  byteSize: number;
};

type OrderCardRow = {
  id: string;
  status: MasterOrderCard["status"];
  description: string;
  categoryName: string;
  subcategoryName: string | null;
  city: string;
  locationLabel: string;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  totalPriceMinor: number;
  apartment: string | null;
  addressComment: string | null;
};

const profileSelect = `
  SELECT
    master_profiles.master_id AS masterId,
    users.name,
    users.email,
    master_profiles.phone,
    master_profiles.experience_years AS experienceYears,
    master_profiles.bio,
    master_profiles.verification_status AS verificationStatus,
    master_profiles.verification_rejection_reason AS verificationRejectionReason,
    master_profiles.is_online AS isOnline,
    master_profiles.onboarding_step AS onboardingStep,
    master_profiles.onboarding_completed AS onboardingCompleted,
    master_profiles.completed_jobs AS completedJobs,
    master_profiles.rating_x100 AS ratingX100,
    master_profiles.reviews_count AS reviewsCount,
    master_profiles.master_cancellations AS masterCancellations,
    master_profiles.no_shows AS noShows,
    master_profiles.late_arrivals AS lateArrivals,
    master_profiles.confirmed_completions AS confirmedCompletions
  FROM master_profiles
  INNER JOIN users ON users.id = master_profiles.master_id`;

function mediaUrl(mediaId: string) {
  return `/api/master-media/${mediaId}`;
}

function mapMedia(row: MediaRow): MasterMedia {
  return { ...row, url: mediaUrl(row.id) };
}

function mapOrderCard(row: OrderCardRow): MasterOrderCard {
  return {
    ...row,
    subcategoryName: row.subcategoryName ?? "",
    totalPriceRubles: row.totalPriceMinor / 100,
    apartment: row.apartment ?? "",
    addressComment: row.addressComment ?? "",
  };
}

export function ensureMasterProfile(masterId: string) {
  const database = getDb();
  const now = Date.now();
  database
    .prepare(
      `INSERT OR IGNORE INTO master_profiles (master_id, created_at, updated_at)
      SELECT users.id, ?, ?
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id
      WHERE users.id = ? AND user_roles.role = 'MASTER'`,
    )
    .run(now, now, masterId);

  const exists = database
    .prepare("SELECT 1 FROM master_profiles WHERE master_id = ?")
    .get(masterId);
  if (!exists) throw new Error("MASTER_PROFILE_NOT_FOUND");
}

export function listMasterCategoryOptions() {
  return getDb()
    .prepare(
      `SELECT id, slug, name
      FROM service_categories
      WHERE is_active = 1
      ORDER BY sort_order, name`,
    )
    .all() as MasterCategory[];
}

export function listServiceAreaOptions() {
  return getDb()
    .prepare(
      `SELECT id, city, name
      FROM service_areas
      WHERE is_active = 1
      ORDER BY city, sort_order, name`,
    )
    .all() as ServiceArea[];
}

function listMasterCategories(masterId: string) {
  return getDb()
    .prepare(
      `SELECT service_categories.id, service_categories.slug, service_categories.name
      FROM master_categories
      INNER JOIN service_categories ON service_categories.id = master_categories.category_id
      WHERE master_categories.master_id = ?
      ORDER BY service_categories.sort_order, service_categories.name`,
    )
    .all(masterId) as MasterCategory[];
}

function listMasterServiceAreas(masterId: string) {
  return getDb()
    .prepare(
      `SELECT service_areas.id, service_areas.city, service_areas.name
      FROM master_service_areas
      INNER JOIN service_areas ON service_areas.id = master_service_areas.service_area_id
      WHERE master_service_areas.master_id = ?
      ORDER BY service_areas.city, service_areas.sort_order, service_areas.name`,
    )
    .all(masterId) as ServiceArea[];
}

export function listMasterMedia(masterId: string, kind: MasterMediaKind) {
  const rows = getDb()
    .prepare(
      `SELECT id, kind, file_name AS fileName, byte_size AS byteSize
      FROM master_media
      WHERE master_id = ? AND kind = ?
      ORDER BY created_at DESC`,
    )
    .all(masterId, kind) as MediaRow[];
  return rows.map(mapMedia);
}

function mapProfile(row: ProfileRow): MasterProfile {
  const reliability = calculateReliability({
    completedJobs: row.completedJobs,
    masterCancellations: row.masterCancellations,
    noShows: row.noShows,
    lateArrivals: row.lateArrivals,
    confirmedCompletions: row.confirmedCompletions,
  });

  return {
    masterId: row.masterId,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    experienceYears: row.experienceYears,
    bio: row.bio ?? "",
    verificationStatus: row.verificationStatus,
    verificationRejectionReason: row.verificationRejectionReason ?? "",
    isOnline: row.isOnline === 1,
    onboardingStep: row.onboardingStep,
    onboardingCompleted: row.onboardingCompleted === 1,
    categories: listMasterCategories(row.masterId),
    serviceAreas: listMasterServiceAreas(row.masterId),
    avatar: listMasterMedia(row.masterId, "AVATAR")[0] ?? null,
    portfolio: listMasterMedia(row.masterId, "PORTFOLIO"),
    statistics: {
      completedJobs: row.completedJobs,
      rating: row.ratingX100 > 0 ? row.ratingX100 / 100 : null,
      reviewsCount: row.reviewsCount,
      masterCancellations: row.masterCancellations,
      noShows: row.noShows,
      lateArrivals: row.lateArrivals,
      confirmedCompletions: row.confirmedCompletions,
      reliability,
    },
  };
}

export function getMasterProfile(masterId: string) {
  ensureMasterProfile(masterId);
  const row = getDb()
    .prepare(`${profileSelect} WHERE master_profiles.master_id = ?`)
    .get(masterId) as ProfileRow;
  return mapProfile(row);
}

export function getMasterProfileData(masterId: string): MasterProfileData {
  const profile = getMasterProfile(masterId);
  const reviews = getDb()
    .prepare(
      `SELECT id, client_name AS clientName, rating, body,
        COALESCE(quality_rating, rating) AS qualityRating,
        COALESCE(punctuality_rating, rating) AS punctualityRating,
        COALESCE(communication_rating, rating) AS communicationRating,
        COALESCE(agreement_rating, rating) AS agreementRating,
        created_at AS createdAt
      FROM master_reviews
      WHERE master_id = ? AND is_published = 1
      ORDER BY created_at DESC`,
    )
    .all(masterId) as MasterReview[];
  const workHistory = getDb()
    .prepare(
      `SELECT id, title, description, completed_at AS completedAt
      FROM master_work_history
      WHERE master_id = ?
      ORDER BY completed_at DESC`,
    )
    .all(masterId) as MasterWorkHistoryItem[];
  const categoryStats = getDb()
    .prepare(
      `SELECT category_id AS categoryId, completed_jobs AS completedJobs
      FROM master_category_stats
      WHERE master_id = ?`,
    )
    .all(masterId) as Array<{ categoryId: string; completedJobs: number }>;
  const reviewSummaryRow = getDb()
    .prepare(
      `SELECT
        AVG(COALESCE(quality_rating, rating)) AS quality,
        AVG(COALESCE(punctuality_rating, rating)) AS punctuality,
        AVG(COALESCE(communication_rating, rating)) AS communication,
        AVG(COALESCE(agreement_rating, rating)) AS agreement
      FROM master_reviews
      WHERE master_id = ? AND is_published = 1`,
    )
    .get(masterId) as {
      quality: number | null;
      punctuality: number | null;
      communication: number | null;
      agreement: number | null;
    };

  return {
    profile,
    categoryOptions: listMasterCategoryOptions(),
    areaOptions: listServiceAreaOptions(),
    reviews,
    workHistory,
    identityDocument: listMasterMedia(masterId, "IDENTITY")[0] ?? null,
    categoryStats,
    reviewSummary: reviewSummaryRow,
  };
}

export function getPublicMasterProfileData(masterId: string) {
  const data = getMasterProfileData(masterId);
  return data.profile.onboardingCompleted ? data : null;
}

export function saveMasterBasic(masterId: string, input: { name: string; phone: string }) {
  const database = getDb();
  ensureMasterProfile(masterId);
  database.transaction(() => {
    const now = Date.now();
    database.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(input.name, now, masterId);
    database
      .prepare(
        `UPDATE master_profiles
        SET phone = ?, onboarding_step = MAX(onboarding_step, 2), updated_at = ?
        WHERE master_id = ?`,
      )
      .run(input.phone, now, masterId);
  })();
}

function replaceMasterSelections(input: {
  masterId: string;
  table: "master_categories" | "master_service_areas";
  column: "category_id" | "service_area_id";
  sourceTable: "service_categories" | "service_areas";
  ids: string[];
  nextStep: number;
}) {
  const database = getDb();
  ensureMasterProfile(input.masterId);
  const ids = [...new Set(input.ids)];
  if (ids.length === 0) throw new Error("SELECTION_REQUIRED");
  const placeholders = ids.map(() => "?").join(", ");
  const validCount = (database
    .prepare(`SELECT COUNT(*) AS count FROM ${input.sourceTable} WHERE id IN (${placeholders}) AND is_active = 1`)
    .get(...ids) as { count: number }).count;
  if (validCount !== ids.length) throw new Error("SELECTION_INVALID");

  database.transaction(() => {
    const now = Date.now();
    database.prepare(`DELETE FROM ${input.table} WHERE master_id = ?`).run(input.masterId);
    const insert = database.prepare(
      `INSERT INTO ${input.table} (master_id, ${input.column}, created_at) VALUES (?, ?, ?)`,
    );
    for (const id of ids) insert.run(input.masterId, id, now);
    database
      .prepare(
        `UPDATE master_profiles
        SET onboarding_step = MAX(onboarding_step, ?), updated_at = ?
        WHERE master_id = ?`,
      )
      .run(input.nextStep, now, input.masterId);
  })();
}

export function saveMasterCategories(masterId: string, categoryIds: string[]) {
  replaceMasterSelections({
    masterId,
    table: "master_categories",
    column: "category_id",
    sourceTable: "service_categories",
    ids: categoryIds,
    nextStep: 4,
  });
}

export function saveMasterServiceAreas(masterId: string, areaIds: string[]) {
  replaceMasterSelections({
    masterId,
    table: "master_service_areas",
    column: "service_area_id",
    sourceTable: "service_areas",
    ids: areaIds,
    nextStep: 5,
  });
}

export function saveMasterExperience(masterId: string, input: { experienceYears: number; bio: string }) {
  ensureMasterProfile(masterId);
  getDb()
    .prepare(
      `UPDATE master_profiles
      SET experience_years = ?, bio = ?, onboarding_step = MAX(onboarding_step, 6), updated_at = ?
      WHERE master_id = ?`,
    )
    .run(input.experienceYears, input.bio, Date.now(), masterId);
}

export function saveMasterEditableProfile(input: {
  masterId: string;
  name: string;
  phone: string;
  experienceYears: number;
  bio: string;
  categoryIds: string[];
  areaIds: string[];
}) {
  return getDb().transaction(() => {
    saveMasterBasic(input.masterId, { name: input.name, phone: input.phone });
    saveMasterExperience(input.masterId, {
      experienceYears: input.experienceYears,
      bio: input.bio,
    });
    saveMasterCategories(input.masterId, input.categoryIds);
    saveMasterServiceAreas(input.masterId, input.areaIds);
  })();
}

export function setMasterOnboardingStep(masterId: string, step: number) {
  ensureMasterProfile(masterId);
  getDb()
    .prepare("UPDATE master_profiles SET onboarding_step = ?, updated_at = ? WHERE master_id = ?")
    .run(Math.min(6, Math.max(1, Math.floor(step))), Date.now(), masterId);
}

export function submitVerification(input: {
  masterId: string;
  legalName: string;
  documentLastFour: string;
  documentMediaId: string;
}) {
  const database = getDb();
  ensureMasterProfile(input.masterId);
  return database.transaction(() => {
    const profile = database
      .prepare("SELECT verification_status AS status FROM master_profiles WHERE master_id = ?")
      .get(input.masterId) as { status: VerificationStatus };
    if (profile.status === "PENDING") throw new Error("VERIFICATION_PENDING");
    if (profile.status === "VERIFIED") throw new Error("VERIFICATION_ALREADY_APPROVED");

    const media = database
      .prepare("SELECT id FROM master_media WHERE id = ? AND master_id = ? AND kind = 'IDENTITY'")
      .get(input.documentMediaId, input.masterId) as { id: string } | undefined;
    if (!media) throw new Error("IDENTITY_DOCUMENT_REQUIRED");

    const id = randomUUID();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO master_verification_applications (
          id, master_id, legal_name, document_type, document_last_four,
          document_media_id, status, submitted_at
        ) VALUES (?, ?, ?, 'PASSPORT', ?, ?, 'PENDING', ?)`,
      )
      .run(id, input.masterId, input.legalName, input.documentLastFour, media.id, now);
    database
      .prepare(
        `UPDATE master_profiles
        SET verification_status = 'PENDING', verification_rejection_reason = NULL,
            onboarding_step = MAX(onboarding_step, 3), updated_at = ?
        WHERE master_id = ?`,
      )
      .run(now, input.masterId);
    return id;
  })();
}

export function completeMasterOnboarding(masterId: string) {
  const database = getDb();
  const profile = getMasterProfile(masterId);
  if (!profile.name.trim() || !profile.phone) throw new Error("BASIC_DATA_REQUIRED");
  if (!profile.avatar) throw new Error("AVATAR_REQUIRED");
  if (profile.verificationStatus === "NOT_STARTED" || profile.verificationStatus === "REJECTED") {
    throw new Error("VERIFICATION_REQUIRED");
  }
  if (profile.categories.length === 0) throw new Error("CATEGORIES_REQUIRED");
  if (profile.serviceAreas.length === 0) throw new Error("AREAS_REQUIRED");
  if (!profile.bio.trim()) throw new Error("EXPERIENCE_REQUIRED");

  database
    .prepare(
      `UPDATE master_profiles
      SET onboarding_completed = 1, onboarding_step = 6, updated_at = ?
      WHERE master_id = ?`,
    )
    .run(Date.now(), masterId);
}

export function setMasterOnline(masterId: string, isOnline: boolean) {
  const profile = getMasterProfile(masterId);
  if (isOnline) {
    const blocked = getDb()
      .prepare(
        `SELECT master_profiles.is_blocked AS profileBlocked, users.is_blocked AS userBlocked
        FROM master_profiles INNER JOIN users ON users.id = master_profiles.master_id
        WHERE master_profiles.master_id = ?`,
      )
      .get(masterId) as { profileBlocked: number; userBlocked: number };
    if (blocked.profileBlocked === 1 || blocked.userBlocked === 1) throw new Error("MASTER_BLOCKED");
    if (!profile.onboardingCompleted) throw new Error("ONBOARDING_REQUIRED");
    if (profile.verificationStatus !== "VERIFIED") throw new Error("MASTER_NOT_VERIFIED");
    if (profile.categories.length === 0 || profile.serviceAreas.length === 0) {
      throw new Error("MATCHING_SETTINGS_REQUIRED");
    }
  }
  getDb()
    .prepare("UPDATE master_profiles SET is_online = ?, updated_at = ? WHERE master_id = ?")
    .run(isOnline ? 1 : 0, Date.now(), masterId);
  if (isOnline) matchOpenOrdersForMaster(masterId);
}

export function addMasterMedia(input: {
  masterId: string;
  kind: MasterMediaKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
  replaceId?: string;
}) {
  const database = getDb();
  ensureMasterProfile(input.masterId);
  return database.transaction(() => {
    let mediaId = input.replaceId;
    if (mediaId) {
      const existing = database
        .prepare("SELECT id FROM master_media WHERE id = ? AND master_id = ? AND kind = ?")
        .get(mediaId, input.masterId, input.kind) as { id: string } | undefined;
      if (!existing) throw new Error("MEDIA_NOT_FOUND");
    } else if (input.kind === "AVATAR") {
      mediaId = (database
        .prepare("SELECT id FROM master_media WHERE master_id = ? AND kind = 'AVATAR'")
        .get(input.masterId) as { id: string } | undefined)?.id;
    } else if (input.kind === "PORTFOLIO") {
      const count = (database
        .prepare("SELECT COUNT(*) AS count FROM master_media WHERE master_id = ? AND kind = 'PORTFOLIO'")
        .get(input.masterId) as { count: number }).count;
      if (count >= MAX_MASTER_PORTFOLIO_ITEMS) throw new Error("PORTFOLIO_LIMIT");
    }

    const now = Date.now();
    if (mediaId) {
      database
        .prepare(
          `UPDATE master_media
          SET file_name = ?, mime_type = ?, byte_size = ?, content = ?, created_at = ?
          WHERE id = ? AND master_id = ? AND kind = ?`,
        )
        .run(input.fileName, input.mimeType, input.byteSize, input.content, now, mediaId, input.masterId, input.kind);
    } else {
      mediaId = randomUUID();
      database
        .prepare(
          `INSERT INTO master_media (
            id, master_id, kind, file_name, mime_type, byte_size, content, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(mediaId, input.masterId, input.kind, input.fileName, input.mimeType, input.byteSize, input.content, now);
    }

    return {
      id: mediaId,
      kind: input.kind,
      fileName: input.fileName,
      byteSize: input.byteSize,
      url: `${mediaUrl(mediaId)}?v=${now}`,
    } satisfies MasterMedia;
  })();
}

export function deleteMasterMedia(masterId: string, mediaId: string, kind: MasterMediaKind) {
  ensureMasterProfile(masterId);
  if (kind === "IDENTITY") throw new Error("IDENTITY_DELETE_FORBIDDEN");
  return getDb()
    .prepare("DELETE FROM master_media WHERE id = ? AND master_id = ? AND kind = ?")
    .run(mediaId, masterId, kind).changes === 1;
}

export function getMasterMedia(mediaId: string) {
  return getDb()
    .prepare(
      `SELECT id, master_id AS masterId, kind, mime_type AS mimeType,
        byte_size AS byteSize, content
      FROM master_media
      WHERE id = ?`,
    )
    .get(mediaId) as {
      id: string;
      masterId: string;
      kind: MasterMediaKind;
      mimeType: string;
      byteSize: number;
      content: Buffer;
    } | undefined;
}

export function listPendingVerificationApplications() {
  return getDb()
    .prepare(
      `SELECT
        master_verification_applications.id,
        master_verification_applications.master_id AS masterId,
        users.name AS masterName,
        users.email AS masterEmail,
        master_verification_applications.legal_name AS legalName,
        master_verification_applications.document_type AS documentType,
        master_verification_applications.document_last_four AS documentLastFour,
        master_verification_applications.document_media_id AS documentMediaId,
        master_verification_applications.submitted_at AS submittedAt
      FROM master_verification_applications
      INNER JOIN users ON users.id = master_verification_applications.master_id
      WHERE master_verification_applications.status = 'PENDING'
      ORDER BY master_verification_applications.submitted_at`,
    )
    .all() as VerificationApplication[];
}

export function decideVerification(input: {
  applicationId: string;
  adminId: string;
  decision: "VERIFIED" | "REJECTED";
  rejectionReason?: string;
}) {
  const database = getDb();
  return database.transaction(() => {
    const admin = database
      .prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'ADMIN'")
      .get(input.adminId);
    if (!admin) throw new Error("ADMIN_ACCESS_REQUIRED");
    const application = database
      .prepare(
        `SELECT master_id AS masterId
        FROM master_verification_applications
        WHERE id = ? AND status = 'PENDING'`,
      )
      .get(input.applicationId) as { masterId: string } | undefined;
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    if (input.decision === "REJECTED" && !input.rejectionReason?.trim()) {
      throw new Error("REJECTION_REASON_REQUIRED");
    }

    const now = Date.now();
    database
      .prepare(
        `UPDATE master_verification_applications
        SET status = ?, rejection_reason = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ? AND status = 'PENDING'`,
      )
      .run(input.decision, input.rejectionReason?.trim() || null, now, input.adminId, input.applicationId);
    database
      .prepare(
        `UPDATE master_profiles
        SET verification_status = ?, verification_rejection_reason = ?, is_online = CASE WHEN ? = 'REJECTED' THEN 0 ELSE is_online END,
            updated_at = ?
        WHERE master_id = ?`,
      )
      .run(input.decision, input.rejectionReason?.trim() || null, input.decision, now, application.masterId);
    database
      .prepare(
        `INSERT INTO admin_audit_log (
          id, admin_id, action, entity_type, entity_id, metadata, created_at
        ) VALUES (?, ?, ?, 'VERIFICATION_APPLICATION', ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.adminId,
        input.decision === "VERIFIED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        input.applicationId,
        JSON.stringify({ masterId: application.masterId, reason: input.rejectionReason?.trim() || null }),
        now,
      );
  })();
}

function listAvailableOrders(masterId: string, enabled: boolean) {
  if (!enabled) return [];
  expireOffers();
  return listMatchedOrdersForMaster(masterId).slice(0, 4).map<MasterOrderCard>((order) => ({
    id: order.orderId,
    status: "SEARCHING_MASTERS",
    description: order.description,
    categoryName: order.categoryName,
    subcategoryName: order.subcategoryName,
    city: order.city,
    locationLabel: order.serviceAreaName,
    scheduleKind: order.scheduleKind,
    scheduledAt: order.scheduledAt,
    orderType: order.orderType,
    totalPriceRubles: order.clientPriceRubles,
    apartment: "",
    addressComment: "",
  }));
}

function listAssignedOrders(masterId: string) {
  const rows = getDb()
    .prepare(
      `SELECT
        orders.id,
        orders.status,
        orders.description,
        service_categories.name AS categoryName,
        service_subcategories.name AS subcategoryName,
        orders.address_city AS city,
        TRIM(orders.address_street || ', ' || orders.address_house) AS locationLabel,
        orders.schedule_kind AS scheduleKind,
        orders.scheduled_at AS scheduledAt,
        orders.order_type AS orderType,
        COALESCE(orders.agreed_price_minor, orders.total_price_minor) AS totalPriceMinor,
        orders.address_apartment AS apartment,
        orders.address_comment AS addressComment
      FROM orders
      INNER JOIN order_assignments ON order_assignments.order_id = orders.id
      INNER JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      WHERE order_assignments.master_id = ?
        AND orders.status IN (
          'MASTER_SELECTED', 'MASTER_CONFIRMED', 'ASSIGNED', 'EN_ROUTE',
          'MASTER_ON_THE_WAY', 'MASTER_ARRIVED', 'ARRIVED', 'IN_PROGRESS',
          'COMPLETED_BY_MASTER', 'AWAITING_CONFIRMATION'
        )
      ORDER BY CASE orders.status
        WHEN 'IN_PROGRESS' THEN 1
        WHEN 'MASTER_ARRIVED' THEN 2
        WHEN 'ARRIVED' THEN 2
        WHEN 'MASTER_ON_THE_WAY' THEN 3
        WHEN 'EN_ROUTE' THEN 3
        WHEN 'COMPLETED_BY_MASTER' THEN 4
        WHEN 'AWAITING_CONFIRMATION' THEN 4
        WHEN 'MASTER_SELECTED' THEN 5
        WHEN 'MASTER_CONFIRMED' THEN 6
        ELSE 7
      END, orders.scheduled_at`,
    )
    .all(masterId) as OrderCardRow[];
  return rows.map(mapOrderCard);
}

export function getMasterDashboardData(masterId: string): MasterDashboardData {
  const profile = getMasterProfile(masterId);
  const assignedOrders = listAssignedOrders(masterId);
  const now = Date.now();
  const startedStatuses: OrderStatus[] = [
    "MASTER_ON_THE_WAY", "MASTER_ARRIVED", "IN_PROGRESS",
    "COMPLETED_BY_MASTER", "EN_ROUTE", "ARRIVED", "AWAITING_CONFIRMATION",
  ];
  const activeOrder = assignedOrders.find((order) =>
    startedStatuses.includes(order.status)
    || !order.scheduledAt
    || order.scheduledAt <= now,
  ) ?? null;
  return {
    profile,
    availableOrders: listAvailableOrders(masterId, profile.isOnline),
    activeOrder,
    upcomingOrders: assignedOrders
      .filter((order) => order.id !== activeOrder?.id && order.scheduledAt && order.scheduledAt > now)
      .slice(0, 3),
  };
}
