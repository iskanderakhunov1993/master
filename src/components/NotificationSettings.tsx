"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type PermState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function NotificationSettings() {
  const [perm, setPerm] = useState<PermState>("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator && "PushManager" in window)) {
      setSupported(false);
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission as PermState);
    navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setEnabled(true);
        });
      }
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPerm(permission as PermState);
      if (permission !== "granted") {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch("/api/notifications/vapid");
      const { publicKey } = await vapidRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setEnabled(true);
    } catch (err) {
      console.error("Push subscription error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      setEnabled(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div className="uber-row" style={{ cursor: "default" }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--soft, #f2f2f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BellOff size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Уведомления</div>
            <span className="muted" style={{ fontSize: 14 }}>Ваш браузер не поддерживает push-уведомления</span>
          </div>
        </div>
      </div>
    );
  }

  if (perm === "denied") {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div className="uber-row" style={{ cursor: "default" }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--soft, #f2f2f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BellOff size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Уведомления</div>
            <span className="muted" style={{ fontSize: 14 }}>Заблокированы в настройках браузера</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--soft, #f2f2f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bell size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Уведомления</div>
          <span className="muted" style={{ fontSize: 14 }}>
            {enabled ? "Включены" : "Выключены"}
          </span>
        </div>
        <button
          className={enabled ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
          onClick={enabled ? handleDisable : handleEnable}
          disabled={loading}
        >
          {loading ? "..." : enabled ? "Выключить" : "Включить"}
        </button>
      </div>
    </div>
  );
}
