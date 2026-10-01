import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email("Введите корректный email")
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Введите пароль"),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(80, "Имя слишком длинное"),
  email: z
    .email("Введите корректный email")
    .transform((value) => value.trim().toLowerCase()),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z.string().min(8, "Пароль должен содержать минимум 8 символов").max(72, "Пароль слишком длинный"),
    confirmPassword: z.string().min(1, "Повторите новый пароль"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Укажите имя")
    .max(80, "Имя слишком длинное"),
  email: z
    .email("Введите корректный email")
    .transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(72, "Пароль слишком длинный"),
  role: z.enum(["CLIENT", "MASTER"], {
    error: "Выберите, как вы хотите пользоваться сервисом",
  }),
});
