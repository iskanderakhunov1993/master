import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

import type { ClientAddress, ClientAddressInput } from "./types";

type AddressRow = {
  id: string;
  city: string;
  street: string;
  house: string;
  apartment: string | null;
  comment: string | null;
  isPrimary: number;
};

function mapAddress(row: AddressRow): ClientAddress {
  return {
    id: row.id,
    city: row.city,
    street: row.street,
    house: row.house,
    apartment: row.apartment ?? "",
    comment: row.comment ?? "",
    isPrimary: row.isPrimary === 1,
  };
}

export function listClientAddresses(clientId: string) {
  const rows = getDb()
    .prepare(
      `SELECT id, city, street, house, apartment, comment, is_primary AS isPrimary
      FROM client_addresses
      WHERE client_id = ?
      ORDER BY is_primary DESC, updated_at DESC`,
    )
    .all(clientId) as AddressRow[];

  return rows.map(mapAddress);
}

export function findClientAddress(clientId: string, addressId: string) {
  const row = getDb()
    .prepare(
      `SELECT id, city, street, house, apartment, comment, is_primary AS isPrimary
      FROM client_addresses
      WHERE id = ? AND client_id = ?`,
    )
    .get(addressId, clientId) as AddressRow | undefined;

  return row ? mapAddress(row) : null;
}

export function createClientAddress(clientId: string, input: ClientAddressInput) {
  const database = getDb();
  const id = randomUUID();
  const now = Date.now();

  database.transaction(() => {
    const addressCount = database
      .prepare("SELECT COUNT(*) AS count FROM client_addresses WHERE client_id = ?")
      .get(clientId) as { count: number };
    const makePrimary = Boolean(input.isPrimary) || addressCount.count === 0;

    if (makePrimary) {
      database
        .prepare("UPDATE client_addresses SET is_primary = 0, updated_at = ? WHERE client_id = ?")
        .run(now, clientId);
    }

    database
      .prepare(
        `INSERT INTO client_addresses (
          id, client_id, city, street, house, apartment, comment,
          is_primary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        clientId,
        input.city,
        input.street,
        input.house,
        input.apartment || null,
        input.comment || null,
        makePrimary ? 1 : 0,
        now,
        now,
      );
  })();

  return findClientAddress(clientId, id)!;
}

export function updateClientAddress(
  clientId: string,
  addressId: string,
  input: ClientAddressInput,
) {
  const result = getDb()
    .prepare(
      `UPDATE client_addresses
      SET city = ?, street = ?, house = ?, apartment = ?, comment = ?, updated_at = ?
      WHERE id = ? AND client_id = ?`,
    )
    .run(
      input.city,
      input.street,
      input.house,
      input.apartment || null,
      input.comment || null,
      Date.now(),
      addressId,
      clientId,
    );

  return result.changes === 1 ? findClientAddress(clientId, addressId) : null;
}

export function deleteClientAddress(clientId: string, addressId: string) {
  const database = getDb();

  return database.transaction(() => {
    const address = findClientAddress(clientId, addressId);
    if (!address) return false;

    database
      .prepare("DELETE FROM client_addresses WHERE id = ? AND client_id = ?")
      .run(addressId, clientId);

    if (address.isPrimary) {
      const replacement = database
        .prepare(
          `SELECT id FROM client_addresses
          WHERE client_id = ?
          ORDER BY updated_at DESC
          LIMIT 1`,
        )
        .get(clientId) as { id: string } | undefined;

      if (replacement) {
        database
          .prepare("UPDATE client_addresses SET is_primary = 1, updated_at = ? WHERE id = ?")
          .run(Date.now(), replacement.id);
      }
    }

    return true;
  })();
}

export function setPrimaryClientAddress(clientId: string, addressId: string) {
  const database = getDb();

  return database.transaction(() => {
    const address = findClientAddress(clientId, addressId);
    if (!address) return false;

    const now = Date.now();
    database
      .prepare("UPDATE client_addresses SET is_primary = 0, updated_at = ? WHERE client_id = ?")
      .run(now, clientId);
    database
      .prepare("UPDATE client_addresses SET is_primary = 1, updated_at = ? WHERE id = ? AND client_id = ?")
      .run(now, addressId, clientId);
    return true;
  })();
}
