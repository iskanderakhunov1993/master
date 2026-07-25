import type { ReliabilityResult } from "./types";

export type ReliabilityInput = {
  completedJobs: number;
  masterCancellations: number;
  noShows: number;
  lateArrivals: number;
  confirmedCompletions: number;
};

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clampMetric(value: number) {
  return Math.max(0, Math.floor(value));
}

export function calculateReliability(input: ReliabilityInput): ReliabilityResult {
  const completedJobs = clampMetric(input.completedJobs);
  const cancellations = clampMetric(input.masterCancellations);
  const noShows = clampMetric(input.noShows);
  const lateArrivals = Math.min(completedJobs, clampMetric(input.lateArrivals));
  const confirmedCompletions = Math.min(completedJobs, clampMetric(input.confirmedCompletions));
  const totalCommitments = completedJobs + cancellations + noShows;

  if (totalCommitments === 0) {
    return {
      score: null,
      label: "Нет данных",
      metrics: [
        { label: "Выполненные заказы", value: "0", penalty: 0 },
        { label: "Отмены мастера", value: "0", penalty: 0 },
        { label: "Неявки", value: "0", penalty: 0 },
        { label: "Опоздания", value: "0", penalty: 0 },
        { label: "Подтверждённые завершения", value: "0", penalty: 0 },
      ],
    };
  }

  const cancellationRate = cancellations / totalCommitments;
  const noShowRate = noShows / totalCommitments;
  const lateRate = completedJobs > 0 ? lateArrivals / completedJobs : 0;
  const unconfirmedRate = completedJobs > 0
    ? Math.max(0, completedJobs - confirmedCompletions) / completedJobs
    : 0;

  const cancellationPenalty = Math.min(25, cancellationRate * 25);
  const noShowPenalty = Math.min(35, noShowRate * 35);
  const latePenalty = Math.min(15, lateRate * 15);
  const completionPenalty = Math.min(25, unconfirmedRate * 25);
  const score = Math.round(Math.max(
    0,
    100 - cancellationPenalty - noShowPenalty - latePenalty - completionPenalty,
  ));

  return {
    score,
    label: score >= 95 ? "Отличная" : score >= 85 ? "Высокая" : score >= 70 ? "Средняя" : "Требует внимания",
    metrics: [
      { label: "Выполненные заказы", value: String(completedJobs), penalty: 0 },
      { label: "Отмены мастера", value: percentage(cancellationRate), penalty: Math.round(cancellationPenalty) },
      { label: "Неявки", value: percentage(noShowRate), penalty: Math.round(noShowPenalty) },
      { label: "Опоздания", value: percentage(lateRate), penalty: Math.round(latePenalty) },
      { label: "Подтверждённые завершения", value: percentage(completedJobs > 0 ? confirmedCompletions / completedJobs : 0), penalty: Math.round(completionPenalty) },
    ],
  };
}
