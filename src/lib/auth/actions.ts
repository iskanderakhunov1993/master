"use server";

import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createUser, findUserByEmail, findUserById, updateUserPassword, updateUserProfile } from "./repository";
import { createSession, destroySession, getRoleHome, getSession } from "./session";
import type { AuthActionState } from "./types";
import { changePasswordSchema, loginSchema, registerSchema, updateAccountSchema } from "./validation";

export type AccountActionResult = { ok: boolean; message?: string };

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

  const user = findUserByEmail(result.data.email);
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

  if (findUserByEmail(result.data.email)) {
    return {
      status: "error",
      message: "Пользователь с таким email уже зарегистрирован",
    };
  }

  const passwordHash = await hash(result.data.password, 12);

  try {
    const user = createUser({
      name: result.data.name,
      email: result.data.email,
      passwordHash,
      role: result.data.role,
    });

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

export async function updateAccountAction(input: { name: string; email: string }): Promise<AccountActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Требуется вход" };

  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  try {
    updateUserProfile(user.id, parsed.data);
    revalidatePath("/client/profile");
    revalidatePath("/master/profile");
    return { ok: true };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "EMAIL_TAKEN") return { ok: false, message: "Этот email уже используется другим аккаунтом" };
    return { ok: false, message: "Не удалось сохранить изменения" };
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AccountActionResult> {
  const sessionUser = await getSession();
  if (!sessionUser) return { ok: false, message: "Требуется вход" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const user = findUserById(sessionUser.id);
  if (!user) return { ok: false, message: "Пользователь не найден" };

  const currentMatches = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) return { ok: false, message: "Текущий пароль указан неверно" };

  const newPasswordHash = await hash(parsed.data.newPassword, 12);
  updateUserPassword(user.id, newPasswordHash);
  return { ok: true };
}
