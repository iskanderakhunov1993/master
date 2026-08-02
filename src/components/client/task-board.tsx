"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDashed,
  Clock3,
  GripVertical,
  ListTodo,
  LoaderCircle,
  Plus,
  Sparkles,
  UserRoundCheck,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { createTaskAction, moveTaskAction } from "@/lib/tasks/actions";
import type { ClientTask, ClientTaskPriority, ClientTaskStatus } from "@/lib/tasks/types";
import type { ServiceCategory } from "@/lib/orders/types";
import { useDialogAccessibility } from "@/lib/ui/use-dialog-accessibility";

const columns: Array<{
  status: ClientTaskStatus;
  title: string;
  icon: LucideIcon;
  hint: string;
}> = [
  { status: "TODO", title: "Нужно сделать", icon: CircleDashed, hint: "Идеи и бытовые дела" },
  { status: "PLANNED", title: "Запланировано", icon: CalendarDays, hint: "Есть желаемая дата" },
  { status: "MASTER_FOUND", title: "Мастер найден", icon: UserRoundCheck, hint: "Заказ уже в работе" },
  { status: "DONE", title: "Готово", icon: CheckCircle2, hint: "Выполненные задачи" },
];

const priorityLabel: Record<ClientTaskPriority, string> = {
  LOW: "Низкий",
  MEDIUM: "Обычный",
  HIGH: "Высокий",
};

function toDateTimeInput(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function formatTaskDate(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function TaskBoard({
  initialTasks,
  categories,
}: {
  initialTasks: ClientTask[];
  categories: ServiceCategory[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function moveTask(taskId: string, status: ClientTaskStatus) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || task.status === status || busyTaskId) return;
    const previousTasks = tasks;
    setError("");
    setBusyTaskId(taskId);
    setTasks((current) => current.map((item) => item.id === taskId ? { ...item, status } : item));
    const result = await moveTaskAction({
      taskId,
      status,
      expectedUpdatedAt: task.updatedAt,
    });
    if (!result.ok || !result.task) {
      setTasks(previousTasks);
      setError(result.message ?? "Не удалось переместить задачу");
      router.refresh();
    } else {
      setTasks((current) => current.map((item) => item.id === taskId ? result.task! : item));
    }
    setBusyTaskId(null);
  }

  function dropTask(status: ClientTaskStatus) {
    if (draggedTaskId) void moveTask(draggedTaskId, status);
    setDraggedTaskId(null);
  }

  return (
    <div className="task-board-page">
      <header className="client-page-heading task-board-heading">
        <div><Link className="home-subsection-back" href="/client/home"><ArrowLeft size={15} /> Мой дом</Link><span>План ухода</span><h1>Задачи по дому</h1><p>Планируйте обслуживание, делайте сами или поручайте задачу мастеру.</p></div>
        <button className="button button--primary" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={18} /> Создать задачу</button>
      </header>

      <div className="task-board-summary">
        <span><ListTodo size={17} /> {tasks.filter((task) => task.status !== "DONE").length} в работе</span>
        <span><CheckCircle2 size={17} /> {tasks.filter((task) => task.status === "DONE").length} готово</span>
        <Link href="/client/calendar"><CalendarDays size={17} /> Открыть календарь</Link>
      </div>

      {error && <div className="task-board-alert" role="alert"><AlertCircle size={18} /> {error}</div>}

      <div className="task-kanban" aria-label="Доска задач">
        {columns.map((column, columnIndex) => {
          const Icon = column.icon;
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <section
              className={`task-column task-column--${column.status.toLowerCase()} ${draggedTaskId ? "is-drop-ready" : ""}`}
              key={column.status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropTask(column.status)}
            >
              <header><span><Icon size={17} /></span><div><h2>{column.title}</h2><p>{column.hint}</p></div><b>{columnTasks.length}</b></header>
              <div className="task-column__list">
                {columnTasks.length === 0 ? (
                  <div className="task-column-empty"><Sparkles size={19} /><p>{column.status === "TODO" ? "Добавьте первую задачу" : "Перетащите задачу сюда"}</p></div>
                ) : columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busy={busyTaskId === task.id}
                    columnIndex={columnIndex}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    onMove={(status) => void moveTask(task.id, status)}
                  />
                ))}
              </div>
              {column.status === "TODO" && <button className="task-column-add" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={16} /> Добавить задачу</button>}
            </section>
          );
        })}
      </div>

      {isCreateOpen && (
        <CreateTaskDialog
          categories={categories}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(task, warning) => {
            setTasks((current) => [task, ...current]);
            setIsCreateOpen(false);
            if (warning) setError(warning);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  busy,
  columnIndex,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  task: ClientTask;
  busy: boolean;
  columnIndex: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (status: ClientTaskStatus) => void;
}) {
  const isManagedByOrder = Boolean(task.linkedOrderId && ["MASTER_FOUND", "DONE"].includes(task.status));
  const orderHref = task.linkedOrderId
    ? task.linkedOrderStatus === "DRAFT"
      ? `/client/orders/new?task=${task.id}`
      : `/client/orders/${task.linkedOrderId}`
    : task.status === "DONE"
      ? `/client/tasks/${task.id}`
      : `/client/orders/new?task=${task.id}`;
  const orderLabel = task.linkedOrderId
    ? task.linkedOrderStatus === "DRAFT" ? "Продолжить заказ" : "Открыть заказ"
    : task.status === "DONE" ? "Открыть задачу" : "Вызвать мастера";

  return (
    <article
      className={`task-card ${busy ? "is-busy" : ""}`}
      draggable={!isManagedByOrder && !busy}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="task-card__top">
        <span className={`task-priority task-priority--${task.priority.toLowerCase()}`}>{priorityLabel[task.priority]}</span>
        {!isManagedByOrder && <GripVertical size={17} aria-label="Перетащить задачу" />}
        {busy && <LoaderCircle className="spin" size={16} />}
      </div>
      <Link className="task-card__body" href={`/client/tasks/${task.id}`}>
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
      </Link>
      <div className="task-card__meta">
        {task.categoryId && <span><Wrench size={14} /> {task.categoryName}</span>}
        {task.desiredDate && <span><Clock3 size={14} /> {formatTaskDate(task.desiredDate)}</span>}
        {task.photos.length > 0 && <span><Camera size={14} /> {task.photos.length}</span>}
      </div>
      <Link className="task-order-cta" href={orderHref}><Wrench size={15} /> {orderLabel}</Link>
      {!isManagedByOrder && (
        <div className="task-card__move" aria-label="Переместить задачу">
          <button type="button" disabled={columnIndex === 0 || busy} onClick={() => onMove(columns[columnIndex - 1]?.status)} aria-label="Переместить в предыдущую колонку"><ArrowLeft size={15} /></button>
          <span>Переместить</span>
          <button type="button" disabled={columnIndex === columns.length - 1 || busy} onClick={() => onMove(columns[columnIndex + 1]?.status)} aria-label="Переместить в следующую колонку"><ArrowRight size={15} /></button>
        </div>
      )}
    </article>
  );
}

function CreateTaskDialog({
  categories,
  onClose,
  onCreated,
}: {
  categories: ServiceCategory[];
  onClose: () => void;
  onCreated: (task: ClientTask, warning?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<ClientTaskPriority>("MEDIUM");
  const [desiredDate, setDesiredDate] = useState("");
  const [minimumDate] = useState(() => toDateTimeInput(Date.now()));
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialogAccessibility<HTMLElement>(true, onClose, !isSaving);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []).slice(0, 5);
    setFiles(nextFiles);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const timestamp = desiredDate ? new Date(desiredDate).getTime() : null;
    const result = await createTaskAction({
      title,
      description,
      categoryId,
      priority,
      desiredDate: timestamp && Number.isFinite(timestamp) ? timestamp : null,
    });
    if (!result.ok || !result.task) {
      setError(result.message ?? "Не удалось создать задачу");
      setIsSaving(false);
      return;
    }

    let createdTask = result.task;
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/client/tasks/${createdTask.id}/media`, { method: "POST", body: formData });
      const payload = await response.json() as { photo?: ClientTask["photos"][number]; message?: string };
      if (!response.ok || !payload.photo) {
        onCreated(createdTask, payload.message ?? "Задача создана, но не все фото загрузились");
        return;
      }
      createdTask = { ...createdTask, photos: [...createdTask.photos, payload.photo] };
    }
    onCreated(createdTask);
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section className="task-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-task-title" tabIndex={-1}>
        <header><div><span>Новая задача</span><h2 id="create-task-title">Что нужно сделать?</h2></div><button type="button" onClick={onClose} disabled={isSaving} aria-label="Закрыть"><X size={20} /></button></header>
        <form onSubmit={submit}>
          <label>Название<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Например, повесить полку" autoFocus required /></label>
          <label>Описание <small>необязательно</small><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} placeholder="Размеры, материалы и важные детали" /></label>
          <div className="task-form-grid">
            <label>Категория<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Выбрать позже</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Приоритет<select value={priority} onChange={(event) => setPriority(event.target.value as ClientTaskPriority)}><option value="LOW">Низкий</option><option value="MEDIUM">Обычный</option><option value="HIGH">Высокий</option></select></label>
          </div>
          <label>Желаемая дата <small>необязательно</small><input type="datetime-local" value={desiredDate} min={minimumDate} onChange={(event) => setDesiredDate(event.target.value)} /></label>
          <label className="task-photo-input"><span><Camera size={18} /> Фотографии <small>до 5</small></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} /><b>{files.length ? `Выбрано: ${files.length}` : "Добавить фото"}</b></label>
          {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
          <footer><button className="button button--secondary" type="button" onClick={onClose} disabled={isSaving}>Отмена</button><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? <><LoaderCircle className="spin" size={17} /> Сохраняем…</> : "Создать задачу"}</button></footer>
        </form>
      </section>
    </div>
  );
}
