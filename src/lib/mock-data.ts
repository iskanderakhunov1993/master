import {
  BadgeCheck,
  Drill,
  Hammer,
  KeyRound,
  Plug,
  Wrench,
  Zap,
} from "lucide-react";

export const categories = [
  { name: "Сантехника", slug: "plumbing", icon: Wrench, count: 18 },
  { name: "Электрика", slug: "electric", icon: Zap, count: 11 },
  { name: "Сборка мебели", slug: "furniture", icon: Hammer, count: 14 },
  { name: "Муж на час", slug: "handyman", icon: Drill, count: 23 },
  { name: "Двери и замки", slug: "locks", icon: KeyRound, count: 7 },
  { name: "Бытовая техника", slug: "appliances", icon: Plug, count: 9 },
];

export const demoUsers = {
  client: {
    id: "client-demo",
    name: "Александр",
    role: "CLIENT",
    email: "client@homefix.local",
    ratingAvg: 4.9,
    ratingCount: 12,
  },
  master: {
    id: "master-demo",
    name: "Алексей Соколов",
    role: "MASTER",
    email: "master@homefix.local",
    ratingAvg: 4.96,
    ratingCount: 128,
  },
  admin: {
    id: "admin-demo",
    name: "Администратор",
    role: "ADMIN",
    email: "admin@homefix.local",
  },
};

export const addresses = [
  {
    id: "address-1",
    title: "Квартира",
    city: "Москва",
    district: "Хамовники",
    street: "ул. Ефремова",
    house: "12",
    apartment: "47",
    comment: "Домофон 47, вход со двора",
  },
];

export const masters = [
  {
    id: "master-profile-1",
    userId: demoUsers.master.id,
    name: demoUsers.master.name,
    rating: 4.96,
    completed: 128,
    categories: ["Сантехника", "Бытовая техника"],
    price: 4500,
    available: "через 25 минут",
    isVerified: true,
    city: "Москва",
    district: "Хамовники",
    badge: BadgeCheck,
  },
  {
    id: "master-profile-2",
    userId: "master-2",
    name: "Михаил Романов",
    rating: 4.89,
    completed: 86,
    categories: ["Сборка мебели", "Муж на час"],
    price: 5000,
    available: "сегодня к 18:00",
    isVerified: true,
    city: "Москва",
    district: "Арбат",
    badge: BadgeCheck,
  },
];

export const requests = [
  {
    id: "req-1",
    title: "Течёт кран на кухне",
    description: "Нужно снять старый кран и установить новый. Кран уже куплен.",
    category: "Сантехника",
    budgetAmount: 4500,
    budgetType: "NEGOTIABLE",
    urgency: "URGENT",
    status: "ASSIGNED",
    district: "Хамовники",
    address: "Москва, Хамовники, ул. Ефремова, 12",
    preferredTime: "Сегодня, 16:00–20:00",
    selectedMaster: masters[0],
    photoUrl: "/uploads/faucet-result.jpg",
    createdAt: "18 июня",
  },
  {
    id: "req-2",
    title: "Собрать книжный шкаф",
    description: "Нужна сборка высокого шкафа, крепление к стене желательно.",
    category: "Сборка мебели",
    budgetAmount: 3200,
    budgetType: "FIXED",
    urgency: "NORMAL",
    status: "PUBLISHED",
    district: "Арбат",
    address: "Москва, Арбат, Большой Афанасьевский пер., 5",
    preferredTime: "Завтра, 12:00–16:00",
    selectedMaster: null,
    photoUrl: null,
    createdAt: "17 июня",
  },
];

export const offers = [
  {
    id: "offer-1",
    requestId: "req-1",
    master: masters[0],
    price: 4500,
    comment: "Буду через 25 минут, расходники возьму с собой.",
    time: "Сегодня 16:30–18:30",
    status: "ACCEPTED",
  },
  {
    id: "offer-2",
    requestId: "req-1",
    master: masters[1],
    price: 5000,
    comment: "Могу приехать сегодня к 18:00.",
    time: "Сегодня 18:00–20:00",
    status: "PENDING",
  },
];

export const messages = [
  { id: "msg-1", sender: "Алексей Соколов", mine: false, text: "Добрый день! Буду у вас примерно через 25 минут.", time: "15:38" },
  { id: "msg-2", sender: "Александр", mine: true, text: "Отлично, домофон 47. Напишите, когда подойдёте.", time: "15:42" },
];

export const repairHistory = [
  {
    id: "history-1",
    addressId: "address-1",
    title: "Установка кухонного крана",
    category: "Сантехника",
    master: "Алексей Соколов",
    finalPrice: 4500,
    completedAt: "18 июня 2026",
    warrantyUntil: "16 сентября 2026",
    notes: "Старый кран снят, новый установлен, проверена герметичность.",
  },
];

export const adminStats = {
  users: 3,
  masters: 2,
  requests: 2,
  categories: categories.length,
};

export function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}
