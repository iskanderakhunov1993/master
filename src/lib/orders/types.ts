import type { ClientAddress } from "@/lib/addresses/types";

export type OrderStatus =
  | "DRAFT"
  | "SEARCHING_MASTERS"
  | "OFFERS_RECEIVED"
  | "MASTER_SELECTED"
  | "MASTER_CONFIRMED"
  | "MASTER_ON_THE_WAY"
  | "MASTER_ARRIVED"
  | "COMPLETED_BY_MASTER"
  | "REVIEWED"
  | "CANCELLED_BY_CLIENT"
  | "CANCELLED_BY_MASTER"
  | "DISPUTED"
  | "AWAITING_SELECTION"
  | "SEARCH_EXHAUSTED"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType = "NORMAL" | "URGENT";
export type ScheduleKind = "NOW" | "TODAY" | "CUSTOM";

export type OrderPhoto = {
  id: string;
  url: string;
  fileName: string;
  byteSize: number;
};

export type ServiceSubcategory = {
  id: string;
  name: string;
  slug: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: ServiceSubcategory[];
};

export type OrderServiceArea = {
  id: string;
  city: string;
  name: string;
};

export type OrderDraft = {
  id: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  addressId: string;
  serviceAreaId: string;
  address: Omit<ClientAddress, "id" | "isPrimary">;
  scheduleKind: ScheduleKind | "";
  scheduledAt: number | null;
  orderType: OrderType;
  basePriceRubles: number | null;
  urgencyMultiplierBps: number;
  totalPriceRubles: number | null;
  currentStep: number;
  photos: OrderPhoto[];
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  description: string;
  categoryName: string;
  subcategoryName: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  basePriceRubles: number;
  urgencyMultiplierBps: number;
  totalPriceRubles: number;
  submittedAt: number | null;
  updatedAt: number;
  photoCount: number;
  etaMinutes: number | null;
};

export type ClientTaskSummary = {
  id: string;
  title: string;
  dueAt: number | null;
};

export type ClientDashboardData = {
  activeOrder: OrderSummary | null;
  recentOrders: OrderSummary[];
  upcomingTasks: ClientTaskSummary[];
};

export type OrderWizardData = {
  draft: OrderDraft;
  categories: ServiceCategory[];
  addresses: ClientAddress[];
  serviceAreas: OrderServiceArea[];
  urgencyMultiplier: number;
};

export type OrderActionResult = {
  ok: boolean;
  message?: string;
  orderId?: string;
};
