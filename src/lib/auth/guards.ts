import "server-only";

import { redirect } from "next/navigation";

import { getRoleHome, getSession } from "./session";
import { canAccessRoleArea } from "./authorization";
import type { Role } from "./types";

export async function requireRole(requiredRole: Role) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessRoleArea(user.role, requiredRole)) {
    redirect(getRoleHome(user.role));
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getSession();

  if (user) {
    redirect(getRoleHome(user.role));
  }
}
