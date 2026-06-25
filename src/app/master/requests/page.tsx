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
        <div className="page-head"><h1>Заявки рядом</h1></div>
        <div className="request-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140, marginBottom: 12, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="MASTER">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error}</p>
        </div>
      </AppShell>
    );

  const visible = requests.filter((r) => !hidden.has(r.id));

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>
          Заявки рядом
          {visible.length > 0 && (
            <span className="pill" style={{ marginLeft: 12, fontSize: "0.85rem", verticalAlign: "middle" }}>
              {visible.length}
            </span>
          )}
        </h1>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state animate-fadeIn">
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>Нет новых заявок рядом</h3>
          <p className="muted">Загляните позже — новые заявки появляются каждый день</p>
        </div>
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
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <Link className="btn-primary btn-sm" href={`/master/requests/${r.id}`}>
                  Откликнуться
                </Link>
                <button
                  className="btn-secondary btn-sm"
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
