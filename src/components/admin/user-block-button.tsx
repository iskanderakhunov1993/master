"use client";

import { Ban, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setUserBlockedAction } from "@/lib/admin/actions";

export function UserBlockButton({ userId, userName, isBlocked, disabled = false }: {
  userId: string;
  userName: string;
  isBlocked: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    const question = isBlocked
      ? `Разблокировать «${userName}»? Пользователь снова сможет войти в аккаунт.`
      : `Заблокировать «${userName}»? Пользователь не сможет войти, пока вы не снимете блокировку.`;
    if (!window.confirm(question)) return;
    setError("");
    startTransition(async () => {
      const result = await setUserBlockedAction({ userId, blocked: !isBlocked });
      if (!result.ok) {
        setError(result.message ?? "Не удалось изменить статус");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="admin-inline-action">
      <button className={`button button--small ${isBlocked ? "button--secondary" : "button--danger"}`} type="button" disabled={disabled || isPending} onClick={toggle}>
        {isPending ? <LoaderCircle className="spin" /> : isBlocked ? <RotateCcw /> : <Ban />}
        {isBlocked ? "Разблокировать" : "Заблокировать"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
