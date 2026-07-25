"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";

import {
  createClientAddress,
  deleteClientAddress,
  setPrimaryClientAddress,
  updateClientAddress,
} from "./repository";
import type { AddressActionResult, ClientAddressInput } from "./types";
import { addressSchema } from "./validation";

function parseInput(input: ClientAddressInput): AddressActionResult | z.infer<typeof addressSchema> {
  const result = addressSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? "Проверьте адрес" };
  }
  return result.data;
}

function refreshAddresses() {
  revalidatePath("/client");
  revalidatePath("/client/addresses");
  revalidatePath("/client/orders/new");
}

export async function createAddressAction(input: ClientAddressInput): Promise<AddressActionResult> {
  const user = await requireRole("CLIENT");
  const parsed = parseInput(input);
  if ("ok" in parsed) return parsed;

  const address = createClientAddress(user.id, parsed);
  refreshAddresses();
  return { ok: true, address };
}

export async function updateAddressAction(
  addressId: string,
  input: ClientAddressInput,
): Promise<AddressActionResult> {
  const user = await requireRole("CLIENT");
  const parsed = parseInput(input);
  if ("ok" in parsed) return parsed;

  const address = updateClientAddress(user.id, addressId, parsed);
  if (!address) return { ok: false, message: "Адрес не найден" };

  refreshAddresses();
  return { ok: true, address };
}

export async function deleteAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await requireRole("CLIENT");
  if (!deleteClientAddress(user.id, addressId)) {
    return { ok: false, message: "Адрес не найден" };
  }

  refreshAddresses();
  return { ok: true };
}

export async function setPrimaryAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await requireRole("CLIENT");
  if (!setPrimaryClientAddress(user.id, addressId)) {
    return { ok: false, message: "Адрес не найден" };
  }

  refreshAddresses();
  return { ok: true };
}
