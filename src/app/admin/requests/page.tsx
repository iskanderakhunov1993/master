"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import AppShell from "@/components/AppShell";

interface Request {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt?: string;
}

type Tab = "all" | "published" | "in_progress" | "completed";

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "published", label: "Опубликованные" },
  { key: "in_progress", label: "В работе" },
  { key: "completed", label: "Завершённые" },
];

const statusPill: Record<string, string> = {
  published: "pill-green",
  assigned: "pill-accent",
  in_progress: "pill-orange",
  awaiting_review: "pill-violet",
  completed: "pill-accent",
  declined: "pill-red",
};

const statusLabel: Record<string, string> = {
  published: "Опубликована",
  assigned: "Мастер выбран",
  in_progress: "В работе",
  awaiting_review: "Ждёт отзыв",
  completed: "Завершена",
  declined: "Отклонена",
};

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/requests");
        const json = await res.json();
        if (json.ok) {
          setRequests(json.data.requests ?? []);
          setTotal(json.data.total ?? json.data.requests?.length ?? 0);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = tab === "all"
    ? requests
    : requests.filter((r) => r.status === tab);

  return (
    <AppShell role="ADMIN">
      <div className="page-head">
        <div>
          <h1><ClipboardList size={22} /> Заявки</h1>
          <p className="muted">Всего заявок: {total}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "primary-btn" : "secondary-btn"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <section className="empty-state">
          <p>Загрузка заявок...</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="empty-state">
          <p>Нет заявок в этой категории.</p>
        </section>
      ) : (
        <div className="table-card">
          <div className="table-row" style={{ opacity: 0.6 }}>
            <strong>Название</strong>
            <span>Категория</span>
            <span>Статус</span>
            <span>Дата</span>
          </div>
          {filtered.map((req) => (
            <div className="table-row" key={req.id}>
              <strong>{req.title}</strong>
              <span className="pill">{req.category}</span>
              <span className={`pill ${statusPill[req.status] ?? "pill"}`}>
                {statusLabel[req.status] ?? req.status}
              </span>
              <span className="muted">
                {req.createdAt
                  ? new Date(req.createdAt).toLocaleDateString("ru-RU")
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
