import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { getPrisma } from "@/lib/db/prisma";

import type { Role, SessionUser } from "./types";

export type UserWithPassword = SessionUser & {
  passwordHash: string;
  isBlocked: boolean;
};

export async function findPostgresUserByEmail(email: string): Promise<UserWithPassword | undefined> {
  const user = await getPrisma().user.findUnique({ where: { email } });

  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        passwordHash: user.passwordHash,
        isBlocked: user.blocked,
      }
    : undefined;
}

export async function findPostgresSessionUser(tokenHash: string, now: number) {
  const session = await getPrisma().session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date(now) },
      user: { blocked: false },
    },
    select: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return session
    ? { ...session.user, role: session.user.role as Role }
    : undefined;
}

export async function createPostgresUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: Exclude<Role, "ADMIN">;
}) {
  const user = await getPrisma().user.create({
    data: {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}

export async function createPostgresSessionRecord(input: {
  userId: string;
  tokenHash: string;
  expiresAt: number;
}) {
  const now = new Date();
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.session.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: new Date(input.expiresAt),
      },
    }),
  ]);
}

export async function deletePostgresSessionRecord(tokenHash: string) {
  await getPrisma().session.deleteMany({ where: { tokenHash } });
}

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
