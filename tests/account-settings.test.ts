import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const databaseFilename = "master-ryadom-account-settings-test.db";
process.env.DATABASE_FILENAME = databaseFilename;
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(resolve(process.cwd(), ".data", `${databaseFilename}${suffix}`), { force: true });
}

test("a client can update their name and email, but not onto an address already taken", async () => {
  const { createUser } = await import("../src/lib/auth/repository");
  const { findUserById, updateUserProfile } = await import("../src/lib/auth/repository");

  const client = createUser({ name: "Анна", email: "anna@example.test", passwordHash: "hash", role: "CLIENT" });
  const other = createUser({ name: "Борис", email: "boris@example.test", passwordHash: "hash", role: "CLIENT" });

  updateUserProfile(client.id, { name: "Анна Иванова", email: "anna.ivanova@example.test" });
  const updated = findUserById(client.id);
  assert.equal(updated?.name, "Анна Иванова");
  assert.equal(updated?.email, "anna.ivanova@example.test");

  assert.throws(
    () => updateUserProfile(client.id, { name: "Анна", email: "boris@example.test" }),
    /EMAIL_TAKEN/,
  );
  // The failed attempt must not have partially applied.
  assert.equal(findUserById(client.id)?.email, "anna.ivanova@example.test");
  assert.equal(findUserById(other.id)?.email, "boris@example.test");
});

test("changing a password replaces the stored hash and the old one stops matching", async () => {
  const { compare, hash } = await import("bcryptjs");
  const { createUser, findUserById, updateUserPassword } = await import("../src/lib/auth/repository");

  const originalHash = await hash("Original123!", 12);
  const user = createUser({ name: "Мастер", email: "master.pw@example.test", passwordHash: originalHash, role: "MASTER" });

  const nextHash = await hash("BrandNew456!", 12);
  updateUserPassword(user.id, nextHash);

  const reloaded = findUserById(user.id);
  assert.equal(await compare("Original123!", reloaded!.passwordHash), false);
  assert.equal(await compare("BrandNew456!", reloaded!.passwordHash), true);
});

test("the account validation schemas reject the same shapes the rest of the app rejects", async () => {
  const { changePasswordSchema, updateAccountSchema } = await import("../src/lib/auth/validation");

  assert.equal(updateAccountSchema.safeParse({ name: "A", email: "not-an-email" }).success, false);
  assert.equal(updateAccountSchema.safeParse({ name: "Полное Имя", email: "ok@example.test" }).success, true);

  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short", confirmPassword: "short" }).success,
    false,
  );
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "LongEnough1", confirmPassword: "Mismatch1" }).success,
    false,
  );
  assert.equal(
    changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "LongEnough1", confirmPassword: "LongEnough1" }).success,
    true,
  );
});
