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
