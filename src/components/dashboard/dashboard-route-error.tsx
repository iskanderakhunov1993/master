"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { AsyncState } from "@/components/ui/async-state";
import type { Role } from "@/lib/auth/types";

const roleLabel: Record<Role, string> = {
  CLIENT: "Кабинет клиента",
  MASTER: "Кабинет мастера",
  ADMIN: "Администрирование",
};

export function DashboardRouteError({
  error,
  reset,
  role,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  role: Role;
}) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="admin-page">
      <header className="client-page-heading"><div><span>{roleLabel[role]}</span><h1>Не удалось загрузить раздел</h1><p>Проверьте соединение и повторите запрос.</p></div></header>
      <AsyncState
        icon={AlertTriangle}
        title="Временная ошибка"
        description="Сервис не ответил. Повторите запрос — начатые действия не отправятся дважды."
        action={<button className="button button--primary" type="button" onClick={reset}><RotateCcw /> Повторить</button>}
      />
    </div>
  );
}
