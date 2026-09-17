import { randomUUID } from "node:crypto";

import { deleteUserSessions } from "@/lib/auth/repository";
import { getDb } from "@/lib/db";

import type {
  AdminCategory,
  AdminComplaint,
  AdminComplaintCase,
  AdminDashboardData,
  AdminMaster,
  AdminOrder,
  AdminUser,
} from "./types";

type AdminComplaintCaseRow = {
  id: string;
  orderId: string;
  status: AdminComplaintCase["status"];
  kind: AdminComplaintCase["kind"];
  subject: string;
  description: string;
  resolution: string;
  createdAt: number;
  resolvedAt: number | null;
  reporterId: string;
  reporterName: string;
  againstId: string | null;
  againstName: string;
  resolvedByName: string | null;
  orderStatus: AdminComplaintCase["order"]["status"];
  orderDescription: string | null;
  priceMinor: number;
  categoryName: string | null;
  clientName: string;
  clientEmail: string;
  masterName: string | null;
  masterEmail: string | null;
};

function assertAdmin(adminId: string) {
  const role = getDb()
    .prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'ADMIN'")
    .get(adminId);
  if (!role) throw new Error("ADMIN_ACCESS_REQUIRED");
}

function audit(adminId: string, action: string, entityType: string, entityId: string, metadata?: object) {
  getDb()
    .prepare(
      `INSERT INTO admin_audit_log (
        id, admin_id, action, entity_type, entity_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), adminId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null, Date.now());
}

export function getAdminDashboardData(): AdminDashboardData {
  const row = getDb()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM user_roles WHERE role = 'MASTER') AS masters,
        (SELECT COUNT(*) FROM users WHERE is_blocked = 1) AS blockedUsers,
        (SELECT COUNT(*) FROM master_verification_applications WHERE status = 'PENDING') AS pendingVerifications,
        (SELECT COUNT(*) FROM orders WHERE status IN (
          'SEARCHING_MASTERS', 'OFFERS_RECEIVED', 'MASTER_SELECTED', 'MASTER_CONFIRMED',
          'MASTER_ON_THE_WAY', 'MASTER_ARRIVED', 'IN_PROGRESS', 'COMPLETED_BY_MASTER'
        )) AS activeOrders,
        (SELECT COUNT(*) FROM complaints WHERE status IN ('OPEN', 'IN_REVIEW')) AS openComplaints`,
    )
    .get() as AdminDashboardData;
  return row;
}

export function listAdminUsers() {
  const rows = getDb()
    .prepare(
      `SELECT users.id, users.name, users.email, user_roles.role,
        users.is_blocked AS isBlocked, users.created_at AS createdAt,
        CASE user_roles.role
          WHEN 'CLIENT' THEN (SELECT COUNT(*) FROM orders WHERE orders.client_id = users.id)
          WHEN 'MASTER' THEN (SELECT COUNT(*) FROM order_assignments WHERE order_assignments.master_id = users.id)
          ELSE 0
        END AS orderCount
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id AND user_roles.is_primary = 1
      ORDER BY users.created_at DESC`,
    )
    .all() as Array<Omit<AdminUser, "isBlocked"> & { isBlocked: number }>;
  return rows.map((row) => ({ ...row, isBlocked: row.isBlocked === 1 }));
}

export function listAdminMasters() {
  const rows = getDb()
    .prepare(
      `SELECT users.id, users.name, users.email,
        COALESCE(master_profiles.verification_status, 'NOT_STARTED') AS verificationStatus,
        COALESCE(master_profiles.is_online, 0) AS isOnline,
        users.is_blocked AS isBlocked,
        COALESCE(master_profiles.rating_x100, 0) AS ratingX100,
        COALESCE(master_profiles.reviews_count, 0) AS reviewsCount,
        COALESCE(master_profiles.completed_jobs, 0) AS completedJobs,
        COALESCE(GROUP_CONCAT(service_categories.name, ', '), '') AS categories
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id AND user_roles.role = 'MASTER'
      LEFT JOIN master_profiles ON master_profiles.master_id = users.id
      LEFT JOIN master_categories ON master_categories.master_id = users.id
      LEFT JOIN service_categories ON service_categories.id = master_categories.category_id
      GROUP BY users.id
      ORDER BY users.created_at DESC`,
    )
    .all() as Array<Omit<AdminMaster, "isOnline" | "isBlocked" | "rating"> & {
      isOnline: number;
      isBlocked: number;
      ratingX100: number;
    }>;
  return rows.map(({ ratingX100, ...row }) => ({
    ...row,
    isOnline: row.isOnline === 1,
    isBlocked: row.isBlocked === 1,
    rating: ratingX100 > 0 ? ratingX100 / 100 : null,
  }));
}

export function setUserBlocked(input: {
  adminId: string;
  userId: string;
  blocked: boolean;
  reason?: string;
}) {
  const database = getDb();
  return database.transaction(() => {
    assertAdmin(input.adminId);
    const target = database
      .prepare(
        `SELECT users.id, users.is_blocked AS isBlocked, user_roles.role
        FROM users INNER JOIN user_roles ON user_roles.user_id = users.id AND user_roles.is_primary = 1
        WHERE users.id = ?`,
      )
      .get(input.userId) as { id: string; isBlocked: number; role: string } | undefined;
    if (!target) throw new Error("USER_NOT_FOUND");
    if (target.role === "ADMIN") throw new Error("ADMIN_BLOCK_FORBIDDEN");
    if (input.adminId === input.userId) throw new Error("SELF_BLOCK_FORBIDDEN");
    const next = input.blocked ? 1 : 0;
    if (target.isBlocked === next) return false;
    const now = Date.now();
    const updated = database
      .prepare(
        `UPDATE users SET is_blocked = ?, blocked_at = ?, blocked_by = ?, block_reason = ?, updated_at = ?
        WHERE id = ? AND is_blocked = ?`,
      )
      .run(
        next,
        input.blocked ? now : null,
        input.blocked ? input.adminId : null,
        input.blocked ? input.reason?.trim() || "Заблокирован администратором" : null,
        now,
        input.userId,
        target.isBlocked,
      );
    if (updated.changes !== 1) throw new Error("USER_UPDATE_CONFLICT");
    database
      .prepare(
        `UPDATE master_profiles
        SET is_blocked = ?, is_online = CASE WHEN ? = 1 THEN 0 ELSE is_online END, updated_at = ?
        WHERE master_id = ?`,
      )
      .run(next, next, now, input.userId);
    if (input.blocked) deleteUserSessions(input.userId);
    audit(input.adminId, input.blocked ? "USER_BLOCKED" : "USER_UNBLOCKED", "USER", input.userId, {
      reason: input.reason?.trim() || null,
    });
    return true;
  })();
}

export function listAdminOrders() {
  return getDb()
    .prepare(
      `SELECT orders.id, orders.status, orders.order_type AS orderType,
        COALESCE(orders.description, '') AS description,
        COALESCE(service_categories.name, 'Без категории') AS categoryName,
        client.name AS clientName, COALESCE(master.name, '') AS masterName,
        COALESCE(orders.agreed_price_minor, orders.total_price_minor, 0) / 100.0 AS priceRubles,
        orders.created_at AS createdAt
      FROM orders
      INNER JOIN users AS client ON client.id = orders.client_id
      LEFT JOIN users AS master ON master.id = orders.selected_master_id
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      WHERE orders.status != 'DRAFT'
      ORDER BY orders.updated_at DESC LIMIT 200`,
    )
    .all() as AdminOrder[];
}

export function listAdminCategories() {
  const rows = getDb()
    .prepare(
      `SELECT service_categories.id, service_categories.slug, service_categories.name,
        service_categories.sort_order AS sortOrder, service_categories.is_active AS isActive,
        (SELECT COUNT(*) FROM service_subcategories WHERE category_id = service_categories.id) AS subcategoryCount,
        (SELECT COUNT(*) FROM orders WHERE category_id = service_categories.id) AS orderCount
      FROM service_categories
      ORDER BY service_categories.sort_order, service_categories.name`,
    )
    .all() as Array<Omit<AdminCategory, "isActive"> & { isActive: number }>;
  return rows.map((row) => ({ ...row, isActive: row.isActive === 1 }));
}

export function createAdminCategory(adminId: string, name: string) {
  assertAdmin(adminId);
  const database = getDb();
  const id = randomUUID();
  const slug = `custom-${id.slice(0, 8)}`;
  const order = database.prepare("SELECT COALESCE(MAX(sort_order), 0) + 10 AS value FROM service_categories").get() as { value: number };
  database
    .prepare("INSERT INTO service_categories (id, slug, name, sort_order, is_active) VALUES (?, ?, ?, ?, 1)")
    .run(id, slug, name.trim(), order.value);
  audit(adminId, "CATEGORY_CREATED", "CATEGORY", id, { name: name.trim() });
  return id;
}

export function updateAdminCategory(adminId: string, categoryId: string, name: string) {
  assertAdmin(adminId);
  const updated = getDb()
    .prepare("UPDATE service_categories SET name = ? WHERE id = ?")
    .run(name.trim(), categoryId);
  if (updated.changes !== 1) throw new Error("CATEGORY_NOT_FOUND");
  audit(adminId, "CATEGORY_UPDATED", "CATEGORY", categoryId, { name: name.trim() });
}

export function setAdminCategoryActive(adminId: string, categoryId: string, isActive: boolean) {
  assertAdmin(adminId);
  const updated = getDb()
    .prepare("UPDATE service_categories SET is_active = ? WHERE id = ?")
    .run(isActive ? 1 : 0, categoryId);
  if (updated.changes !== 1) throw new Error("CATEGORY_NOT_FOUND");
  audit(adminId, isActive ? "CATEGORY_ENABLED" : "CATEGORY_DISABLED", "CATEGORY", categoryId);
}

export function getAdminComplaintCase(complaintId: string): AdminComplaintCase | undefined {
  const row = getDb()
    .prepare(
      `SELECT
        complaints.id, complaints.order_id AS orderId, complaints.status, complaints.kind,
        complaints.subject, COALESCE(complaints.description, '') AS description,
        COALESCE(complaints.resolution, '') AS resolution,
        complaints.created_at AS createdAt, complaints.resolved_at AS resolvedAt,
        reporter.id AS reporterId, reporter.name AS reporterName,
        against_user.id AS againstId, COALESCE(against_user.name, '') AS againstName,
        resolver.name AS resolvedByName,
        orders.status AS orderStatus, orders.description AS orderDescription,
        COALESCE(orders.agreed_price_minor, orders.total_price_minor, 0) AS priceMinor,
        service_categories.name AS categoryName,
        client.name AS clientName, client.email AS clientEmail,
        master.name AS masterName, master.email AS masterEmail
      FROM complaints
      INNER JOIN users AS reporter ON reporter.id = complaints.reporter_id
      LEFT JOIN users AS against_user ON against_user.id = complaints.against_user_id
      LEFT JOIN users AS resolver ON resolver.id = complaints.resolved_by
      INNER JOIN orders ON orders.id = complaints.order_id
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      INNER JOIN users AS client ON client.id = orders.client_id
      LEFT JOIN users AS master ON master.id = orders.selected_master_id
      WHERE complaints.id = ?`,
    )
    .get(complaintId) as AdminComplaintCaseRow | undefined;
  if (!row) return undefined;

  return {
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    kind: row.kind,
    subject: row.subject,
    description: row.description,
    resolution: row.resolution,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedByName: row.resolvedByName,
    reporterId: row.reporterId,
    reporterName: row.reporterName,
    againstId: row.againstId,
    againstName: row.againstName,
    order: {
      status: row.orderStatus,
      description: row.orderDescription ?? "",
      categoryName: row.categoryName ?? "Без категории",
      priceRubles: row.priceMinor / 100,
      client: { name: row.clientName, email: row.clientEmail },
      master: row.masterName ? { name: row.masterName, email: row.masterEmail ?? "" } : null,
    },
  };
}

export function resolveComplaint(input: {
  adminId: string;
  complaintId: string;
  status: "IN_REVIEW" | "RESOLVED" | "REJECTED";
  resolution?: string;
}) {
  assertAdmin(input.adminId);
  const now = Date.now();
  const isFinal = input.status === "RESOLVED" || input.status === "REJECTED";

  const updated = getDb()
    .prepare(
      `UPDATE complaints
      SET status = ?, resolution = ?, resolved_at = ?, resolved_by = ?
      WHERE id = ? AND status IN ('OPEN', 'IN_REVIEW')`,
    )
    .run(
      input.status,
      input.resolution?.trim() || null,
      isFinal ? now : null,
      isFinal ? input.adminId : null,
      input.complaintId,
    );
  if (updated.changes !== 1) throw new Error("COMPLAINT_NOT_ACTIONABLE");

  audit(input.adminId, `COMPLAINT_${input.status}`, "COMPLAINT", input.complaintId, { resolution: input.resolution });
}

export function listAdminComplaints() {
  return getDb()
    .prepare(
      `SELECT complaints.id, complaints.order_id AS orderId, complaints.status, complaints.kind,
        complaints.subject, COALESCE(complaints.description, '') AS description,
        reporter.name AS reporterName, COALESCE(against_user.name, '') AS againstName,
        complaints.created_at AS createdAt
      FROM complaints
      INNER JOIN users AS reporter ON reporter.id = complaints.reporter_id
      LEFT JOIN users AS against_user ON against_user.id = complaints.against_user_id
      ORDER BY CASE complaints.status WHEN 'OPEN' THEN 1 WHEN 'IN_REVIEW' THEN 2 ELSE 3 END,
        complaints.created_at DESC`,
    )
    .all() as AdminComplaint[];
}
