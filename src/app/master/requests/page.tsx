"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RequestCard from "@/components/RequestCard";

interface ApiRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  category: { name: string };
  address?: { district: string };
  budgetAmount: number;
  preferredTimeFrom: string | null;
  urgency: string;
  _count: { offers: number };
}

export default function MasterRequestsPage() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setRequests(res.data.requests ?? res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  const skip = useCallback((id: string) => {
    setHidden((prev) => new Set(prev).add(id));
  }, []);

  if (loading)
    return (
      <AppShell role="MASTER">
        <p className="muted">Загрузка заявок…</p>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="MASTER">
        <p className="pill-red">{error}</p>
      </AppShell>
    );

  const visible = requests.filter((r) => !hidden.has(r.id));

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>Доступные заявки</h1>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">Нет новых заявок рядом</div>
      ) : (
        <div className="request-list">
          {visible.map((r) => (
            <RequestCard
              key={r.id}
              request={{
                id: r.id,
                title: r.title,
                category: r.category.name,
                status: r.status === "PUBLISHED" ? "new" : r.status,
                district: r.address?.district ?? "",
                budgetAmount: r.budgetAmount,
                preferredTime: r.preferredTimeFrom || "Гибко",
                description: r.description,
                urgency: r.urgency,
              }}
              href={`/master/requests/${r.id}`}
            >
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Link className="primary-btn" href={`/master/requests/${r.id}`}>
                  Откликнуться
                </Link>
                <button
                  className="secondary-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    skip(r.id);
                  }}
                >
                  Пропустить
                </button>
              </div>
            </RequestCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
