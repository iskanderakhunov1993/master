import { z } from "zod";

export const addressSchema = z.object({
  city: z.string().trim().min(2, "Укажите город").max(100, "Название города слишком длинное"),
  street: z.string().trim().min(2, "Укажите улицу").max(160, "Название улицы слишком длинное"),
  house: z.string().trim().min(1, "Укажите дом").max(30, "Номер дома слишком длинный"),
  apartment: z.string().trim().max(20, "Номер квартиры слишком длинный").optional().default(""),
  comment: z.string().trim().max(500, "Комментарий слишком длинный").optional().default(""),
  isPrimary: z.boolean().optional(),
});
