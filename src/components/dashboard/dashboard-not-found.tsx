import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export function DashboardNotFound({ homeHref }: { homeHref: string }) {
  return (
    <div className="admin-page">
      <header className="client-page-heading"><div><span>Страница не найдена</span><h1>Нет доступа или объект удалён</h1><p>Проверьте ссылку или вернитесь в свой кабинет.</p></div></header>
      <section className="client-empty-card">
        <span><SearchX /></span>
        <h2>Ничего не найдено</h2>
        <p>Мы не показываем чужие заказы, задачи и адреса. Возможно, объект вам не принадлежит или больше недоступен.</p>
        <Link className="button button--primary" href={homeHref}><ArrowLeft /> На главную</Link>
      </section>
    </div>
  );
}
