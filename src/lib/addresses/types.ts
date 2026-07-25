export type ClientAddress = {
  id: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  comment: string;
  isPrimary: boolean;
};

export type ClientAddressInput = Omit<ClientAddress, "id" | "isPrimary"> & {
  isPrimary?: boolean;
};

export type AddressActionResult = {
  ok: boolean;
  message?: string;
  address?: ClientAddress;
};
