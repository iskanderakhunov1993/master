/**
 * Production runs on Neon. SQLite is deliberately retained only for the local
 * deterministic test suite while the remaining repositories are migrated.
 */
export function usesPostgresRuntime() {
  return process.env.VERCEL === "1" && Boolean(process.env.DATABASE_URL);
}
