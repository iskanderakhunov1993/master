import type { OrderStatus, OrderType, ScheduleKind } from "@/lib/orders/types";

export type VerificationStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";
export type MasterMediaKind = "AVATAR" | "IDENTITY" | "PORTFOLIO";

export type MasterCategory = {
  id: string;
  slug: string;
  name: string;
};

export type ServiceArea = {
  id: string;
  city: string;
  name: string;
};

export type MasterMedia = {
  id: string;
  kind: MasterMediaKind;
  fileName: string;
  byteSize: number;
  url: string;
};

export type ReliabilityMetric = {
  label: string;
  value: string;
  penalty: number;
};

export type ReliabilityResult = {
  score: number | null;
  label: string;
  metrics: ReliabilityMetric[];
};

export type MasterStatistics = {
  completedJobs: number;
  rating: number | null;
  reviewsCount: number;
  masterCancellations: number;
  noShows: number;
  lateArrivals: number;
  confirmedCompletions: number;
  reliability: ReliabilityResult;
};

export type MasterProfile = {
  masterId: string;
  name: string;
  email: string;
  phone: string;
  experienceYears: number;
  bio: string;
  verificationStatus: VerificationStatus;
  verificationRejectionReason: string;
  isOnline: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
  categories: MasterCategory[];
  serviceAreas: ServiceArea[];
  avatar: MasterMedia | null;
  portfolio: MasterMedia[];
  statistics: MasterStatistics;
};

export type MasterReview = {
  id: string;
  clientName: string;
  rating: number;
  body: string;
  qualityRating: number;
  punctualityRating: number;
  communicationRating: number;
  agreementRating: number;
  createdAt: number;
};

export type MasterWorkHistoryItem = {
  id: string;
  title: string;
  description: string;
  completedAt: number;
};

export type MasterProfileData = {
  profile: MasterProfile;
  categoryOptions: MasterCategory[];
  areaOptions: ServiceArea[];
  reviews: MasterReview[];
  workHistory: MasterWorkHistoryItem[];
  identityDocument: MasterMedia | null;
  categoryStats: Array<{ categoryId: string; completedJobs: number }>;
  reviewSummary: {
    quality: number | null;
    punctuality: number | null;
    communication: number | null;
    agreement: number | null;
  };
};

export type MasterOrderCard = {
  id: string;
  status: OrderStatus;
  description: string;
  categoryName: string;
  subcategoryName: string;
  city: string;
  locationLabel: string;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  totalPriceRubles: number;
  apartment: string;
  addressComment: string;
};

export type MasterDashboardData = {
  profile: MasterProfile;
  availableOrders: MasterOrderCard[];
  activeOrder: MasterOrderCard | null;
  upcomingOrders: MasterOrderCard[];
};

export type VerificationApplication = {
  id: string;
  masterId: string;
  masterName: string;
  masterEmail: string;
  legalName: string;
  documentType: "PASSPORT";
  documentLastFour: string;
  documentMediaId: string;
  submittedAt: number;
};

export type MasterActionResult = {
  ok: boolean;
  message?: string;
};
