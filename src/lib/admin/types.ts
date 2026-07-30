import type { Role } from "@/lib/auth/types";
import type { VerificationStatus } from "@/lib/masters/types";
import type { OrderStatus, OrderType } from "@/lib/orders/types";

export type AdminDashboardData = {
  totalUsers: number;
  masters: number;
  blockedUsers: number;
  pendingVerifications: number;
  activeOrders: number;
  openComplaints: number;
  pilot: {
    publishedOrders: number;
    ordersWithOffers: number;
    selectedOrders: number;
    completedOrders: number;
    repeatClients: number;
    disputes: number;
    changeOrders: number;
    evidenceReadyOrders: number;
    averageFirstOfferMinutes: number | null;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  createdAt: number;
  orderCount: number;
};

export type AdminMaster = {
  id: string;
  name: string;
  email: string;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  isBlocked: boolean;
  rating: number | null;
  reviewsCount: number;
  completedJobs: number;
  categories: string;
};

export type AdminOrder = {
  id: string;
  status: OrderStatus;
  orderType: OrderType;
  description: string;
  categoryName: string;
  clientName: string;
  masterName: string;
  priceRubles: number;
  createdAt: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  subcategoryCount: number;
  orderCount: number;
};

export type AdminComplaint = {
  id: string;
  orderId: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  kind: "DISPUTE" | "COMPLAINT" | "WARRANTY";
  subject: string;
  description: string;
  reporterName: string;
  againstName: string;
  createdAt: number;
  evidenceCount: number;
  evidenceIds: string[];
};

export type AdminActionResult = { ok: boolean; message?: string };
