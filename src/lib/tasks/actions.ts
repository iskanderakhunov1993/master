"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";

import {
  createClientTask,
  deleteClientTask,
  moveClientTask,
  updateClientTask,
} from "./repository";
import type { TaskActionResult } from "./types";

const taskInputSchema = z.object({
  title: z.string().trim().min(2, "Введите название задачи").max(120, "Название не должно превышать 120 символов"),
  description: z.string().trim().max(1000, "Описание не должно превышать 1000 символов").optional(),
  categoryId: z.string().trim().max(100).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  desiredDate: z.number().int().positive().nullable().optional(),
});

const statusSchema = z.enum(["TODO", "PLANNED", "MASTER_FOUND", "DONE"]);

function revalidateTasks() {
  revalidatePath("/client");
  revalidatePath("/client/tasks");
  revalidatePath("/client/calendar");
}

function taskError(error: unknown): TaskActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    TASK_NOT_FOUND: "Задача не найдена",
    TASK_CATEGORY_NOT_FOUND: "Выбранная категория недоступна",
    TASK_UPDATE_CONFLICT: "Задача уже изменилась. Доска сейчас обновится",
    TASK_STATUS_MANAGED_BY_ORDER: "Статус этой задачи обновляется по связанному заказу",
  };
  return { ok: false, message: messages[code] ?? "Не удалось сохранить задачу" };
}

export async function createTaskAction(input: z.infer<typeof taskInputSchema>): Promise<TaskActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте задачу" };
  try {
    const task = createClientTask(client.id, parsed.data);
    revalidateTasks();
    return { ok: true, task };
  } catch (error) {
    return taskError(error);
  }
}

export async function updateTaskAction(
  taskId: string,
  input: z.infer<typeof taskInputSchema>,
): Promise<TaskActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = taskInputSchema.safeParse(input);
  if (!taskId || !parsed.success) {
    return { ok: false, message: parsed.success ? "Задача не найдена" : parsed.error.issues[0]?.message };
  }
  try {
    const task = updateClientTask(client.id, taskId, parsed.data);
    revalidateTasks();
    revalidatePath(`/client/tasks/${taskId}`);
    return { ok: true, task };
  } catch (error) {
    return taskError(error);
  }
}

export async function moveTaskAction(input: {
  taskId: string;
  status: z.infer<typeof statusSchema>;
  expectedUpdatedAt: number;
}): Promise<TaskActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    taskId: z.string().min(1),
    status: statusSchema,
    expectedUpdatedAt: z.number().int().positive(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Не удалось перенести задачу. Обновите страницу и попробуйте снова" };
  try {
    const task = moveClientTask(
      client.id,
      parsed.data.taskId,
      parsed.data.status,
      parsed.data.expectedUpdatedAt,
    );
    revalidateTasks();
    return { ok: true, task };
  } catch (error) {
    return taskError(error);
  }
}

export async function deleteTaskAction(taskId: string): Promise<TaskActionResult> {
  const client = await requireRole("CLIENT");
  if (!taskId) return { ok: false, message: "Задача не найдена" };
  try {
    deleteClientTask(client.id, taskId);
    revalidateTasks();
    return { ok: true };
  } catch (error) {
    return taskError(error);
  }
}
