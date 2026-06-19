export type MvpRole = "client" | "master";

export type MvpOrderStatus = "published" | "assigned" | "in_progress" | "awaiting_review" | "completed" | "declined";

export type MvpOrder = {
  id: string;
  title: string;
  category: string;
  price: number;
  address: string;
  district: string;
  time: string;
  description: string;
  status: MvpOrderStatus;
  photo: boolean;
  master?: string;
  offers: number;
  declineReason?: string;
  createdAt: string;
  completedAt?: string;
};

export type MvpMessage = {
  id: string;
  orderId: string;
  role: MvpRole;
  text: string;
  createdAt: string;
};

export type MvpReview = {
  id: string;
  orderId: string;
  reviewerRole: MvpRole;
  rating: number;
  comment: string;
  paymentConfirmed?: boolean;
  createdAt: string;
};

export type MvpState = {
  orders: MvpOrder[];
  messages: MvpMessage[];
  reviews: MvpReview[];
};
