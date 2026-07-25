"use client";

import { LoaderCircle, Plus, Power, Save, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCategoryAction, setCategoryActiveAction, updateCategoryAction } from "@/lib/admin/actions";
import type { AdminCategory } from "@/lib/admin/types";

import { AdminEmpty, AdminPage } from "./admin-page";

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState("");
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState(() => Object.fromEntries(categories.map((item) => [item.id, item.name])));
  const [error, setError] = useState("");

  function run(id: string, action: () => Promise<{ ok: boolean; message?: string }>, success?: () => void) {
    setError("");
    setActiveId(id);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.message ?? "Не удалось сохранить изменения"); return; }
      success?.();
      router.refresh();
    });
  }

  return (
    <AdminPage title="Категории" description="Каталог услуг, доступный клиентам и мастерам.">
      <section className="admin-category-create">
        <label htmlFor="new-category">Новая категория</label>
        <div><input id="new-category" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Например, Клининг" disabled={isPending} /><button className="button button--primary" type="button" disabled={isPending || newName.trim().length < 2} onClick={() => run("new", () => createCategoryAction(newName), () => setNewName(""))}>{isPending && activeId === "new" ? <LoaderCircle className="spin" /> : <Plus />} Добавить</button></div>
      </section>
      {error && <div className="master-alert master-alert--error" role="alert">{error}</div>}
      {categories.length === 0 ? <AdminEmpty icon={<Tags />} title="Категорий нет" description="Создайте первую категорию услуг." /> : (
        <div className="admin-category-list">{categories.map((category) => <article key={category.id} className={!category.isActive ? "is-disabled" : ""}>
          <div><span className="admin-category-icon"><Tags /></span><span><small>{category.slug}</small><input aria-label={`Название категории ${category.name}`} value={names[category.id] ?? category.name} onChange={(event) => setNames((current) => ({ ...current, [category.id]: event.target.value }))} maxLength={80} disabled={isPending} /></span></div>
          <dl><div><dt>Подкатегории</dt><dd>{category.subcategoryCount}</dd></div><div><dt>Заказы</dt><dd>{category.orderCount}</dd></div><div><dt>Статус</dt><dd>{category.isActive ? "Активна" : "Отключена"}</dd></div></dl>
          <div className="admin-category-actions"><button className="button button--small button--secondary" type="button" disabled={isPending || (names[category.id] ?? "").trim() === category.name || (names[category.id] ?? "").trim().length < 2} onClick={() => run(category.id, () => updateCategoryAction({ categoryId: category.id, name: names[category.id] ?? category.name }))}>{isPending && activeId === category.id ? <LoaderCircle className="spin" /> : <Save />} Сохранить</button><button className={`button button--small ${category.isActive ? "button--danger" : "button--secondary"}`} type="button" disabled={isPending} onClick={() => run(category.id, () => setCategoryActiveAction({ categoryId: category.id, isActive: !category.isActive }))}><Power /> {category.isActive ? "Отключить" : "Включить"}</button></div>
        </article>)}</div>
      )}
    </AdminPage>
  );
}
