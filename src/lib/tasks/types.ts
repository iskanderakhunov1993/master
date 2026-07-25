export type ClientTaskStatus = "TODO" | "PLANNED" | "MASTER_FOUND" | "DONE";
export type ClientTaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type ClientTaskPhoto = {
  id: string;
  url: string;
  fileName: string;
  byteSize: number;
};

export type ClientTask = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  priority: ClientTaskPriority;
  desiredDate: number | null;
  status: ClientTaskStatus;
  linkedOrderId: string | null;
  linkedOrderStatus: string | null;
  createdAt: number;
  updatedAt: number;
  photos: ClientTaskPhoto[];
};

export type ClientTaskInput = {
  title: string;
  description?: string;
  categoryId?: string;
  priority: ClientTaskPriority;
  desiredDate?: number | null;
};

export type TaskActionResult = {
  ok: boolean;
  message?: string;
  task?: ClientTask;
};
