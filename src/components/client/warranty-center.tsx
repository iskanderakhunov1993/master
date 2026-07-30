"use client";

import { AlertCircle, Camera, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { formatRubles } from "@/lib/orders/presentation";
import { openWarrantyClaimAction } from "@/lib/warranties/actions";
import type { ClientWarranty } from "@/lib/warranties/repository";

const statusLabel = {
  ACTIVE: "Действует",
  CLAIMED: "Открыто обращение",
  EXPIRED: "Завершена",
  VOID: "Аннулирована",
} as const;

export function WarrantyCenter({ warranties }: { warranties: ClientWarranty[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setPending(true);
    const form = event.currentTarget;
    const result = await openWarrantyClaimAction(new FormData(form));
    if (!result.ok) setError(result.message ?? "Не удалось открыть обращение");
    else { setSuccess("Обращение открыто. История и фотография сохранены."); setSelectedId(null); form.reset(); }
    setPending(false);
  }

  return <section className="home-warranty-center">
    <header><div><span>Гарантии мастеров</span><h2>Защита выполненных работ</h2><p>Обязательство по устранению недостатков несёт мастер. Платформа фиксирует срок и помогает сохранить обращение.</p></div><ShieldCheck size={28} /></header>
    {warranties.length === 0 ? <div className="home-passport-empty"><ShieldCheck size={25} /><strong>Активных гарантий пока нет</strong><p>Гарантия появится автоматически после подтверждения выполненной работы.</p></div> : <div className="warranty-list">{warranties.map((warranty) => <article key={warranty.id}>
      <div className="warranty-list__top"><span className={`warranty-status warranty-status--${warranty.status.toLowerCase()}`}>{statusLabel[warranty.status]}</span><time>до {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(warranty.endsAt)}</time></div>
      <h3>{warranty.categoryName}</h3><p>{warranty.description}</p>
      <dl><div><dt>Мастер</dt><dd>{warranty.masterName}</dd></div><div><dt>Срок</dt><dd>{warranty.durationDays} дней</dd></div><div><dt>Стоимость</dt><dd>{formatRubles(warranty.priceRubles)}</dd></div></dl>
      <details><summary>Условия гарантии</summary><p>{warranty.terms}</p></details>
      <footer><Link href={`/client/orders/${warranty.orderId}`}>Открыть исходный заказ</Link>{warranty.status === "ACTIVE" && <button className="button button--secondary" type="button" onClick={() => { setSelectedId(warranty.id); setError(""); setSuccess(""); }}>Сообщить о проблеме</button>}{warranty.status === "CLAIMED" && <span><CheckCircle2 size={15} /> {warranty.claimStatus === "IN_REVIEW" ? "На рассмотрении" : "Обращение зафиксировано"}</span>}</footer>
      {selectedId === warranty.id && <form className="warranty-claim-form" onSubmit={submit}><input type="hidden" name="warrantyId" value={warranty.id} /><label>Что повторилось?<textarea name="description" minLength={10} maxLength={1000} rows={3} required placeholder="Опишите недостаток выполненной работы" /></label><label className="warranty-file"><Camera size={16} /> Фото проблемы<input type="file" name="file" accept="image/jpeg,image/png,image/webp" required /></label><div><button className="button button--ghost" type="button" onClick={() => setSelectedId(null)}>Отмена</button><button className="button button--primary" type="submit" disabled={pending}>{pending && <LoaderCircle className="spin" size={16} />} Открыть обращение</button></div></form>}
    </article>)}</div>}
    {error && <p className="task-form-error"><AlertCircle size={16} /> {error}</p>}
    {success && <p className="warranty-success"><CheckCircle2 size={16} /> {success}</p>}
  </section>;
}
