import { validateMasterImage } from "@/lib/masters/media";
import type { MasterMedia, MasterMediaKind } from "@/lib/masters/types";

export async function uploadMasterImage(
  file: File,
  kind: MasterMediaKind,
  replaceId?: string,
) {
  const validationError = validateMasterImage({ mimeType: file.type, byteSize: file.size });
  if (validationError) throw new Error(validationError.message);

  const formData = new FormData();
  formData.set("file", file);
  const params = new URLSearchParams({ kind });
  if (replaceId) params.set("replace", replaceId);
  const response = await fetch(`/api/master/media?${params}`, { method: "POST", body: formData });
  const payload = await response.json() as { media?: MasterMedia; message?: string };
  if (!response.ok || !payload.media) {
    throw new Error(payload.message ?? "Не удалось загрузить изображение");
  }
  return payload.media;
}

export async function removeMasterImage(mediaId: string, kind: "AVATAR" | "PORTFOLIO") {
  const response = await fetch(`/api/master/media/${mediaId}?kind=${kind}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = await response.json() as { message?: string };
    throw new Error(payload.message ?? "Не удалось удалить изображение");
  }
}
