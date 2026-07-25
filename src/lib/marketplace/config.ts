function readInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function getMarketplaceConfig() {
  return {
    normalMatchTtlMinutes: readInteger(process.env.NORMAL_MATCH_TTL_MINUTES, 120, 15, 1440),
    urgentMatchTtlMinutes: readInteger(process.env.URGENT_MATCH_TTL_MINUTES, 45, 10, 240),
    offerTtlMinutes: readInteger(process.env.MASTER_OFFER_TTL_MINUTES, 20, 5, 120),
  };
}
