export const ROLES = ["CLIENT", "MASTER", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthActionState = {
  status: "idle" | "error";
  message?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};

export const ROLE_HOME: Record<Role, string> = {
  CLIENT: "/client",
  MASTER: "/master",
  ADMIN: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Клиент",
  MASTER: "Мастер",
  ADMIN: "Администратор",
};
