import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import {
  createPostgresSessionRecord,
  createSessionRecord,
  deletePostgresSessionRecord,
  deleteSessionRecord,
  findPostgresSessionUser,
  findSessionUser,
} from "./repository";
import { usesPostgresRuntime } from "@/lib/db/runtime";
import { ROLE_HOME, type Role } from "./types";

const SESSION_COOKIE = "master_ryadom_session";
const DEFAULT_SESSION_TTL_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionTtlMilliseconds() {
  const configuredDays = Number(process.env.SESSION_TTL_DAYS);
  const days = Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_SESSION_TTL_DAYS;

  return days * 24 * 60 * 60 * 1000;
}

export function getRoleHome(role: Role) {
  return ROLE_HOME[role];
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + getSessionTtlMilliseconds();

  const input = {
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  };
  if (usesPostgresRuntime()) {
    await createPostgresSessionRecord(input);
  } else {
    createSessionRecord(input);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const user = usesPostgresRuntime()
    ? await findPostgresSessionUser(hashToken(token), Date.now())
    : findSessionUser(hashToken(token), Date.now());
  return user ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    if (usesPostgresRuntime()) {
      await deletePostgresSessionRecord(hashToken(token));
    } else {
      deleteSessionRecord(hashToken(token));
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}
