"use server";

import { hash, compare } from "bcryptjs";
import { redirect } from "next/navigation";

import { usesPostgresRuntime } from "@/lib/db/runtime";

import {
  createPostgresUser,
  createUser,
  findPostgresUserByEmail,
  findUserByEmail,
} from "./repository";
import { createSession, destroySession, getRoleHome } from "./session";
import type { AuthActionState } from "./types";
import { loginSchema, registerSchema } from "./validation";

function firstError(issues: { message: string }[]) {
  return issues[0]?.message ?? "Проверьте введённые данные";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { status: "error", message: firstError(result.error.issues) };
  }

  const user = usesPostgresRuntime()
    ? await findPostgresUserByEmail(result.data.email)
    : findUserByEmail(result.data.email);
  const passwordMatches = user
    ? await compare(result.data.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    return { status: "error", message: "Неверный email или пароль" };
  }

  if (user.isBlocked) {
    return { status: "error", message: "Аккаунт заблокирован. Обратитесь в поддержку" };
  }

  await createSession(user.id);
  redirect(getRoleHome(user.role));
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!result.success) {
    return { status: "error", message: firstError(result.error.issues) };
  }

  const existingUser = usesPostgresRuntime()
    ? await findPostgresUserByEmail(result.data.email)
    : findUserByEmail(result.data.email);
  if (existingUser) {
    return {
      status: "error",
      message: "Пользователь с таким email уже зарегистрирован",
    };
  }

  const passwordHash = await hash(result.data.password, 12);

  try {
    const input = {
      name: result.data.name,
      email: result.data.email,
      passwordHash,
      role: result.data.role,
    };
    const user = usesPostgresRuntime()
      ? await createPostgresUser(input)
      : createUser(input);

    await createSession(user.id);
    redirect(getRoleHome(user.role));
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return {
        status: "error",
        message: "Пользователь с таким email уже зарегистрирован",
      };
    }

    throw error;
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
