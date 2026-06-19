import type { MvpMessage, MvpOrder, MvpOrderStatus, MvpReview, MvpRole, MvpState } from "./mvp-types";

type GlobalMvpState = typeof globalThis & {
  homefixMvpState?: MvpState;
};

const nowIso = () => new Date().toISOString();

const initialState: MvpState = {
  orders: [
    {
      id: "HF-1042",
      title: "Поменять кран на кухне",
      category: "Сантехника",
      price: 1500,
      address: "ул. Ефремова, 12",
      district: "Хамовники",
      time: "Сегодня до 20:00",
      description: "Кран куплен, нужно снять старый и поставить новый.",
      status: "published",
      photo: true,
      offers: 0,
      createdAt: nowIso(),
    },
  ],
  messages: [
    {
      id: "MSG-1",
      orderId: "HF-1042",
      role: "master",
      text: "Здравствуйте! Готов приехать через 35 минут.",
      createdAt: nowIso(),
    },
    {
      id: "MSG-2",
      orderId: "HF-1042",
      role: "client",
      text: "Отлично, кран уже куплен.",
      createdAt: nowIso(),
    },
  ],
  reviews: [],
};

function getState() {
  const globalState = globalThis as GlobalMvpState;
  globalState.homefixMvpState ??= structuredClone(initialState);
  globalState.homefixMvpState.reviews ??= [];
  return globalState.homefixMvpState;
}

function publicState(): MvpState {
  const state = getState();
  return {
    orders: [...state.orders],
    messages: [...state.messages],
    reviews: [...state.reviews],
  };
}

export function getMvpState() {
  return publicState();
}

export function createMvpOrder(input: Omit<MvpOrder, "id" | "status" | "photo" | "offers" | "createdAt">) {
  const state = getState();
  const order: MvpOrder = {
    ...input,
    id: `HF-${Math.floor(2000 + Math.random() * 7000)}`,
    status: "published",
    photo: true,
    offers: 0,
    createdAt: nowIso(),
  };
  state.orders = [order, ...state.orders];
  return order;
}

export function updateMvpOrder(id: string, patch: Partial<MvpOrder> & { status?: MvpOrderStatus }) {
  const state = getState();
  const order = state.orders.find((item) => item.id === id);
  if (!order) return null;
  Object.assign(order, patch);
  return order;
}

export function addMvpMessage(orderId: string, role: MvpRole, text: string) {
  const state = getState();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return null;

  const message: MvpMessage = {
    id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId,
    role,
    text,
    createdAt: nowIso(),
  };
  state.messages = [...state.messages, message];
  return message;
}

export function getMvpMessages(orderId: string) {
  return getState().messages.filter((message) => message.orderId === orderId);
}

export function addMvpReview(input: Omit<MvpReview, "id" | "createdAt">) {
  const state = getState();
  const order = state.orders.find((item) => item.id === input.orderId);
  if (!order) return null;

  const existingIndex = state.reviews.findIndex(
    (review) => review.orderId === input.orderId && review.reviewerRole === input.reviewerRole,
  );
  const review: MvpReview = {
    ...input,
    id: existingIndex >= 0 ? state.reviews[existingIndex].id : `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: nowIso(),
  };

  if (existingIndex >= 0) {
    state.reviews[existingIndex] = review;
  } else {
    state.reviews = [...state.reviews, review];
  }

  const hasClientReview = state.reviews.some((item) => item.orderId === input.orderId && item.reviewerRole === "client");
  const hasMasterReview = state.reviews.some((item) => item.orderId === input.orderId && item.reviewerRole === "master");
  if (hasClientReview && hasMasterReview) {
    order.status = "completed";
    order.completedAt = nowIso();
  }

  return review;
}
