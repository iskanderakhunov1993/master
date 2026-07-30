import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import { appendAnalyticsEvent } from "@/lib/analytics/events";

export type ClientWarranty = {
  id: string;
  orderId: string;
  masterName: string;
  categoryName: string;
  description: string;
  priceRubles: number;
  durationDays: number;
  terms: string;
  startsAt: number;
  endsAt: number;
  status: "ACTIVE" | "CLAIMED" | "EXPIRED" | "VOID";
  claimStatus: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED" | null;
};

export function createWarrantyForCompletedOrder(
  database: Database.Database,
  orderId: string,
  completedAt: number,
) {
  const order = database.prepare(
    `SELECT client_id AS clientId, selected_master_id AS masterId,
      COALESCE(agreed_price_minor, total_price_minor, 0) AS priceMinor
    FROM orders WHERE id = ?`,
  ).get(orderId) as { clientId: string; masterId: string | null; priceMinor: number } | undefined;
  if (!order?.masterId) throw new Error("WARRANTY_ORDER_INVALID");
  const durationDays = order.priceMinor <= 1_500_000 ? 30 : 60;
  const endsAt = completedAt + durationDays * 24 * 60 * 60 * 1000;
  database.prepare(
    `INSERT OR IGNORE INTO warranties (
      id, order_id, master_id, client_id, duration_days, terms,
      starts_at, ends_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
  ).run(
    randomUUID(),
    orderId,
    order.masterId,
    order.clientId,
    durationDays,
    "Мастер бесплатно устраняет недостатки своей работы в пределах согласованной услуги. Материалы и новые работы согласуются отдельно.",
    completedAt,
    endsAt,
    completedAt,
  );
  appendAnalyticsEvent(database, { name: "warranty_activated", actorRole: "SYSTEM", orderId, properties: { durationDays }, occurredAt: completedAt });
}

export function listClientWarranties(clientId: string, now = Date.now()): ClientWarranty[] {
  const rows = getDb().prepare(
    `SELECT warranties.id, warranties.order_id AS orderId, master.name AS masterName,
      COALESCE(service_categories.name, 'Работа по дому') AS categoryName,
      COALESCE(orders.description, '') AS description,
      COALESCE(orders.agreed_price_minor, orders.total_price_minor, 0) / 100.0 AS priceRubles,
      warranties.duration_days AS durationDays, warranties.terms,
      warranties.starts_at AS startsAt, warranties.ends_at AS endsAt, warranties.status,
      (
        SELECT status FROM warranty_claims
        WHERE warranty_claims.warranty_id = warranties.id
        ORDER BY warranty_claims.created_at DESC LIMIT 1
      ) AS claimStatus
    FROM warranties
    INNER JOIN orders ON orders.id = warranties.order_id
    INNER JOIN users AS master ON master.id = warranties.master_id
    LEFT JOIN service_categories ON service_categories.id = orders.category_id
    WHERE warranties.client_id = ?
    ORDER BY warranties.ends_at DESC`,
  ).all(clientId) as Array<Omit<ClientWarranty, "status"> & { status: ClientWarranty["status"] }>;
  return rows.map((row) => ({
    ...row,
    status: row.status === "ACTIVE" && row.endsAt <= now ? "EXPIRED" : row.status,
  }));
}

export function openWarrantyClaim(input: {
  clientId: string;
  warrantyId: string;
  description: string;
  evidence: {
    fileName: string;
    mimeType: string;
    byteSize: number;
    content: Buffer;
  };
  now?: number;
}) {
  const database = getDb();
  return database.transaction(() => {
    const now = input.now ?? Date.now();
    const warranty = database.prepare(
      `SELECT id, client_id AS clientId, ends_at AS endsAt, status
      FROM warranties WHERE id = ?`,
    ).get(input.warrantyId) as { id: string; clientId: string; endsAt: number; status: string } | undefined;
    if (!warranty) throw new Error("WARRANTY_NOT_FOUND");
    if (warranty.clientId !== input.clientId) throw new Error("WARRANTY_ACCESS_DENIED");
    if (warranty.endsAt <= now || warranty.status === "EXPIRED") throw new Error("WARRANTY_EXPIRED");
    if (warranty.status !== "ACTIVE") throw new Error("WARRANTY_CLAIM_EXISTS");
    const claimId = randomUUID();
    database.prepare(
      `INSERT INTO warranty_claims (
        id, warranty_id, client_id, description, status, created_at
      ) VALUES (?, ?, ?, ?, 'OPEN', ?)`,
    ).run(claimId, warranty.id, input.clientId, input.description, now);
    database.prepare(
      `INSERT INTO warranty_claim_evidence (
        id, claim_id, uploader_id, file_name, mime_type, byte_size, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(), claimId, input.clientId, input.evidence.fileName,
      input.evidence.mimeType, input.evidence.byteSize, input.evidence.content, now,
    );
    database.prepare("UPDATE warranties SET status = 'CLAIMED' WHERE id = ? AND status = 'ACTIVE'").run(warranty.id);
    const order = database.prepare("SELECT order_id AS orderId FROM warranties WHERE id = ?").get(warranty.id) as { orderId: string };
    appendAnalyticsEvent(database, { name: "warranty_claim_opened", actorId: input.clientId, actorRole: "CLIENT", orderId: order.orderId, occurredAt: now });
    return claimId;
  })();
}

export function getWarrantyClaimEvidence(userId: string, role: "CLIENT" | "ADMIN", evidenceId: string) {
  return getDb().prepare(
    `SELECT warranty_claim_evidence.mime_type AS mimeType,
      warranty_claim_evidence.byte_size AS byteSize, warranty_claim_evidence.content
    FROM warranty_claim_evidence
    INNER JOIN warranty_claims ON warranty_claims.id = warranty_claim_evidence.claim_id
    INNER JOIN warranties ON warranties.id = warranty_claims.warranty_id
    WHERE warranty_claim_evidence.id = ? AND (? = 'ADMIN' OR warranties.client_id = ?)`,
  ).get(evidenceId, role, userId) as { mimeType: string; byteSize: number; content: Buffer } | undefined;
}
