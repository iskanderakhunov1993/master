import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

import { transitionOrderInTransaction } from "./lifecycle";
import type { OrderStatus } from "./types";

type ClientReviewInput = {
  clientId: string;
  orderId: string;
  overallRating: number;
  qualityRating: number;
  punctualityRating: number;
  communicationRating: number;
  agreementRating: number;
  comment?: string;
  now?: number;
};

type MasterReviewInput = {
  masterId: string;
  orderId: string;
  overallRating: number;
  comment?: string;
  now?: number;
};

function validateRating(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error("REVIEW_RATING_INVALID");
}

function validateComment(comment: string) {
  if (comment.length > 1000) throw new Error("REVIEW_COMMENT_TOO_LONG");
}

export function submitClientReview(input: ClientReviewInput) {
  for (const rating of [
    input.overallRating,
    input.qualityRating,
    input.punctualityRating,
    input.communicationRating,
    input.agreementRating,
  ]) validateRating(rating);
  const comment = input.comment?.trim() ?? "";
  validateComment(comment);
  const now = input.now ?? Date.now();
  const database = getDb();

  return database.transaction(() => {
    const order = database
      .prepare(
        `SELECT
          orders.client_id AS clientId,
          orders.selected_master_id AS masterId,
          orders.status,
          users.name AS clientName
        FROM orders
        INNER JOIN users ON users.id = orders.client_id
        WHERE orders.id = ?`,
      )
      .get(input.orderId) as
        | { clientId: string; masterId: string | null; status: OrderStatus; clientName: string }
        | undefined;
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.clientId !== input.clientId) throw new Error("REVIEW_ACCESS_DENIED");
    if (!order.masterId) throw new Error("SELECTED_MASTER_MISSING");

    const duplicate = database
      .prepare("SELECT 1 FROM order_reviews WHERE order_id = ? AND reviewer_id = ?")
      .get(input.orderId, input.clientId);
    if (duplicate) throw new Error("REVIEW_ALREADY_EXISTS");
    if (order.status !== "COMPLETED") throw new Error("REVIEW_ORDER_NOT_COMPLETED");

    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO order_reviews (
          id, order_id, reviewer_id, reviewee_id, reviewer_role,
          overall_rating, quality_rating, punctuality_rating,
          communication_rating, agreement_rating, comment, created_at
        ) VALUES (?, ?, ?, ?, 'CLIENT', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.orderId,
        input.clientId,
        order.masterId,
        input.overallRating,
        input.qualityRating,
        input.punctualityRating,
        input.communicationRating,
        input.agreementRating,
        comment || null,
        now,
      );

    database
      .prepare(
        `INSERT INTO master_reviews (
          id, master_id, client_name, rating, body, quality_rating,
          punctuality_rating, communication_rating, agreement_rating,
          created_at, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .run(
        `order-review-${input.orderId}`,
        order.masterId,
        order.clientName.split(" ")[0] || "Клиент",
        input.overallRating,
        comment || "Оценка по завершённому заказу.",
        input.qualityRating,
        input.punctualityRating,
        input.communicationRating,
        input.agreementRating,
        now,
      );

    database
      .prepare(
        `UPDATE master_profiles
        SET rating_x100 = ROUND(
              (rating_x100 * reviews_count + ? * 100.0) / (reviews_count + 1)
            ),
            reviews_count = reviews_count + 1,
            updated_at = ?
        WHERE master_id = ?`,
      )
      .run(input.overallRating, now, order.masterId);

    transitionOrderInTransaction(database, {
      orderId: input.orderId,
      actorId: input.clientId,
      actorRole: "CLIENT",
      toStatus: "REVIEWED",
      now,
    });

    return id;
  })();
}

export function submitMasterReview(input: MasterReviewInput) {
  validateRating(input.overallRating);
  const comment = input.comment?.trim() ?? "";
  validateComment(comment);
  const now = input.now ?? Date.now();
  const database = getDb();

  return database.transaction(() => {
    const order = database
      .prepare(
        `SELECT client_id AS clientId, selected_master_id AS masterId, status
        FROM orders WHERE id = ?`,
      )
      .get(input.orderId) as
        | { clientId: string; masterId: string | null; status: OrderStatus }
        | undefined;
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.masterId !== input.masterId) throw new Error("REVIEW_ACCESS_DENIED");

    const duplicate = database
      .prepare("SELECT 1 FROM order_reviews WHERE order_id = ? AND reviewer_id = ?")
      .get(input.orderId, input.masterId);
    if (duplicate) throw new Error("REVIEW_ALREADY_EXISTS");
    if (!["COMPLETED", "REVIEWED"].includes(order.status)) {
      throw new Error("REVIEW_ORDER_NOT_COMPLETED");
    }

    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO order_reviews (
          id, order_id, reviewer_id, reviewee_id, reviewer_role,
          overall_rating, comment, created_at
        ) VALUES (?, ?, ?, ?, 'MASTER', ?, ?, ?)`,
      )
      .run(
        id,
        input.orderId,
        input.masterId,
        order.clientId,
        input.overallRating,
        comment || null,
        now,
      );
    return id;
  })();
}
