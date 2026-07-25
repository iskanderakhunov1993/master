import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-page__topbar">
        <Brand />
        <Link href="/"><ArrowLeft size={17} /> На главную</Link>
      </div>
      <div className="auth-page__background" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="auth-page__content">
        {children}
        <p className="auth-security"><ShieldCheck size={16} /> Данные защищены. Сессия хранится в безопасном cookie.</p>
      </div>
    </main>
  );
}
