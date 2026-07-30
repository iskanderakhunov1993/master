import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

const forbiddenProperty = /(address|street|house|apartment|phone|email|message|description|coordinate|latitude|longitude|media|document)/i;

export function appendAnalyticsEvent(
  database: Database.Database,
  input: {
    name: string;
    actorId?: string | null;
    actorRole?: string | null;
    orderId?: string | null;
    properties?: Record<string, string | number | boolean | null>;
    occurredAt?: number;
  },
) {
  for (const key of Object.keys(input.properties ?? {})) {
    if (forbiddenProperty.test(key)) throw new Error("ANALYTICS_PROPERTY_FORBIDDEN");
  }
  database.prepare(
    `INSERT INTO analytics_events (
      id, event_name, actor_id, actor_role, order_id, properties_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(), input.name, input.actorId ?? null, input.actorRole ?? null,
    input.orderId ?? null, input.properties ? JSON.stringify(input.properties) : null,
    input.occurredAt ?? Date.now(),
  );
}
