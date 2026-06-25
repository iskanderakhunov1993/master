"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, Banknote, User, X } from "lucide-react";

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
  _count: { offers: number };
}

const POLL_INTERVAL = 12000;
const POPUP_TIMEOUT = 30;

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

  // Poll for new requests
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

        const newReq = requests.find(
          (r) => !seenIds.current.has(r.id) && r.urgency
        );

        if (newReq && !visible) {
          seenIds.current.add(newReq.id);
          setRequest(newReq);
          setVisible(true);
          setTimer(POPUP_TIMEOUT);
        }

        requests.forEach((r) => seenIds.current.add(r.id));
      } catch {
        // ignore
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          dismiss();
          return POPUP_TIMEOUT;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, dismiss]);

  if (!visible || !request) return null;

  const progress = (timer / POPUP_TIMEOUT) * 100;
  const budget = request.budgetAmount
    ? `${request.budgetAmount.toLocaleString()} ₽`
    : "Ждёт цену";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,.5)",
          backdropFilter: "blur(4px)",
          animation: "fadeIn .3s ease",
        }}
        onClick={dismiss}
      />

      {/* Popup */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          animation: "slideUpPopup .4s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* Timer bar */}
        <div
          style={{
            height: 4,
            background: "var(--line)",
            borderRadius: "4px 4px 0 0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background:
                timer > 10
                  ? "var(--accent)"
                  : timer > 5
                  ? "var(--orange)"
                  : "var(--red)",
              transition: "width 1s linear, background .3s",
              borderRadius: 4,
            }}
          />
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "24px 24px 0 0",
            padding: "24px 20px max(env(safe-area-inset-bottom, 16px), 24px)",
            boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
            maxWidth: 480,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  className="pill"
                  style={{ fontSize: 13, padding: "5px 12px" }}
                >
                  {request.category.icon} {request.category.name}
                </span>
                {request.urgency === "URGENT" && (
                  <span
                    className="pill"
                    style={{
                      background: "rgba(255,71,87,.1)",
                      color: "var(--red)",
                      fontSize: 13,
                      padding: "5px 12px",
                    }}
                  >
                    🔥 Срочно
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                Новая заявка · {timer} сек
              </div>
            </div>
            <button
              onClick={dismiss}
              style={{
                background: "var(--bg-soft)",
                border: "none",
                borderRadius: 12,
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "var(--muted)",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 6,
              color: "var(--text)",
            }}
          >
            {request.title}
          </h3>

          <p
            style={{
              color: "var(--muted)",
              fontSize: 14,
              lineHeight: 1.5,
              marginBottom: 16,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {request.description}
          </p>

          {/* Info row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "var(--bg-soft)",
                borderRadius: 14,
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              <Banknote
                size={18}
                style={{ color: "var(--accent)", marginBottom: 4 }}
              />
              <div
                style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}
              >
                {budget}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>бюджет</div>
            </div>
            <div
              style={{
                background: "var(--bg-soft)",
                borderRadius: 14,
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              <MapPin
                size={18}
                style={{ color: "var(--accent)", marginBottom: 4 }}
              />
              <div
                style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}
              >
                {request.address?.district || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>район</div>
            </div>
            <div
              style={{
                background: "var(--bg-soft)",
                borderRadius: 14,
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              <User
                size={18}
                style={{ color: "var(--accent)", marginBottom: 4 }}
              />
              <div
                style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}
              >
                {request._count.offers}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                откликов
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              onClick={dismiss}
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Пропустить
            </button>
            <button
              onClick={accept}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Откликнуться
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUpPopup {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
