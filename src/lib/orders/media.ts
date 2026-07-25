export const MAX_ORDER_PHOTOS = 5;
export const MAX_ORDER_PHOTO_SIZE = 8 * 1024 * 1024;

export const ALLOWED_ORDER_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type OrderPhotoMimeType = (typeof ALLOWED_ORDER_PHOTO_TYPES)[number];

const allowedPhotoTypes = new Set<string>(ALLOWED_ORDER_PHOTO_TYPES);

export type OrderPhotoValidationError = {
  code: "INVALID_TYPE" | "INVALID_SIZE" | "INVALID_CONTENT";
  message: string;
};

function hasPrefix(content: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => content[index] === byte);
}

function hasValidImageSignature(mimeType: OrderPhotoMimeType, content: Uint8Array) {
  if (mimeType === "image/jpeg") {
    return content.length >= 3 && hasPrefix(content, [0xff, 0xd8, 0xff]);
  }
  if (mimeType === "image/png") {
    return content.length >= 8 && hasPrefix(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  return content.length >= 12
    && hasPrefix(content, [0x52, 0x49, 0x46, 0x46])
    && content[8] === 0x57
    && content[9] === 0x45
    && content[10] === 0x42
    && content[11] === 0x50;
}

export function validateOrderPhoto(input: {
  mimeType: string;
  byteSize: number;
  content?: Uint8Array;
}): OrderPhotoValidationError | null {
  if (!allowedPhotoTypes.has(input.mimeType)) {
    return { code: "INVALID_TYPE", message: "Поддерживаются JPG, PNG и WebP" };
  }
  if (input.byteSize === 0 || input.byteSize > MAX_ORDER_PHOTO_SIZE) {
    return { code: "INVALID_SIZE", message: "Размер фотографии не должен превышать 8 МБ" };
  }
  if (
    input.content
    && !hasValidImageSignature(input.mimeType as OrderPhotoMimeType, input.content)
  ) {
    return { code: "INVALID_CONTENT", message: "Файл не является корректным JPG, PNG или WebP" };
  }
  return null;
}
