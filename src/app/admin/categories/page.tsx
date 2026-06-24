"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import AppShell from "@/components/AppShell";

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.ok) setCategories(json.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell role="ADMIN">
      <div className="page-head">
        <div>
          <h1><Layers size={22} /> Категории</h1>
          <p className="muted">Всего категорий: {categories.length}</p>
        </div>
      </div>

      {loading ? (
        <section className="empty-state">
          <p>Загрузка категорий...</p>
        </section>
      ) : categories.length === 0 ? (
        <section className="empty-state">
          <p>Категории не найдены.</p>
        </section>
      ) : (
        <div className="grid-3">
          {categories.map((cat) => (
            <article className="card" key={cat.id}>
              <span style={{ fontSize: 28 }}>{cat.icon}</span>
              <h3>{cat.name}</h3>
              <p className="muted">{cat.slug}</p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
