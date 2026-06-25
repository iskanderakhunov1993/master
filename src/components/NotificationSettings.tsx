"use client";

import { useEffect, useState } from "react";

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
    // Check if already subscribed
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
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 12 }}>Уведомления</h3>
        <p className="muted" style={{ margin: 0 }}>Ваш браузер не поддерживает push-уведомления</p>
      </div>
    );
  }

  if (perm === "denied") {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 12 }}>Уведомления</h3>
        <p className="muted" style={{ margin: 0 }}>Уведомления заблокированы в настройках браузера</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 className="section-title" style={{ fontSize: 20, marginBottom: 12 }}>Уведомления</h3>
      {enabled ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="pill-green">Уведомления включены</span>
          <button
            className="btn-secondary"
            onClick={handleDisable}
            disabled={loading}
            style={{ fontSize: 14, padding: "6px 16px" }}
          >
            {loading ? "..." : "Выключить"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="muted">Уведомления выключены</span>
          <button
            className="btn-primary"
            onClick={handleEnable}
            disabled={loading}
            style={{ fontSize: 14, padding: "6px 16px" }}
          >
            {loading ? "..." : "Включить"}
          </button>
        </div>
      )}
    </div>
  );
}
