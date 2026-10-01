import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type GlobalDatabase = typeof globalThis & {
  masterRyadomDb?: Database.Database;
};

const globalDatabase = globalThis as GlobalDatabase;

function getDatabasePath() {
  const configuredFilename = process.env.DATABASE_FILENAME?.trim();
  const filename = configuredFilename && /^[a-zA-Z0-9._-]+$/.test(configuredFilename)
    ? configuredFilename
    : "master-ryadom.db";

  return path.join(process.cwd(), ".data", filename);
}

function hasColumn(database: Database.Database, table: string, column: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((candidate) => candidate.name === column);
}

function migrateOrderStatuses(database: Database.Database) {
  const schema = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'")
    .get() as { sql: string } | undefined;

  if (!schema) return;
  const selectionColumns = [
    "selected_master_id",
    "selected_offer_id",
    "agreed_price_minor",
    "master_selected_at",
    "master_confirmed_at",
  ];
  const existingSelectionColumns = new Set(
    selectionColumns.filter((column) => hasColumn(database, "orders", column)),
  );
  if (
    schema.sql.includes("'MASTER_ON_THE_WAY'")
    && existingSelectionColumns.size === selectionColumns.length
  ) return;

  database.pragma("foreign_keys = OFF");
  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE orders_next (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN (
            'DRAFT',
            'SEARCHING_MASTERS',
            'OFFERS_RECEIVED',
            'MASTER_SELECTED',
            'MASTER_CONFIRMED',
            'MASTER_ON_THE_WAY',
            'MASTER_ARRIVED',
            'COMPLETED_BY_MASTER',
            'REVIEWED',
            'CANCELLED_BY_CLIENT',
            'CANCELLED_BY_MASTER',
            'DISPUTED',
            'AWAITING_SELECTION',
            'SEARCH_EXHAUSTED',
            'ASSIGNED',
            'EN_ROUTE',
            'ARRIVED',
            'IN_PROGRESS',
            'AWAITING_CONFIRMATION',
            'COMPLETED',
            'CANCELLED'
          )),
          description TEXT,
          category_id TEXT,
          subcategory_id TEXT,
          address_id TEXT,
          address_city TEXT,
          address_street TEXT,
          address_house TEXT,
          address_apartment TEXT,
          address_comment TEXT,
          schedule_kind TEXT CHECK (schedule_kind IN ('NOW', 'TODAY', 'CUSTOM')),
          scheduled_at INTEGER,
          order_type TEXT NOT NULL DEFAULT 'NORMAL' CHECK (order_type IN ('NORMAL', 'URGENT')),
          base_price_minor INTEGER,
          urgency_multiplier_bps INTEGER NOT NULL DEFAULT 10000,
          total_price_minor INTEGER,
          current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 8),
          version INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          submitted_at INTEGER,
          selected_master_id TEXT,
          selected_offer_id TEXT,
          agreed_price_minor INTEGER,
          master_selected_at INTEGER,
          master_confirmed_at INTEGER,
          FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES service_categories(id),
          FOREIGN KEY (subcategory_id) REFERENCES service_subcategories(id),
          FOREIGN KEY (address_id) REFERENCES client_addresses(id) ON DELETE SET NULL,
          FOREIGN KEY (selected_master_id) REFERENCES master_profiles(master_id),
          FOREIGN KEY (selected_offer_id) REFERENCES master_offers(id)
        );

        INSERT INTO orders_next (
          id, client_id, status, description, category_id, subcategory_id,
          address_id, address_city, address_street, address_house,
          address_apartment, address_comment, schedule_kind, scheduled_at,
          order_type, base_price_minor, urgency_multiplier_bps, total_price_minor,
          current_step, version, created_at, updated_at, submitted_at,
          selected_master_id, selected_offer_id, agreed_price_minor,
          master_selected_at, master_confirmed_at
        )
        SELECT
          id, client_id, status, description, category_id, subcategory_id,
          address_id, address_city, address_street, address_house,
          address_apartment, address_comment, schedule_kind, scheduled_at,
          order_type, base_price_minor, urgency_multiplier_bps, total_price_minor,
          current_step, version, created_at, updated_at, submitted_at,
          ${existingSelectionColumns.has("selected_master_id") ? "selected_master_id" : "NULL"},
          ${existingSelectionColumns.has("selected_offer_id") ? "selected_offer_id" : "NULL"},
          ${existingSelectionColumns.has("agreed_price_minor") ? "agreed_price_minor" : "NULL"},
          ${existingSelectionColumns.has("master_selected_at") ? "master_selected_at" : "NULL"},
          ${existingSelectionColumns.has("master_confirmed_at") ? "master_confirmed_at" : "NULL"}
        FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_next RENAME TO orders;

        CREATE UNIQUE INDEX orders_one_draft_per_client
          ON orders(client_id)
          WHERE status = 'DRAFT';
        CREATE INDEX orders_client_status_idx
          ON orders(client_id, status, updated_at DESC);
        CREATE INDEX orders_selected_master_idx
          ON orders(selected_master_id, status, updated_at DESC);
      `);
    })();
  } finally {
    database.pragma("foreign_keys = ON");
  }
}

function migrateClientTasks(database: Database.Database) {
  const schema = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'client_tasks'")
    .get() as { sql: string } | undefined;
  if (!schema) return;
  if (schema.sql.includes("'MASTER_FOUND'") && hasColumn(database, "client_tasks", "linked_order_id")) {
    return;
  }

  const hasDueAt = hasColumn(database, "client_tasks", "due_at");
  database.pragma("foreign_keys = OFF");
  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE client_tasks_next (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          category_id TEXT,
          priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
          desired_date INTEGER,
          status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN (
            'TODO', 'PLANNED', 'MASTER_FOUND', 'DONE'
          )),
          linked_order_id TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
          FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL
        );

        INSERT INTO client_tasks_next (
          id, client_id, title, description, category_id, priority,
          desired_date, status, linked_order_id, created_at, updated_at
        )
        SELECT
          id, client_id, title, NULL, NULL, 'MEDIUM',
          ${hasDueAt ? "due_at" : "NULL"},
          CASE
            WHEN status = 'DONE' THEN 'DONE'
            WHEN ${hasDueAt ? "due_at IS NOT NULL" : "0"} THEN 'PLANNED'
            ELSE 'TODO'
          END,
          NULL, created_at, updated_at
        FROM client_tasks;

        DROP TABLE client_tasks;
        ALTER TABLE client_tasks_next RENAME TO client_tasks;

        CREATE INDEX client_tasks_upcoming_idx
          ON client_tasks(client_id, status, desired_date);
        CREATE UNIQUE INDEX client_tasks_linked_order_idx
          ON client_tasks(linked_order_id)
          WHERE linked_order_id IS NOT NULL;
      `);
    })();
  } finally {
    database.pragma("foreign_keys = ON");
  }
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
      blocked_at INTEGER,
      blocked_by TEXT,
      block_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('CLIENT', 'MASTER', 'ADMIN')),
      is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, role),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_primary
      ON user_roles(user_id)
      WHERE is_primary = 1;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS service_subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      UNIQUE (category_id, slug),
      FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS client_addresses (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      city TEXT NOT NULL,
      street TEXT NOT NULL,
      house TEXT NOT NULL,
      apartment TEXT,
      comment TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS client_addresses_one_primary
      ON client_addresses(client_id)
      WHERE is_primary = 1;
    CREATE INDEX IF NOT EXISTS client_addresses_client_idx
      ON client_addresses(client_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN (
        'DRAFT',
        'SEARCHING_MASTERS',
        'OFFERS_RECEIVED',
        'MASTER_SELECTED',
        'MASTER_CONFIRMED',
        'MASTER_ON_THE_WAY',
        'MASTER_ARRIVED',
        'COMPLETED_BY_MASTER',
        'REVIEWED',
        'CANCELLED_BY_CLIENT',
        'CANCELLED_BY_MASTER',
        'DISPUTED',
        'AWAITING_SELECTION',
        'SEARCH_EXHAUSTED',
        'ASSIGNED',
        'EN_ROUTE',
        'ARRIVED',
        'IN_PROGRESS',
        'AWAITING_CONFIRMATION',
        'COMPLETED',
        'CANCELLED'
      )),
      description TEXT,
      category_id TEXT,
      subcategory_id TEXT,
      address_id TEXT,
      address_city TEXT,
      address_street TEXT,
      address_house TEXT,
      address_apartment TEXT,
      address_comment TEXT,
      schedule_kind TEXT CHECK (schedule_kind IN ('NOW', 'TODAY', 'CUSTOM')),
      scheduled_at INTEGER,
      order_type TEXT NOT NULL DEFAULT 'NORMAL' CHECK (order_type IN ('NORMAL', 'URGENT')),
      base_price_minor INTEGER,
      urgency_multiplier_bps INTEGER NOT NULL DEFAULT 10000,
      total_price_minor INTEGER,
      current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 8),
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      submitted_at INTEGER,
      selected_master_id TEXT,
      selected_offer_id TEXT,
      agreed_price_minor INTEGER,
      master_selected_at INTEGER,
      master_confirmed_at INTEGER,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES service_categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES service_subcategories(id),
      FOREIGN KEY (address_id) REFERENCES client_addresses(id) ON DELETE SET NULL,
      FOREIGN KEY (selected_master_id) REFERENCES master_profiles(master_id),
      FOREIGN KEY (selected_offer_id) REFERENCES master_offers(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS orders_one_draft_per_client
      ON orders(client_id)
      WHERE status = 'DRAFT';
    CREATE INDEX IF NOT EXISTS orders_client_status_idx
      ON orders(client_id, status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS service_subscriptions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      address_id TEXT,
      service_area_id TEXT NOT NULL,
      description TEXT NOT NULL,
      address_city TEXT NOT NULL,
      address_street TEXT NOT NULL,
      address_house TEXT NOT NULL,
      address_apartment TEXT,
      address_comment TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY')),
      next_service_at INTEGER NOT NULL,
      base_price_minor INTEGER NOT NULL CHECK (base_price_minor >= 50000),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      paused_at INTEGER,
      cancelled_at INTEGER,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES service_categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES service_subcategories(id),
      FOREIGN KEY (address_id) REFERENCES client_addresses(id) ON DELETE SET NULL,
      FOREIGN KEY (service_area_id) REFERENCES service_areas(id)
    );

    CREATE INDEX IF NOT EXISTS service_subscriptions_client_status_idx
      ON service_subscriptions(client_id, status, next_service_at);

    CREATE TABLE IF NOT EXISTS subscription_orders (
      subscription_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      cycle_number INTEGER NOT NULL CHECK (cycle_number > 0),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (subscription_id, cycle_number),
      FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS subscription_orders_order_idx
      ON subscription_orders(order_id);

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_user_id TEXT,
      actor_role TEXT CHECK (actor_role IN ('CLIENT', 'MASTER', 'ADMIN', 'SYSTEM')),
      reason TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS order_status_history_order_idx
      ON order_status_history(order_id, created_at, id);

    -- Change order: a master-proposed new total price the client must accept
    -- before it takes effect. The old price stays in force until then.
    CREATE TABLE IF NOT EXISTS order_change_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      requested_by_master_id TEXT NOT NULL,
      previous_price_minor INTEGER NOT NULL,
      proposed_price_minor INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
      created_at INTEGER NOT NULL,
      responded_at INTEGER,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_by_master_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS order_change_requests_one_pending
      ON order_change_requests(order_id)
      WHERE status = 'PENDING';

    CREATE INDEX IF NOT EXISTS order_change_requests_order_idx
      ON order_change_requests(order_id, created_at);

    -- Work evidence: master-submitted proof photos, separate from the
    -- client's intake photos in order_media. Never deletable once uploaded —
    -- they are evidence, not draft attachments.
    CREATE TABLE IF NOT EXISTS order_work_media (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      master_id TEXT NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN ('BEFORE', 'AFTER')),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_work_media_order_idx
      ON order_work_media(order_id, stage, created_at);

    -- Order chat: kept in-app and tied to the order so agreements have a
    -- record, instead of leaking into phone calls the platform can't see.
    CREATE TABLE IF NOT EXISTS order_messages (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('CLIENT', 'MASTER')),
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_messages_order_idx
      ON order_messages(order_id, created_at);

    -- Warranty: platform records the master's commitment and helps open a
    -- claim, but the master carries the obligation, not the platform.
    CREATE TABLE IF NOT EXISTS order_warranties (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      client_id TEXT NOT NULL,
      master_id TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      claim_complaint_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (claim_complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS order_warranties_client_idx
      ON order_warranties(client_id, ends_at DESC);

    CREATE TABLE IF NOT EXISTS order_reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('CLIENT', 'MASTER')),
      overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
      quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
      punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
      communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
      agreement_rating INTEGER CHECK (agreement_rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE (order_id, reviewer_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_reviews_order_idx
      ON order_reviews(order_id, created_at);
    CREATE INDEX IF NOT EXISTS order_reviews_reviewee_idx
      ON order_reviews(reviewee_id, reviewer_role, created_at DESC);

    CREATE TABLE IF NOT EXISTS order_media (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_media_order_idx
      ON order_media(order_id, created_at);

    CREATE TABLE IF NOT EXISTS client_tasks (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
      desired_date INTEGER,
      status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN (
        'TODO', 'PLANNED', 'MASTER_FOUND', 'DONE'
      )),
      linked_order_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS client_tasks_status_idx
      ON client_tasks(client_id, status);
    CREATE TABLE IF NOT EXISTS client_task_media (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES client_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS client_task_media_task_idx
      ON client_task_media(task_id, created_at);
    CREATE INDEX IF NOT EXISTS client_task_media_client_idx
      ON client_task_media(client_id, task_id, created_at);

    CREATE TABLE IF NOT EXISTS service_areas (
      id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      UNIQUE (city, name)
    );

    CREATE TABLE IF NOT EXISTS master_profiles (
      master_id TEXT PRIMARY KEY,
      phone TEXT,
      experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 70),
      bio TEXT,
      verification_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (verification_status IN (
        'NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED'
      )),
      verification_rejection_reason TEXT,
      is_online INTEGER NOT NULL DEFAULT 0 CHECK (is_online IN (0, 1)),
      is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
      onboarding_step INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 6),
      onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
      completed_jobs INTEGER NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
      rating_x100 INTEGER NOT NULL DEFAULT 0 CHECK (rating_x100 BETWEEN 0 AND 500),
      reviews_count INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
      master_cancellations INTEGER NOT NULL DEFAULT 0 CHECK (master_cancellations >= 0),
      no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
      late_arrivals INTEGER NOT NULL DEFAULT 0 CHECK (late_arrivals >= 0),
      confirmed_completions INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_completions >= 0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (master_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS master_profiles_presence_idx
      ON master_profiles(is_online, verification_status);

    CREATE TABLE IF NOT EXISTS master_categories (
      master_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (master_id, category_id),
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS master_service_areas (
      master_id TEXT NOT NULL,
      service_area_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (master_id, service_area_id),
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE,
      FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS master_media (
      id TEXT PRIMARY KEY,
      master_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('AVATAR', 'IDENTITY', 'PORTFOLIO')),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS master_media_one_avatar
      ON master_media(master_id)
      WHERE kind = 'AVATAR';
    CREATE INDEX IF NOT EXISTS master_media_owner_kind_idx
      ON master_media(master_id, kind, created_at DESC);

    CREATE TABLE IF NOT EXISTS master_verification_applications (
      id TEXT PRIMARY KEY,
      master_id TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK (document_type IN ('PASSPORT')),
      document_last_four TEXT NOT NULL,
      document_media_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      rejection_reason TEXT,
      submitted_at INTEGER NOT NULL,
      reviewed_at INTEGER,
      reviewed_by TEXT,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE,
      FOREIGN KEY (document_media_id) REFERENCES master_media(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS master_verification_status_idx
      ON master_verification_applications(status, submitted_at);

    CREATE TABLE IF NOT EXISTS master_reviews (
      id TEXT PRIMARY KEY,
      master_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
      punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
      communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
      agreement_rating INTEGER CHECK (agreement_rating BETWEEN 1 AND 5),
      created_at INTEGER NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS master_reviews_public_idx
      ON master_reviews(master_id, is_published, created_at DESC);

    CREATE TABLE IF NOT EXISTS master_work_history (
      id TEXT PRIMARY KEY,
      master_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS master_work_history_idx
      ON master_work_history(master_id, completed_at DESC);

    CREATE TABLE IF NOT EXISTS master_category_stats (
      master_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      completed_jobs INTEGER NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (master_id, category_id),
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_assignments (
      order_id TEXT PRIMARY KEY,
      master_id TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_assignments_master_idx
      ON order_assignments(master_id, assigned_at DESC);

    CREATE TABLE IF NOT EXISTS order_service_areas (
      order_id TEXT PRIMARY KEY,
      service_area_id TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (service_area_id) REFERENCES service_areas(id)
    );

    CREATE TABLE IF NOT EXISTS order_matches (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      master_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('NEW', 'VIEWED', 'OFFERED', 'SKIPPED', 'EXPIRED')),
      approx_distance_km_x10 INTEGER NOT NULL CHECK (approx_distance_km_x10 >= 0),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (order_id, master_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS order_matches_master_feed_idx
      ON order_matches(master_id, status, expires_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS master_offers (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      master_id TEXT NOT NULL,
      proposed_price_minor INTEGER NOT NULL CHECK (proposed_price_minor > 0),
      eta_minutes INTEGER NOT NULL CHECK (eta_minutes BETWEEN 5 AND 240),
      comment TEXT,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS master_offers_one_active_per_master_order
      ON master_offers(order_id, master_id)
      WHERE status = 'ACTIVE';
    CREATE INDEX IF NOT EXISTS master_offers_order_status_idx
      ON master_offers(order_id, status, expires_at);
    CREATE INDEX IF NOT EXISTS master_offers_master_idx
      ON master_offers(master_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS master_order_skips (
      order_id TEXT NOT NULL,
      master_id TEXT NOT NULL,
      skipped_at INTEGER NOT NULL,
      PRIMARY KEY (order_id, master_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (master_id) REFERENCES master_profiles(master_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      against_user_id TEXT,
      kind TEXT NOT NULL DEFAULT 'DISPUTE' CHECK (kind IN ('DISPUTE', 'COMPLAINT')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED')),
      subject TEXT NOT NULL,
      description TEXT,
      resolution TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by TEXT,
      UNIQUE (order_id, reporter_id, kind),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (against_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS complaints_status_idx
      ON complaints(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
      ON admin_audit_log(created_at DESC);

    INSERT OR IGNORE INTO service_categories (id, slug, name, sort_order) VALUES
      ('plumbing', 'plumbing', 'Сантехника', 10),
      ('electrical', 'electrical', 'Электрика', 20),
      ('furniture-assembly', 'furniture-assembly', 'Сборка мебели', 30),
      ('installation', 'installation', 'Установка', 40),
      ('small-repair', 'small-repair', 'Мелкий ремонт', 50),
      ('other', 'other', 'Другое', 60);

    INSERT OR IGNORE INTO service_subcategories (id, category_id, slug, name, sort_order) VALUES
      ('plumbing-leak', 'plumbing', 'leak', 'Протечка', 10),
      ('plumbing-blockage', 'plumbing', 'blockage', 'Засор', 20),
      ('plumbing-faucet', 'plumbing', 'faucet', 'Смеситель', 30),
      ('plumbing-toilet', 'plumbing', 'toilet', 'Унитаз', 40),
      ('electrical-outlet', 'electrical', 'outlet', 'Розетки и выключатели', 10),
      ('electrical-lighting', 'electrical', 'lighting', 'Освещение', 20),
      ('electrical-wiring', 'electrical', 'wiring', 'Проблема с проводкой', 30),
      ('furniture-cabinet', 'furniture-assembly', 'cabinet', 'Шкаф', 10),
      ('furniture-bed', 'furniture-assembly', 'bed', 'Кровать', 20),
      ('furniture-shelves', 'furniture-assembly', 'shelves', 'Полки и стеллажи', 30),
      ('installation-appliance', 'installation', 'appliance', 'Бытовая техника', 10),
      ('installation-tv', 'installation', 'tv', 'Телевизор', 20),
      ('installation-curtain-rod', 'installation', 'curtain-rod', 'Карниз', 30),
      ('small-repair-door', 'small-repair', 'door', 'Двери и замки', 10),
      ('small-repair-drilling', 'small-repair', 'drilling', 'Сверление стен', 20),
      ('small-repair-sealant', 'small-repair', 'sealant', 'Герметизация', 30),
      ('other-consultation', 'other', 'consultation', 'Нужна консультация', 10),
      ('other-custom', 'other', 'custom', 'Другая задача', 20);

    INSERT OR IGNORE INTO service_areas (id, city, name, sort_order) VALUES
      ('moscow-cao', 'Москва', 'Центральный округ', 10),
      ('moscow-sao', 'Москва', 'Северный округ', 20),
      ('moscow-svao', 'Москва', 'Северо-Восточный округ', 30),
      ('moscow-vao', 'Москва', 'Восточный округ', 40),
      ('moscow-uvao', 'Москва', 'Юго-Восточный округ', 50),
      ('moscow-uao', 'Москва', 'Южный округ', 60),
      ('moscow-uzao', 'Москва', 'Юго-Западный округ', 70),
      ('moscow-zao', 'Москва', 'Западный округ', 80),
      ('moscow-szao', 'Москва', 'Северо-Западный округ', 90),
      ('moscow-zelao', 'Москва', 'Зеленоград', 100),
      ('moscow-nao', 'Москва', 'Новомосковский округ', 110),
      ('moscow-tao', 'Москва', 'Троицкий округ', 120);
  `);

  for (const [column, definition] of [
    ["is_blocked", "INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1))"],
    ["blocked_at", "INTEGER"],
    ["blocked_by", "TEXT REFERENCES users(id) ON DELETE SET NULL"],
    ["block_reason", "TEXT"],
  ] as const) {
    if (!hasColumn(database, "users", column)) {
      database.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    }
  }

  if (!hasColumn(database, "master_profiles", "is_blocked")) {
    database.exec(
      "ALTER TABLE master_profiles ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1))",
    );
  }
  for (const column of [
    "quality_rating",
    "punctuality_rating",
    "communication_rating",
    "agreement_rating",
  ]) {
    if (!hasColumn(database, "master_reviews", column)) {
      database.exec(
        `ALTER TABLE master_reviews ADD COLUMN ${column} INTEGER CHECK (${column} BETWEEN 1 AND 5)`,
      );
    }
  }
  migrateOrderStatuses(database);
  migrateClientTasks(database);
  database.exec(
    `CREATE INDEX IF NOT EXISTS client_tasks_upcoming_idx
    ON client_tasks(client_id, status, desired_date);
    CREATE UNIQUE INDEX IF NOT EXISTS client_tasks_linked_order_idx
    ON client_tasks(linked_order_id)
    WHERE linked_order_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS client_task_media_client_idx
    ON client_task_media(client_id, task_id, created_at)`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS orders_selected_master_idx
    ON orders(selected_master_id, status, updated_at DESC)`,
  );
}

export function getDb() {
  if (!globalDatabase.masterRyadomDb) {
    const databasePath = getDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    const database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    migrate(database);
    globalDatabase.masterRyadomDb = database;
  }

  return globalDatabase.masterRyadomDb;
}
