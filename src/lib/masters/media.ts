import {
  ALLOWED_ORDER_PHOTO_TYPES,
  MAX_ORDER_PHOTO_SIZE,
  validateOrderPhoto,
} from "@/lib/orders/media";

export const ALLOWED_MASTER_IMAGE_TYPES = ALLOWED_ORDER_PHOTO_TYPES;
export const MAX_MASTER_IMAGE_SIZE = MAX_ORDER_PHOTO_SIZE;
export const MAX_MASTER_PORTFOLIO_ITEMS = 10;

export function validateMasterImage(input: {
  mimeType: string;
  byteSize: number;
  content?: Uint8Array;
}) {
  return validateOrderPhoto(input);
}
