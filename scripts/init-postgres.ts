/**
 * Script to initialize PostgreSQL database for development
 * 
 * Usage:
 *   npx tsx scripts/init-postgres.ts
 * 
 * Requires: PostgreSQL running locally or via Docker
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
};

async function runCommand(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  log.info("Initializing PostgreSQL database for 'Мастер рядом'");

  // Check if .env exists
  if (!existsSync(".env")) {
    log.warn(".env file not found, using .env.local");
  }

  log.info("Step 1: Generate Prisma client...");
  if (!(await runCommand("npx", ["prisma", "generate"]))) {
    log.error("Failed to generate Prisma client");
    process.exit(1);
  }
  log.success("Prisma client generated");

  log.info("Step 2: Pushing schema to database...");
  if (!(await runCommand("npx", ["prisma", "db", "push", "--skip-generate"]))) {
    log.error("Failed to push schema to database. Is PostgreSQL running?");
    log.info("Start PostgreSQL with: docker run --name master-ryadom-db -e POSTGRES_DB=master_ryadom -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16");
    process.exit(1);
  }
  log.success("Database schema created");

  log.success("✨ PostgreSQL database initialized successfully!");
  log.info("Open Prisma Studio: npx prisma studio");
}

main().catch((err) => {
  log.error(`${err}`);
  process.exit(1);
});
