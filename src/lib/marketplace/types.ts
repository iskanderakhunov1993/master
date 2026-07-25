import type { OrderStatus, OrderType, ScheduleKind } from "@/lib/orders/types";

export type OrderMatchStatus = "NEW" | "VIEWED" | "OFFERED" | "SKIPPED" | "EXPIRED";

export type MasterOfferStatus =
  | "ACTIVE"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

export type MatchedOrderPhoto = {
  id: string;
  url: string;
};

/** Privacy-safe projection for a master before the client selects them. */
export type MatchedOrder = {
  matchId: string;
  orderId: string;
  matchStatus: OrderMatchStatus;
  categoryName: string;
  subcategoryName: string;
  description: string;
  serviceAreaName: string;
  city: string;
  approximateDistanceKm: number;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  clientPriceRubles: number;
  photos: MatchedOrderPhoto[];
  createdAt: number;
  expiresAt: number;
};

export type MasterOffer = {
  id: string;
  orderId: string;
  masterId: string;
  proposedPriceRubles: number;
  etaMinutes: number;
  comment: string;
  status: MasterOfferStatus;
  createdAt: number;
  expiresAt: number;
};

export type MarketplaceActionResult = {
  ok: boolean;
  message?: string;
  offer?: MasterOffer;
  selected?: SelectedMaster;
};

export type ClientCandidate = {
  offerId: string;
  orderId: string;
  masterId: string;
  name: string;
  avatarUrl: string | null;
  specialization: string;
  rating: number | null;
  reviewsCount: number;
  verificationStatus: "VERIFIED";
  reliabilityScore: number | null;
  completedJobs: number;
  similarJobs: number;
  onTimeRate: number | null;
  approximateDistanceKm: number;
  proposedPriceRubles: number;
  etaMinutes: number;
  comment: string;
  expiresAt: number;
  rankingScore: number;
};

export type SelectedMaster = {
  orderId: string;
  masterId: string;
  offerId: string;
  name: string;
  avatarUrl: string | null;
  specialization: string;
  agreedPriceRubles: number;
  etaMinutes: number;
  status: OrderStatus;
  selectedAt: number;
  confirmedAt: number | null;
};
