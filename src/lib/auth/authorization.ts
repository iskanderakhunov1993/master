import type { Role } from "./types";

export function canAccessRoleArea(userRole: Role, requiredRole: Role) {
  return userRole === requiredRole;
}
