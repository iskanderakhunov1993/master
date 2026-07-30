import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";

export type EvidenceStage = "BEFORE" | "PROCESS" | "AFTER";
export type ChangeRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export type OrderChangeRequest = {
  id: string;
  previousPriceRubles: number;
  proposedPriceRubles: number;
  reason: string;
  status: ChangeRequestStatus;
  createdAt: number;
  respondedAt: number | null;
};

export type OrderEvidence = {
  id: string;
  stage: EvidenceStage;
  fileName: string;
  url: string;
  createdAt: number;
};

export type OrderMessage = {
  id: string;
  senderId: string | null;
  senderRole: "CLIENT" | "MASTER" | "SYSTEM";
  senderName: string;
  kind: "TEXT" | "SYSTEM";
  body: string;
  createdAt: number;
};

type ParticipantOrder = {
  id: string;
  clientId: string;
  masterId: string | null;
  status: string;
  agreedPriceMinor: number | null;
  totalPriceMinor: number | null;
};

function getParticipantOrder(database: Database.Database, orderId: string) {
  return database.prepare(
    `SELECT id, client_id AS clientId, selected_master_id AS masterId, status,
      agreed_price_minor AS agreedPriceMinor, total_price_minor AS totalPriceMinor
    FROM orders WHERE id = ?`,
  ).get(orderId) as ParticipantOrder | undefined;
}

function requireParticipant(order: ParticipantOrder | undefined, actorId: string, role: "CLIENT" | "MASTER") {
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (role === "CLIENT" && order.clientId !== actorId) throw new Error("ORDER_ACCESS_DENIED");
  if (role === "MASTER" && order.masterId !== actorId) throw new Error("ORDER_ACCESS_DENIED");
  return order;
}

function recordEvent(
  database: Database.Database,
  eventName: string,
  actorId: string,
  actorRole: string,
  orderId: string,
  properties?: Record<string, unknown>,
) {
  database.prepare(
    `INSERT INTO analytics_events (
      id, event_name, actor_id, actor_role, order_id, properties_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), eventName, actorId, actorRole, orderId, properties ? JSON.stringify(properties) : null, Date.now());
}

function addSystemMessage(database: Database.Database, orderId: string, body: string, createdAt: number) {
  database.prepare(
    `INSERT INTO order_messages (id, order_id, sender_id, sender_role, kind, body, created_at)
    VALUES (?, ?, NULL, 'SYSTEM', 'SYSTEM', ?, ?)`,
  ).run(randomUUID(), orderId, body, createdAt);
}

export function createOrderChangeRequest(input: {
  orderId: string;
  masterId: string;
  proposedPriceRubles: number;
  reason: string;
}) {
  const database = getDb();
  return database.transaction(() => {
    const order = requireParticipant(getParticipantOrder(database, input.orderId), input.masterId, "MASTER");
    if (!["MASTER_ARRIVED", "IN_PROGRESS"].includes(order.status)) throw new Error("CHANGE_ORDER_STATUS_INVALID");
    const pending = database.prepare(
      "SELECT id FROM order_change_requests WHERE order_id = ? AND status = 'PENDING'",
    ).get(order.id);
    if (pending) throw new Error("CHANGE_ORDER_PENDING");
    const previousPriceMinor = order.agreedPriceMinor ?? order.totalPriceMinor ?? 0;
    const proposedPriceMinor = input.proposedPriceRubles * 100;
    if (previousPriceMinor <= 0 || proposedPriceMinor === previousPriceMinor) throw new Error("CHANGE_ORDER_PRICE_UNCHANGED");
    const id = randomUUID();
    const now = Date.now();
    database.prepare(
      `INSERT INTO order_change_requests (
        id, order_id, master_id, previous_price_minor, proposed_price_minor, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    ).run(id, order.id, input.masterId, previousPriceMinor, proposedPriceMinor, input.reason, now);
    addSystemMessage(database, order.id, `Мастер предложил изменить итоговую цену до ${input.proposedPriceRubles.toLocaleString("ru-RU")} ₽.`, now);
    recordEvent(database, "change_order_created", input.masterId, "MASTER", order.id, { previousPriceMinor, proposedPriceMinor });
    return id;
  })();
}

export function respondToOrderChangeRequest(input: {
  requestId: string;
  clientId: string;
  accept: boolean;
}) {
  const database = getDb();
  return database.transaction(() => {
    const request = database.prepare(
      `SELECT order_change_requests.id, order_change_requests.order_id AS orderId,
        order_change_requests.proposed_price_minor AS proposedPriceMinor,
        order_change_requests.status, orders.client_id AS clientId
      FROM order_change_requests
      INNER JOIN orders ON orders.id = order_change_requests.order_id
      WHERE order_change_requests.id = ?`,
    ).get(input.requestId) as { id: string; orderId: string; proposedPriceMinor: number; status: string; clientId: string } | undefined;
    if (!request) throw new Error("CHANGE_ORDER_NOT_FOUND");
    if (request.clientId !== input.clientId) throw new Error("ORDER_ACCESS_DENIED");
    if (request.status !== "PENDING") throw new Error("CHANGE_ORDER_ALREADY_RESPONDED");
    const now = Date.now();
    const status = input.accept ? "ACCEPTED" : "REJECTED";
    const updated = database.prepare(
      `UPDATE order_change_requests SET status = ?, responded_at = ?, responded_by = ?
      WHERE id = ? AND status = 'PENDING'`,
    ).run(status, now, input.clientId, request.id);
    if (updated.changes !== 1) throw new Error("CHANGE_ORDER_ALREADY_RESPONDED");
    if (input.accept) {
      database.prepare(
        "UPDATE orders SET agreed_price_minor = ?, updated_at = ?, version = version + 1 WHERE id = ?",
      ).run(request.proposedPriceMinor, now, request.orderId);
    }
    addSystemMessage(database, request.orderId, input.accept ? "Клиент согласовал новую итоговую цену." : "Клиент отклонил изменение цены.", now);
    recordEvent(database, input.accept ? "change_order_accepted" : "change_order_rejected", input.clientId, "CLIENT", request.orderId);
  })();
}

export function addOrderEvidence(input: {
  orderId: string;
  masterId: string;
  stage: EvidenceStage;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
}) {
  const database = getDb();
  return database.transaction(() => {
    const order = requireParticipant(getParticipantOrder(database, input.orderId), input.masterId, "MASTER");
    const allowed: Record<EvidenceStage, string[]> = {
      BEFORE: ["MASTER_ARRIVED"],
      PROCESS: ["IN_PROGRESS"],
      AFTER: ["IN_PROGRESS"],
    };
    if (!allowed[input.stage].includes(order.status)) throw new Error("EVIDENCE_STAGE_INVALID");
    const count = (database.prepare(
      "SELECT COUNT(*) AS count FROM order_evidence WHERE order_id = ? AND stage = ?",
    ).get(order.id, input.stage) as { count: number }).count;
    if (count >= 8) throw new Error("EVIDENCE_LIMIT");
    const id = randomUUID();
    const now = Date.now();
    database.prepare(
      `INSERT INTO order_evidence (
        id, order_id, uploader_id, stage, file_name, mime_type, byte_size, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, order.id, input.masterId, input.stage, input.fileName, input.mimeType, input.byteSize, input.content, now);
    recordEvent(database, "order_evidence_added", input.masterId, "MASTER", order.id, { stage: input.stage });
    return { id, url: `/api/order-evidence/${id}` };
  })();
}

export function addOrderMessage(input: {
  orderId: string;
  actorId: string;
  actorRole: "CLIENT" | "MASTER";
  body: string;
}) {
  const database = getDb();
  return database.transaction(() => {
    const order = requireParticipant(getParticipantOrder(database, input.orderId), input.actorId, input.actorRole);
    if (!order.masterId) throw new Error("ORDER_CHAT_UNAVAILABLE");
    const id = randomUUID();
    const now = Date.now();
    database.prepare(
      `INSERT INTO order_messages (id, order_id, sender_id, sender_role, kind, body, created_at)
      VALUES (?, ?, ?, ?, 'TEXT', ?, ?)`,
    ).run(id, order.id, input.actorId, input.actorRole, input.body, now);
    recordEvent(database, "order_message_sent", input.actorId, input.actorRole, order.id);
    return id;
  })();
}

export function getOrderTransparency(orderId: string) {
  const database = getDb();
  const changes = database.prepare(
    `SELECT id, previous_price_minor AS previousPriceMinor, proposed_price_minor AS proposedPriceMinor,
      reason, status, created_at AS createdAt, responded_at AS respondedAt
    FROM order_change_requests WHERE order_id = ? ORDER BY created_at DESC`,
  ).all(orderId) as Array<{ id: string; previousPriceMinor: number; proposedPriceMinor: number; reason: string; status: ChangeRequestStatus; createdAt: number; respondedAt: number | null }>;
  const evidence = database.prepare(
    `SELECT id, stage, file_name AS fileName, created_at AS createdAt
    FROM order_evidence WHERE order_id = ? ORDER BY created_at, id`,
  ).all(orderId) as Array<{ id: string; stage: EvidenceStage; fileName: string; createdAt: number }>;
  const messages = database.prepare(
    `SELECT order_messages.id, order_messages.sender_id AS senderId, order_messages.sender_role AS senderRole,
      COALESCE(users.name, 'Система') AS senderName, order_messages.kind, order_messages.body,
      order_messages.created_at AS createdAt
    FROM order_messages LEFT JOIN users ON users.id = order_messages.sender_id
    WHERE order_messages.order_id = ? ORDER BY order_messages.created_at, order_messages.id`,
  ).all(orderId) as OrderMessage[];
  return {
    changeRequests: changes.map((item) => ({
      id: item.id,
      previousPriceRubles: item.previousPriceMinor / 100,
      proposedPriceRubles: item.proposedPriceMinor / 100,
      reason: item.reason,
      status: item.status,
      createdAt: item.createdAt,
      respondedAt: item.respondedAt,
    })),
    evidence: evidence.map((item) => ({ ...item, url: `/api/order-evidence/${item.id}` })),
    messages,
  };
}

export function getOrderEvidenceMedia(actorId: string, actorRole: "CLIENT" | "MASTER" | "ADMIN", evidenceId: string) {
  const database = getDb();
  const row = database.prepare(
    `SELECT order_evidence.mime_type AS mimeType, order_evidence.content, order_evidence.byte_size AS byteSize,
      orders.client_id AS clientId, orders.selected_master_id AS masterId
    FROM order_evidence INNER JOIN orders ON orders.id = order_evidence.order_id
    WHERE order_evidence.id = ?`,
  ).get(evidenceId) as { mimeType: string; content: Buffer; byteSize: number; clientId: string; masterId: string | null } | undefined;
  if (!row) return null;
  if (actorRole === "CLIENT" && row.clientId !== actorId) return null;
  if (actorRole === "MASTER" && row.masterId !== actorId) return null;
  return row;
}

export function assertOrderTransparencyGates(database: Database.Database, orderId: string, toStatus: string) {
  if (toStatus === "IN_PROGRESS") {
    const before = (database.prepare("SELECT COUNT(*) AS count FROM order_evidence WHERE order_id = ? AND stage = 'BEFORE'").get(orderId) as { count: number }).count;
    if (before < 1) throw new Error("EVIDENCE_BEFORE_REQUIRED");
  }
  if (toStatus === "COMPLETED_BY_MASTER") {
    const pending = database.prepare("SELECT id FROM order_change_requests WHERE order_id = ? AND status = 'PENDING'").get(orderId);
    if (pending) throw new Error("CHANGE_ORDER_PENDING_COMPLETION");
    const after = (database.prepare("SELECT COUNT(*) AS count FROM order_evidence WHERE order_id = ? AND stage = 'AFTER'").get(orderId) as { count: number }).count;
    if (after < 1) throw new Error("EVIDENCE_AFTER_REQUIRED");
  }
}
