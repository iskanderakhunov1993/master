import type { Role } from "./types";

export type DemoUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export const DEMO_USERS: DemoUser[] = [
  {
    name: "Анна Сергеева",
    email: "client@master-ryadom.ru",
    password: "Demo123!",
    role: "CLIENT",
  },
  {
    name: "Александр Петров",
    email: "master@master-ryadom.ru",
    password: "Demo123!",
    role: "MASTER",
  },
  {
    name: "Ольга Администратор",
    email: "admin@master-ryadom.ru",
    password: "Demo123!",
    role: "ADMIN",
  },
];
