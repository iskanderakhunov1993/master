const DEFAULT_URGENCY_MULTIPLIER = 2;
const MIN_URGENCY_MULTIPLIER = 1;
const MAX_URGENCY_MULTIPLIER = 5;

export function getUrgencyConfig() {
  const configured = Number(process.env.URGENCY_MULTIPLIER);
  const multiplier = Number.isFinite(configured)
    ? Math.min(MAX_URGENCY_MULTIPLIER, Math.max(MIN_URGENCY_MULTIPLIER, configured))
    : DEFAULT_URGENCY_MULTIPLIER;

  return {
    multiplier,
    basisPoints: Math.round(multiplier * 10_000),
  };
}

export function calculateUrgentPrice(basePriceMinor: number, multiplierBps: number) {
  return Math.round((basePriceMinor * multiplierBps) / 10_000);
}

// Per the P0 spec: MVP jobs (household repair under 15 000 ₽) carry a flat
// 30-day warranty from the master. Larger/scoped work would negotiate its
// own term per offer — out of scope until that flow exists.
const DEFAULT_WARRANTY_DAYS = 30;
const MIN_WARRANTY_DAYS = 1;
const MAX_WARRANTY_DAYS = 365;

export function getWarrantyDurationDays() {
  const configured = Number(process.env.WARRANTY_DEFAULT_DAYS);
  return Number.isFinite(configured)
    ? Math.min(MAX_WARRANTY_DAYS, Math.max(MIN_WARRANTY_DAYS, Math.round(configured)))
    : DEFAULT_WARRANTY_DAYS;
}
