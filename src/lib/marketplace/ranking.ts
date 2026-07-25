import { getDb } from "@/lib/db";
import { calculateReliability } from "@/lib/masters/reliability";

import { expireOffers } from "./offers";
import type { ClientCandidate } from "./types";

const MAX_PRIMARY_CANDIDATES = 3;

const specializationLabels: Record<string, string> = {
  plumbing: "Сантехник",
  electrical: "Электрик",
  "furniture-assembly": "Сборщик мебели",
  installation: "Специалист по установке",
  "small-repair": "Мастер по мелкому ремонту",
  other: "Универсальный мастер",
};

type CandidateRow = {
  offerId: string;
  orderId: string;
  masterId: string;
  name: string;
  avatarId: string | null;
  categorySlug: string;
  categoryName: string;
  ratingX100: number;
  reviewsCount: number;
  completedJobs: number;
  masterCancellations: number;
  noShows: number;
  lateArrivals: number;
  confirmedCompletions: number;
  similarJobs: number;
  approximateDistanceX10: number;
  proposedPriceMinor: number;
  etaMinutes: number;
  comment: string | null;
  expiresAt: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function specialistLabel(categorySlug: string, categoryName: string) {
  return specializationLabels[categorySlug] ?? `Мастер: ${categoryName.toLocaleLowerCase("ru-RU")}`;
}

/**
 * Product ranking only: no paid placement or monetization signals.
 * Every active offer already has an exact category match.
 */
export function scoreCandidate(input: {
  reliabilityScore: number | null;
  rating: number | null;
  similarJobs: number;
  distanceKm: number;
  etaMinutes: number;
  proposedPriceRubles: number;
  lowestPriceRubles: number;
}) {
  const reliability = (input.reliabilityScore ?? 70) / 100;
  const rating = (input.rating ?? 3.5) / 5;
  const similarJobs = clamp01(input.similarJobs / 30);
  const distance = 1 - clamp01(input.distanceKm / 20);
  const eta = 1 - clamp01((input.etaMinutes - 5) / 235);
  const price = input.proposedPriceRubles > 0
    ? clamp01(input.lowestPriceRubles / input.proposedPriceRubles)
    : 0;

  return Math.round((
    0.20
    + reliability * 0.22
    + rating * 0.18
    + similarJobs * 0.12
    + distance * 0.10
    + eta * 0.10
    + price * 0.08
  ) * 10_000) / 100;
}

function loadCandidateRows(clientId: string, orderId: string, now: number) {
  return getDb()
    .prepare(
      `SELECT
        master_offers.id AS offerId,
        orders.id AS orderId,
        master_profiles.master_id AS masterId,
        users.name,
        (
          SELECT id FROM master_media
          WHERE master_media.master_id = master_profiles.master_id
            AND master_media.kind = 'AVATAR'
          ORDER BY created_at DESC LIMIT 1
        ) AS avatarId,
        service_categories.slug AS categorySlug,
        service_categories.name AS categoryName,
        master_profiles.rating_x100 AS ratingX100,
        master_profiles.reviews_count AS reviewsCount,
        master_profiles.completed_jobs AS completedJobs,
        master_profiles.master_cancellations AS masterCancellations,
        master_profiles.no_shows AS noShows,
        master_profiles.late_arrivals AS lateArrivals,
        master_profiles.confirmed_completions AS confirmedCompletions,
        COALESCE(
          master_category_stats.completed_jobs,
          (
            SELECT COUNT(*)
            FROM order_assignments AS completed_assignment
            INNER JOIN orders AS completed_order ON completed_order.id = completed_assignment.order_id
            WHERE completed_assignment.master_id = master_profiles.master_id
              AND completed_order.category_id = orders.category_id
              AND completed_order.status = 'COMPLETED'
          ),
          0
        ) AS similarJobs,
        order_matches.approx_distance_km_x10 AS approximateDistanceX10,
        master_offers.proposed_price_minor AS proposedPriceMinor,
        master_offers.eta_minutes AS etaMinutes,
        master_offers.comment,
        master_offers.expires_at AS expiresAt
      FROM master_offers
      INNER JOIN orders ON orders.id = master_offers.order_id
      INNER JOIN master_profiles ON master_profiles.master_id = master_offers.master_id
      INNER JOIN users ON users.id = master_profiles.master_id
      INNER JOIN service_categories ON service_categories.id = orders.category_id
      INNER JOIN order_matches
        ON order_matches.order_id = master_offers.order_id
        AND order_matches.master_id = master_offers.master_id
      LEFT JOIN master_category_stats
        ON master_category_stats.master_id = master_profiles.master_id
        AND master_category_stats.category_id = orders.category_id
      WHERE orders.id = ?
        AND orders.client_id = ?
        AND orders.status = 'OFFERS_RECEIVED'
        AND master_offers.status = 'ACTIVE'
        AND master_offers.expires_at > ?
        AND master_profiles.verification_status = 'VERIFIED'
        AND master_profiles.is_online = 1
        AND master_profiles.is_blocked = 0
        AND users.is_blocked = 0
        AND master_profiles.onboarding_completed = 1
        AND NOT EXISTS (
          SELECT 1
          FROM order_assignments AS busy_assignment
          INNER JOIN orders AS busy_order ON busy_order.id = busy_assignment.order_id
          WHERE busy_assignment.master_id = master_profiles.master_id
            AND busy_order.id != orders.id
            AND busy_order.status IN (
              'MASTER_SELECTED', 'MASTER_CONFIRMED', 'MASTER_ON_THE_WAY',
              'MASTER_ARRIVED', 'COMPLETED_BY_MASTER', 'ASSIGNED', 'EN_ROUTE',
              'ARRIVED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'
            )
        )`,
    )
    .all(orderId, clientId, now) as CandidateRow[];
}

export function listRankedCandidates(clientId: string, orderId: string, now = Date.now()) {
  expireOffers(now);
  const rows = loadCandidateRows(clientId, orderId, now);
  if (rows.length === 0) return [];
  const lowestPriceRubles = Math.min(...rows.map((row) => row.proposedPriceMinor / 100));

  return rows
    .map<ClientCandidate>((row) => {
      const reliability = calculateReliability({
        completedJobs: row.completedJobs,
        masterCancellations: row.masterCancellations,
        noShows: row.noShows,
        lateArrivals: row.lateArrivals,
        confirmedCompletions: row.confirmedCompletions,
      });
      const rating = row.ratingX100 > 0 ? row.ratingX100 / 100 : null;
      const distanceKm = row.approximateDistanceX10 / 10;
      const proposedPriceRubles = row.proposedPriceMinor / 100;
      return {
        offerId: row.offerId,
        orderId: row.orderId,
        masterId: row.masterId,
        name: row.name,
        avatarUrl: row.avatarId ? `/api/master-media/${row.avatarId}` : null,
        specialization: specialistLabel(row.categorySlug, row.categoryName),
        rating,
        reviewsCount: row.reviewsCount,
        verificationStatus: "VERIFIED",
        reliabilityScore: reliability.score,
        completedJobs: row.completedJobs,
        similarJobs: row.similarJobs,
        onTimeRate: row.completedJobs > 0
          ? Math.round(Math.max(0, row.completedJobs - row.lateArrivals) / row.completedJobs * 100)
          : null,
        approximateDistanceKm: distanceKm,
        proposedPriceRubles,
        etaMinutes: row.etaMinutes,
        comment: row.comment ?? "",
        expiresAt: row.expiresAt,
        rankingScore: scoreCandidate({
          reliabilityScore: reliability.score,
          rating,
          similarJobs: row.similarJobs,
          distanceKm,
          etaMinutes: row.etaMinutes,
          proposedPriceRubles,
          lowestPriceRubles,
        }),
      };
    })
    .sort((left, right) =>
      right.rankingScore - left.rankingScore
      || left.etaMinutes - right.etaMinutes
      || left.proposedPriceRubles - right.proposedPriceRubles,
    )
    .slice(0, MAX_PRIMARY_CANDIDATES);
}

export function getRankedCandidate(
  clientId: string,
  orderId: string,
  offerId: string,
  now = Date.now(),
) {
  return listRankedCandidates(clientId, orderId, now)
    .find((candidate) => candidate.offerId === offerId) ?? null;
}
