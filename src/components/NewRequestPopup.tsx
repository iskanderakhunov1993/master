"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Banknote, Star, ShieldCheck, X, ChevronRight } from "lucide-react";

interface ClientInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
}

interface IncomingRequest {
  id: string;
  title: string;
  description: string;
  budgetAmount: number | null;
  budgetType: string;
  urgency: string;
  createdAt: string;
  category: { name: string; icon: string };
  address: { district: string; city: string } | null;
  client: ClientInfo;
  _count: { offers: number };
}

const POLL_INTERVAL = 12000;
const POPUP_TIMEOUT = 30;
const CIRCLE_SIZE = 72;
const CIRCLE_STROKE = 4;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function NewRequestPopup() {
  const router = useRouter();
  const [request, setRequest] = useState<IncomingRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState(POPUP_TIMEOUT);
  const seenIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoad = useRef(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    setRequest(null);
    setTimer(POPUP_TIMEOUT);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const accept = useCallback(() => {
    if (!request) return;
    dismiss();
    router.push(`/master/requests/${request.id}`);
  }, [request, dismiss, router]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/requests?limit=5");
        const json = await res.json();
        if (!json.ok || !active) return;
        const requests: IncomingRequest[] = json.data?.requests || [];
        if (initialLoad.current) {
          requests.forEach((r) => seenIds.current.add(r.id));
          initialLoad.current = false;
          return;
        }
        const newReq = requests.find((r) => !seenIds.current.has(r.id));
        if (newReq && !visible) {
          seenIds.current.add(newReq.id);
          setRequest(newReq);
          setVisible(true);
          setTimer(POPUP_TIMEOUT);
        }
        requests.forEach((r) => seenIds.current.add(r.id));
      } catch { /* ignore */ }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { dismiss(); return POPUP_TIMEOUT; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible, dismiss]);

  if (!visible || !request) return null;

  const progress = timer / POPUP_TIMEOUT;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  const timerColor = timer > 10 ? "#000" : timer > 5 ? "var(--orange)" : "var(--red)";
  const budget = request.budgetAmount
    ? `${request.budgetAmount.toLocaleString()} ₽`
    : "Ждёт цену";
  const clientInitial = request.client?.name?.[0] || "?";
  const clientRating = request.client?.ratingAvg?.toFixed(1) || "—";
  const clientOrders = request.client?.ratingCount || 0;

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)",
      }} onClick={dismiss} />

      {/* Centered popup */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 101,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, pointerEvents: "none",
      }}>
        <div style={{
          background: "white", borderRadius: 24, width: "100%", maxWidth: 440,
          boxShadow: "0 24px 80px rgba(0,0,0,.25)",
          pointerEvents: "auto", overflow: "hidden",
          animation: "popupScale .35s cubic-bezier(.16,1,.3,1)",
        }}>

          <div style={{ padding: "28px 24px 20px" }}>

            {/* Circular timer at top center */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
                <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth={CIRCLE_STROKE}
                  />
                  <circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke={timerColor}
                    strokeWidth={CIRCLE_STROKE}
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear, stroke .3s" }}
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, color: timerColor,
                }}>
                  {timer}
                </div>
              </div>
            </div>

            {/* Category + urgency */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, justifyContent: "center" }}>
              <span className="pill" style={{ fontSize: 13 }}>
                {request.category.icon} {request.category.name}
              </span>
              {request.urgency === "URGENT" && (
                <span className="pill" style={{ background: "rgba(255,71,87,.1)", color: "var(--red)", fontSize: 13 }}>
                  Срочно
                </span>
              )}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
              marginBottom: 8, color: "var(--text)", lineHeight: 1.2,
              textAlign: "center",
            }}>
              {request.title}
            </h3>

            {/* Info grid: budget, district, offers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { icon: Banknote, value: budget, label: "бюджет" },
                { icon: MapPin, value: request.address?.district || "—", label: "район" },
                { icon: Star, value: `${request._count.offers} откл.`, label: "мастеров" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{
                    background: "var(--bg-soft)", borderRadius: 14,
                    padding: "12px 10px", textAlign: "center",
                  }}>
                    <Icon size={16} style={{ color: "var(--muted)", marginBottom: 4 }} />
                    <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Client profile card */}
            <div style={{
              background: "var(--bg-soft)", borderRadius: 16,
              padding: "14px 16px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "#000", color: "white",
                  display: "grid", placeItems: "center",
                  fontWeight: 800, fontSize: 18, flexShrink: 0,
                }}>
                  {clientInitial}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                    {request.client?.name || "Клиент"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Star size={13} style={{ color: "var(--orange)" }} />
                      {clientRating}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      {clientOrders} {clientOrders === 1 ? "заказ" : clientOrders < 5 ? "заказа" : "заказов"}
                    </span>
                    {clientOrders >= 3 && (
                      <span style={{ fontSize: 12, color: "var(--green)", display: "flex", alignItems: "center", gap: 3 }}>
                        <ShieldCheck size={12} /> Надёжный
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/client/${request.client?.id || ""}`}
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}
                title="Профиль клиента"
              >
                <ChevronRight size={20} />
              </Link>
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={dismiss} className="btn-secondary"
                style={{ width: "100%", justifyContent: "center", minHeight: 52 }}>
                Пропустить
              </button>
              <button onClick={accept} className="btn-primary"
                style={{ width: "100%", justifyContent: "center", minHeight: 52 }}>
                Принять
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes popupScale {
          from { opacity: 0; transform: scale(.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
