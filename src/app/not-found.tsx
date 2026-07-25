import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-page__topbar"><Brand /></div>
      <section className="auth-card">
        <div className="auth-card__heading"><span className="auth-kicker"><SearchX size={17} /> Ошибка 404</span><h1>Страница не найдена</h1><p>Ссылка устарела или страница была перемещена.</p></div>
        <Link className="button button--primary button--full" href="/"><ArrowLeft size={17} /> На главную</Link>
      </section>
    </main>
  );
}
