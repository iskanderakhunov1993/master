import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="admin-page" aria-live="polite" aria-busy="true">
      <header className="client-page-heading"><div><span>Администрирование</span><h1>Загружаем данные</h1><p>Проверяем актуальное состояние сервиса.</p></div></header>
      <section className="admin-loading-card"><LoaderCircle className="spin" /><strong>Пожалуйста, подождите</strong></section>
    </div>
  );
}
