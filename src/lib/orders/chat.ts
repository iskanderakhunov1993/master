import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

export type OrderMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "CLIENT" | "MASTER";
  body: string;
  createdAt: number;
};

type OrderPartiesRow = { clientId: string; selectedMasterId: string | null };

function requireOrderParty(orderId: string, userId: string): "CLIENT" | "MASTER" {
  const order = getDb()
    .prepare("SELECT client_id AS clientId, selected_master_id AS selectedMasterId FROM orders WHERE id = ?")
    .get(orderId) as OrderPartiesRow | undefined;
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!order.selectedMasterId) throw new Error("CHAT_NOT_AVAILABLE");
  if (order.clientId === userId) return "CLIENT";
  if (order.selectedMasterId === userId) return "MASTER";
  throw new Error("ORDER_ACCESS_DENIED");
}

export function listOrderMessages(orderId: string): OrderMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT
        order_messages.id, order_messages.sender_id AS senderId,
        users.name AS senderName, order_messages.sender_role AS senderRole,
        order_messages.body, order_messages.created_at AS createdAt
      FROM order_messages
      INNER JOIN users ON users.id = order_messages.sender_id
      WHERE order_messages.order_id = ?
      ORDER BY order_messages.created_at, order_messages.rowid`,
    )
    .all(orderId) as OrderMessage[];
  return rows;
}

export function sendOrderMessage(input: { orderId: string; senderId: string; body: string }): OrderMessage {
  const database = getDb();
  return database.transaction(() => {
    const senderRole = requireOrderParty(input.orderId, input.senderId);

    const id = randomUUID();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO order_messages (id, order_id, sender_id, sender_role, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.orderId, input.senderId, senderRole, input.body, now);

    const senderName = (database.prepare("SELECT name FROM users WHERE id = ?").get(input.senderId) as { name: string }).name;
    return { id, senderId: input.senderId, senderName, senderRole, body: input.body, createdAt: now };
  })();
}

/** Whether this viewer may read/send messages on this order at all. */
export function canAccessOrderChat(orderId: string, userId: string): boolean {
  try {
    requireOrderParty(orderId, userId);
    return true;
  } catch {
    return false;
  }
}
