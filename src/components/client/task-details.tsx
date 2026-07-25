"use client";

import { AlertCircle, ArrowLeft, Camera, ExternalLink, LoaderCircle, Save, Trash2, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import type { ServiceCategory } from "@/lib/orders/types";
import { deleteTaskAction, updateTaskAction } from "@/lib/tasks/actions";
import type { ClientTask, ClientTaskPriority } from "@/lib/tasks/types";

function toInput(timestamp: number | null) {
  if (!timestamp) return "";
  const adjusted = new Date(timestamp - new Date().getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export function TaskDetails({ task: initialTask, categories }: { task: ClientTask; categories: ServiceCategory[] }) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [categoryId, setCategoryId] = useState(task.categoryId);
  const [priority, setPriority] = useState<ClientTaskPriority>(task.priority);
  const [desiredDate, setDesiredDate] = useState(toInput(task.desiredDate));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const orderHref = task.linkedOrderId
    ? task.linkedOrderStatus === "DRAFT" ? `/client/orders/new?task=${task.id}` : `/client/orders/${task.linkedOrderId}`
    : `/client/orders/new?task=${task.id}`;

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    const parsedDate = desiredDate ? new Date(desiredDate).getTime() : null;
    const result = await updateTaskAction(task.id, {
      title,
      description,
      categoryId,
      priority,
      desiredDate: parsedDate && Number.isFinite(parsedDate) ? parsedDate : null,
    });
    if (!result.ok || !result.task) setError(result.message ?? "Не удалось сохранить задачу");
    else {
      setTask(result.task);
      setMessage("Изменения сохранены");
      router.refresh();
    }
    setIsSaving(false);
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setIsSaving(true);
    setError("");
    let photos = task.photos;
    for (const file of files.slice(0, 5 - photos.length)) {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch(`/api/client/tasks/${task.id}/media`, { method: "POST", body: data });
      const payload = await response.json() as { photo?: ClientTask["photos"][number]; message?: string };
      if (!response.ok || !payload.photo) {
        setError(payload.message ?? "Не удалось загрузить фото");
        break;
      }
      photos = [...photos, payload.photo];
    }
    setTask((current) => ({ ...current, photos }));
    setIsSaving(false);
  }

  async function removePhoto(mediaId: string) {
    setIsSaving(true);
    const response = await fetch(`/api/client/tasks/${task.id}/media/${mediaId}`, { method: "DELETE" });
    if (response.ok) setTask((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== mediaId) }));
    else setError("Не удалось удалить фото");
    setIsSaving(false);
  }

  async function removeTask() {
    if (!window.confirm("Удалить задачу? Связанный заказ останется в истории.")) return;
    setIsSaving(true);
    const result = await deleteTaskAction(task.id);
    if (!result.ok) {
      setError(result.message ?? "Не удалось удалить задачу");
      setIsSaving(false);
      return;
    }
    router.push("/client/tasks");
  }

  return (
    <div className="task-details-page">
      <Link className="selected-master-back" href="/client/tasks"><ArrowLeft size={17} /> К доске задач</Link>
      <header className="client-page-heading"><div><span>Детали задачи</span><h1>{task.title}</h1><p>Уточните детали или превратите задачу в заказ мастеру.</p></div><Link className="button button--primary" href={orderHref}><Wrench size={18} /> {task.linkedOrderId ? "Открыть заказ" : "Вызвать мастера"}</Link></header>
      <div className="task-details-layout">
        <form className="task-details-form" onSubmit={save}>
          <label>Название<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required /></label>
          <label>Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={6} /></label>
          <div><label>Категория<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Без категории</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Приоритет<select value={priority} onChange={(event) => setPriority(event.target.value as ClientTaskPriority)}><option value="LOW">Низкий</option><option value="MEDIUM">Обычный</option><option value="HIGH">Высокий</option></select></label></div>
          <label>Желаемая дата<input type="datetime-local" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} /></label>
          {(error || message) && <p className={error ? "task-form-error" : "task-form-success"} role="status">{error ? <AlertCircle size={16} /> : <Save size={16} />}{error || message}</p>}
          <footer><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />} Сохранить</button><button className="button button--danger" type="button" onClick={removeTask} disabled={isSaving}><Trash2 size={17} /> Удалить</button></footer>
        </form>
        <aside className="task-details-aside">
          <section><header><div><Camera size={18} /><h2>Фотографии</h2></div>{task.photos.length < 5 && <label><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={isSaving} />Добавить</label>}</header>{task.photos.length ? <div className="task-photo-grid">{task.photos.map((photo) => <article key={photo.id}><Image src={photo.url} alt={photo.fileName} fill sizes="160px" unoptimized /><button type="button" onClick={() => removePhoto(photo.id)} aria-label="Удалить фото"><Trash2 size={15} /></button></article>)}</div> : <div className="task-photo-empty"><Camera size={24} /><p>Фото помогут мастеру понять задачу заранее.</p></div>}</section>
          {task.linkedOrderId && <section className="task-linked-order"><Wrench size={20} /><div><small>Связанный заказ</small><h2>Статус обновляется автоматически</h2><p>После выбора мастера задача перейдёт в «Мастер найден», после завершения — в «Готово».</p><Link href={orderHref}>Открыть заказ <ExternalLink size={15} /></Link></div></section>}
        </aside>
      </div>
    </div>
  );
}
