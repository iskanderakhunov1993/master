"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";

interface MasterData {
  id: string;
  user: {
    name: string;
    avatarUrl: string | null;
    ratingAvg: number;
    ratingCount: number;
    createdAt: string;
  };
  bio: string;
  experienceYears: number;
  isVerified: boolean;
  city: string;
  district: string;
  workRadiusKm: number;
  guaranteeDays: number;
  isAvailableNow: boolean;
  categories: { name: string; icon: string }[];
  portfolio: {
    id: string;
    title: string;
    description: string;
    price: number | null;
    photoBefore: string | null;
    photoAfter: string | null;
    isVerified: boolean;
    category: { name: string; icon: string };
    createdAt: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string;
    qualityRating: number | null;
    punctualityRating: number | null;
    priceFairnessRating: number | null;
    createdAt: string;
    reviewer: { name: string; ratingAvg: number };
  }[];
  stats: {
    completedOrders: number;
    cancelRate: number;
    avgResponseMinutes: number;
    warrantyRequests: number;
  };
}

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ minWidth: 160, fontSize: 14 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "var(--line)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: "var(--accent)",
            transition: "width .3s",
          }}
        />
      </div>
      <span style={{ minWidth: 28, textAlign: "right", fontWeight: 600, fontSize: 14 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Skeleton() {
  const bar = (w: string, h = 16) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        background: "var(--line)",
        animation: "pulse 1.5s infinite",
      }}
    />
  );
  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: "var(--line)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bar("200px", 28)}
          {bar("300px")}
          {bar("180px", 14)}
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {[1, 2, 3, 4].map((i) => (
          <div className="stat-card" key={i}>{bar("60px", 24)}</div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        {bar("120px", 20)}
        <div style={{ marginTop: 12 }}>{bar("100%", 14)}</div>
        <div style={{ marginTop: 8 }}>{bar("80%", 14)}</div>
      </div>
    </>
  );
}

export default function MasterPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [master, setMaster] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/masters/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error || "Ошибка");
        setMaster(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Sub-rating averages
  const subRatings = master
    ? (() => {
        const reviews = master.reviews;
        const avg = (fn: (r: MasterData["reviews"][0]) => number | null) => {
          const vals = reviews.map(fn).filter((v): v is number => v !== null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        return {
          quality: avg((r) => r.qualityRating),
          punctuality: avg((r) => r.punctualityRating),
          priceFairness: avg((r) => r.priceFairnessRating),
        };
      })()
    : null;

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand />
        <Link href="/" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>
          ← Назад
        </Link>
      </nav>

      <div className="section" style={{ padding: "32px 0 80px" }}>
        {loading && <Skeleton />}

        {error && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>Не удалось загрузить профиль</p>
            <p className="muted">{error}</p>
          </div>
        )}

        {master && (
          <>
            {/* ── HEADER ── */}
            <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 32, flexWrap: "wrap" }}>
              {master.user.avatarUrl ? (
                <img
                  src={master.user.avatarUrl}
                  alt={master.user.name}
                  className="avatar avatar-lg"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div className="avatar avatar-lg">{getInitials(master.user.name)}</div>
              )}
              <div>
                <h1 style={{ fontSize: 28, margin: "0 0 4px", fontWeight: 700 }}>
                  {master.user.name}
                </h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {master.isVerified && <span className="pill pill-green">✅ Проверен</span>}
                  <span className="pill">
                    {master.categories.map((c) => `${c.icon} ${c.name}`).join(", ")}
                  </span>
                  {master.guaranteeDays > 0 && (
                    <span className="pill">🛡 Гарантия {master.guaranteeDays} дней</span>
                  )}
                  {master.isAvailableNow && (
                    <span className="pill pill-green">🟢 Доступен сейчас</span>
                  )}
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {master.city}, {master.district} · На платформе с{" "}
                  {formatMemberSince(master.user.createdAt)}
                </p>
              </div>
            </div>

            {/* ── STATS ── */}
            <div className="stats-grid" style={{ marginBottom: 32 }}>
              <div className="stat-card">
                <span className="muted">Рейтинг</span>
                <strong>⭐ {master.user.ratingAvg.toFixed(1)}</strong>
              </div>
              <div className="stat-card">
                <span className="muted">Заказов</span>
                <strong>{master.stats.completedOrders}</strong>
              </div>
              <div className="stat-card">
                <span className="muted">Ответ</span>
                <strong>{master.stats.avgResponseMinutes} мин</strong>
              </div>
              <div className="stat-card">
                <span className="muted">Отмены</span>
                <strong>{master.stats.cancelRate}%</strong>
              </div>
            </div>

            {/* ── BIO ── */}
            {master.bio && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="section-title">О мастере</h3>
                <p>{master.bio}</p>
                <p className="muted" style={{ marginTop: 8 }}>
                  Опыт: {master.experienceYears}{" "}
                  {master.experienceYears === 1
                    ? "год"
                    : master.experienceYears < 5
                      ? "года"
                      : "лет"}
                </p>
              </div>
            )}

            {/* ── SUB-RATINGS ── */}
            {subRatings &&
              (subRatings.quality || subRatings.punctuality || subRatings.priceFairness) && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 className="section-title">Оценки</h3>
                  <div style={{ display: "grid", gap: 12 }}>
                    {subRatings.quality !== null && (
                      <RatingBar label="Качество работы" value={subRatings.quality} />
                    )}
                    {subRatings.punctuality !== null && (
                      <RatingBar label="Пунктуальность" value={subRatings.punctuality} />
                    )}
                    {subRatings.priceFairness !== null && (
                      <RatingBar label="Соблюдение цены" value={subRatings.priceFairness} />
                    )}
                  </div>
                </div>
              )}

            {/* ── PORTFOLIO ── */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="section-title">Портфолио</h3>
              {master.portfolio.length === 0 ? (
                <p className="muted">Мастер пока не добавил работы</p>
              ) : (
                <div className="grid-2">
                  {master.portfolio.map((work) => (
                    <div className="card" key={work.id}>
                      {(work.photoBefore || work.photoAfter) && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 12,
                          }}
                        >
                          {work.photoBefore && (
                            <div
                              style={{
                                flex: 1,
                                height: 120,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, var(--line), var(--bg-soft))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              До
                            </div>
                          )}
                          {work.photoAfter && (
                            <div
                              style={{
                                flex: 1,
                                height: 120,
                                borderRadius: 8,
                                background: "linear-gradient(135deg, rgba(0,200,150,.1), rgba(0,200,150,.05))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                color: "var(--accent)",
                              }}
                            >
                              После
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{work.title}</div>
                      <p className="muted" style={{ marginBottom: 8, fontSize: 14 }}>
                        {work.description}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="pill">
                          {work.category.icon} {work.category.name}
                        </span>
                        {work.price !== null && (
                          <span className="muted" style={{ fontSize: 14 }}>
                            {work.price.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                        {work.isVerified && (
                          <span className="pill pill-green">✅ Подтверждено</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── REVIEWS ── */}
            <div>
              <h3 className="section-title">Отзывы ({master.reviews.length})</h3>
              {master.reviews.length === 0 ? (
                <p className="muted">Пока нет отзывов</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {master.reviews.map((review) => (
                    <div className="card" key={review.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                            {getInitials(review.reviewer.name)}
                          </div>
                          <div>
                            <strong>{review.reviewer.name}</strong>
                            <div className="muted" style={{ fontSize: 13 }}>
                              {formatDate(review.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 14 }}>
                          {"⭐".repeat(review.rating)}
                        </div>
                      </div>
                      <p style={{ margin: "0 0 8px" }}>{review.comment}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {review.qualityRating !== null && (
                          <span className="pill" style={{ fontSize: 12 }}>
                            Качество: {review.qualityRating}
                          </span>
                        )}
                        {review.punctualityRating !== null && (
                          <span className="pill" style={{ fontSize: 12 }}>
                            Пунктуальность: {review.punctualityRating}
                          </span>
                        )}
                        {review.priceFairnessRating !== null && (
                          <span className="pill" style={{ fontSize: 12 }}>
                            Цена: {review.priceFairnessRating}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
