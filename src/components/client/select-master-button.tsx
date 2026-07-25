"use client";

import { AlertCircle, Check, Clock3, LoaderCircle, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { selectMasterOfferAction } from "@/lib/marketplace/actions";
import type { ClientCandidate } from "@/lib/marketplace/types";
import { formatRubles } from "@/lib/orders/presentation";
import { useDialogAccessibility } from "@/lib/ui/use-dialog-accessibility";

function accusativeFirstName(name: string) {
  const firstName = name.trim().split(" ")[0] || name;
  if (/[ая]$/i.test(firstName)) return `${firstName.slice(0, -1)}${firstName.endsWith("а") ? "у" : "ю"}`;
  if (/[йь]$/i.test(firstName)) return `${firstName.slice(0, -1)}я`;
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(firstName)) return `${firstName}а`;
  return firstName;
}

export function SelectMasterButton({
  candidate,
  className = "button button--primary",
}: {
  candidate: ClientCandidate;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const firstName = accusativeFirstName(candidate.name);
  const dialogRef = useDialogAccessibility<HTMLElement>(open, () => setOpen(false), !isPending);

  function selectMaster() {
    setError("");
    startTransition(async () => {
      const result = await selectMasterOfferAction({
        orderId: candidate.orderId,
        offerId: candidate.offerId,
      });
      if (!result.ok) {
        setError(result.message ?? "Не удалось выбрать мастера");
        return;
      }
      setOpen(false);
      router.push(`/client/orders/${candidate.orderId}`);
      router.refresh();
    });
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>Выбрать</button>
      {open && (
        <div className="candidate-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setOpen(false);
        }}>
          <section className="candidate-confirm-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="candidate-confirm-title" tabIndex={-1}>
            <button className="candidate-modal-close" type="button" onClick={() => setOpen(false)} disabled={isPending} aria-label="Закрыть"><X size={19} /></button>
            <span className="candidate-confirm-icon"><Check size={23} /></span>
            <h2 id="candidate-confirm-title">Вы хотите вызвать {firstName}?</h2>
            <p>После подтверждения остальные предложения будут закрыты.</p>
            <dl>
              <div><dt><WalletCards size={17} /> Цена</dt><dd>{formatRubles(candidate.proposedPriceRubles)}</dd></div>
              <div><dt><Clock3 size={17} /> Прибытие</dt><dd>около {candidate.etaMinutes} минут</dd></div>
            </dl>
            {error && <div className="candidate-modal-error" role="alert"><AlertCircle size={16} /> {error}</div>}
            <button className="button button--primary button--large" type="button" onClick={selectMaster} disabled={isPending}>
              {isPending ? <><LoaderCircle className="spin" size={18} /> Подтверждаем…</> : "Подтвердить мастера"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
