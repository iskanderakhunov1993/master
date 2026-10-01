import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

import type { Role, SessionUser } from "./types";

export type UserWithPassword = SessionUser & {
  passwordHash: string;
  isBlocked: boolean;
};

export function findUserByEmail(email: string): UserWithPassword | undefined {
  const row = getDb()
    .prepare(
      `SELECT
        users.id,
        users.name,
        users.email,
        users.password_hash AS passwordHash,
        users.is_blocked AS isBlocked,
        user_roles.role
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id
      WHERE users.email = ? AND user_roles.is_primary = 1`,
    )
    .get(email) as (Omit<UserWithPassword, "isBlocked"> & { isBlocked: number }) | undefined;
  return row ? { ...row, isBlocked: row.isBlocked === 1 } : undefined;
}

export function findSessionUser(tokenHash: string, now: number) {
  return getDb()
    .prepare(
      `SELECT users.id, users.name, users.email, user_roles.role
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      INNER JOIN user_roles ON user_roles.user_id = users.id
      WHERE sessions.token_hash = ?
        AND sessions.expires_at > ?
        AND users.is_blocked = 0
        AND user_roles.is_primary = 1`,
    )
    .get(tokenHash, now) as SessionUser | undefined;
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: Exclude<Role, "ADMIN">;
}) {
  const database = getDb();
  const id = randomUUID();
  const now = Date.now();

  database.transaction(() => {
    database
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.name, input.email, input.passwordHash, now, now);

    database
      .prepare(
        `INSERT INTO user_roles (user_id, role, is_primary, created_at)
        VALUES (?, ?, 1, ?)`,
      )
      .run(id, input.role, now);
  })();

  return { id, name: input.name, email: input.email, role: input.role };
}

export function createSessionRecord(input: {
  userId: string;
  tokenHash: string;
  expiresAt: number;
}) {
  const database = getDb();
  const now = Date.now();

  database
    .prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .run(now);

  database
    .prepare(
      `INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), input.tokenHash, input.userId, input.expiresAt, now);
}

export function deleteSessionRecord(tokenHash: string) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function deleteUserSessions(userId: string) {
  return getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId).changes;
}

export function findUserById(userId: string): UserWithPassword | undefined {
  const row = getDb()
    .prepare(
      `SELECT
        users.id,
        users.name,
        users.email,
        users.password_hash AS passwordHash,
        users.is_blocked AS isBlocked,
        user_roles.role
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id
      WHERE users.id = ? AND user_roles.is_primary = 1`,
    )
    .get(userId) as (Omit<UserWithPassword, "isBlocked"> & { isBlocked: number }) | undefined;
  return row ? { ...row, isBlocked: row.isBlocked === 1 } : undefined;
}

export function updateUserProfile(userId: string, input: { name: string; email: string }) {
  const database = getDb();
  const existing = database
    .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
    .get(input.email, userId);
  if (existing) throw new Error("EMAIL_TAKEN");

  const result = database
    .prepare("UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?")
    .run(input.name, input.email, Date.now(), userId);
  if (result.changes !== 1) throw new Error("USER_NOT_FOUND");
}

export function updateUserPassword(userId: string, passwordHash: string) {
  const result = getDb()
    .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(passwordHash, Date.now(), userId);
  if (result.changes !== 1) throw new Error("USER_NOT_FOUND");
}
