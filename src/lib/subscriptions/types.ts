import type { ClientAddress } from "@/lib/addresses/types";
import type { OrderStatus, ServiceCategory } from "@/lib/orders/types";

export type SubscriptionFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED";

export type SubscriptionInput = {
  categoryId: string;
  subcategoryId?: string;
  addressId: string;
  serviceAreaId: string;
  description: string;
  frequency: SubscriptionFrequency;
  firstServiceAt: number;
  priceRubles: number;
};

export type ClientSubscription = {
  id: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  description: string;
  address: {
    city: string;
    street: string;
    house: string;
    apartment: string;
  };
  frequency: SubscriptionFrequency;
  nextServiceAt: number;
  priceRubles: number;
  status: SubscriptionStatus;
  currentOrderId: string | null;
  currentOrderStatus: OrderStatus | null;
  currentCycle: number;
  createdAt: number;
  updatedAt: number;
};

export type SubscriptionPageData = {
  subscriptions: ClientSubscription[];
  categories: ServiceCategory[];
  addresses: ClientAddress[];
  serviceAreas: Array<{ id: string; city: string; name: string }>;
};

export type SubscriptionActionResult = {
  ok: boolean;
  message?: string;
  subscriptionId?: string;
  orderId?: string;
};

