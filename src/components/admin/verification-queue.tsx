"use client";

import { AlertCircle, BadgeCheck, Check, ExternalLink, FileSearch, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { decideVerificationAction } from "@/lib/masters/actions";
import type { VerificationApplication } from "@/lib/masters/types";

export function VerificationQueue({ applications }: { applications: VerificationApplication[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  function decide(applicationId: string, decision: "VERIFIED" | "REJECTED") {
    setError("");
    setActiveId(applicationId);
    startTransition(async () => {
      const result = await decideVerificationAction({
        applicationId,
        decision,
        rejectionReason: decision === "REJECTED" ? reasons[applicationId] : undefined,
      });
      if (!result.ok) {
        setError(result.message ?? "Не удалось обработать заявку");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="admin-verification-page">
      <header className="client-page-heading"><div><span>Администрирование</span><h1>Верификация</h1><p>Ручная проверка заявок мастеров. Решение сохраняется в истории заявки.</p></div></header>
      {error && <div className="master-alert master-alert--error" role="alert"><AlertCircle size={18} /> {error}</div>}
      {applications.length === 0 ? (
        <section className="client-empty-card"><span><BadgeCheck size={29} /></span><h2>Заявок на проверку нет</h2><p>Новые заявки мастеров появятся здесь со статусом PENDING.</p></section>
      ) : (
        <div className="verification-queue-list">{applications.map((application) => (
          <article key={application.id}>
            <div className="verification-queue-list__top"><span><FileSearch size={22} /></span><div><small>Подана {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(application.submittedAt)}</small><h2>{application.masterName}</h2><p>{application.masterEmail}</p></div><b>PENDING</b></div>
            <dl><div><dt>Имя в документе</dt><dd>{application.legalName}</dd></div><div><dt>Документ</dt><dd>Паспорт · последние цифры {application.documentLastFour}</dd></div></dl>
            <a className="verification-document-link" href={`/api/master-media/${application.documentMediaId}`} target="_blank" rel="noreferrer">Открыть документ <ExternalLink size={15} /></a>
            <label>Причина отклонения<textarea value={reasons[application.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [application.id]: event.target.value }))} rows={2} maxLength={500} placeholder="Обязательно только при отклонении" /></label>
            <div className="verification-queue-list__actions"><button className="button button--secondary is-danger" type="button" disabled={isPending} onClick={() => decide(application.id, "REJECTED")}><X size={16} /> Отклонить</button><button className="button button--primary" type="button" disabled={isPending} onClick={() => decide(application.id, "VERIFIED")}>{isPending && activeId === application.id ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Подтвердить личность</button></div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
