import type { VerificationStatus } from "./types";

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  NOT_STARTED: "Не начата",
  PENDING: "На проверке",
  VERIFIED: "Личность подтверждена",
  REJECTED: "Нужно исправить данные",
};

export function formatRating(rating: number | null) {
  return rating === null ? "—" : rating.toFixed(1).replace(".0", "");
}

export function formatReviewCount(count: number) {
  const remainder100 = count % 100;
  const remainder10 = count % 10;
  const word = remainder100 >= 11 && remainder100 <= 14
    ? "отзывов"
    : remainder10 === 1
      ? "отзыв"
      : remainder10 >= 2 && remainder10 <= 4
        ? "отзыва"
        : "отзывов";
  return `${count} ${word}`;
}

export function formatExperience(years: number) {
  if (years === 0) return "Начинающий специалист";
  const remainder100 = years % 100;
  const remainder10 = years % 10;
  const word = remainder100 >= 11 && remainder100 <= 14
    ? "лет"
    : remainder10 === 1
      ? "год"
      : remainder10 >= 2 && remainder10 <= 4
        ? "года"
        : "лет";
  return `${years} ${word} опыта`;
}
