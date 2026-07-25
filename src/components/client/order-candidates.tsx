import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Gauge,
  Search,
  Star,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ClientCandidate } from "@/lib/marketplace/types";
import { formatRating, formatReviewCount } from "@/lib/masters/presentation";
import { formatRubles } from "@/lib/orders/presentation";
import type { OrderSummary } from "@/lib/orders/types";

import { SelectMasterButton } from "./select-master-button";
import { AsyncState } from "@/components/ui/async-state";

export function OrderCandidates({
  order,
  candidates,
}: {
  order: OrderSummary;
  candidates: ClientCandidate[];
}) {
  return (
    <div className="candidate-page">
      <header className="candidate-page-heading">
        <Link href="/client"><ArrowLeft size={17} /> На главную</Link>
        <span>{candidates.length} {candidates.length === 1 ? "предложение" : "предложения"}</span>
        <h1>Мастера готовы выполнить заказ</h1>
        <p>Сравните цену, скорость, опыт и надёжность. В выдаче нет платных позиций.</p>
      </header>

      {candidates.length === 0 ? (
        <AsyncState icon={Search} title="Собираем предложения" description="Действующих предложений пока нет. Поиск мастеров продолжается — можно вернуться позже." />
      ) : (
        <div className={`candidate-grid candidate-grid--${candidates.length}`}>
          {candidates.map((candidate, index) => (
            <article className="candidate-card" key={candidate.offerId}>
              {index === 0 && candidates.length > 1 && <span className="candidate-card-rank">Лучшее совпадение</span>}
              <div className="candidate-card-person">
                <div className="candidate-avatar">
                  {candidate.avatarUrl
                    ? <Image src={candidate.avatarUrl} alt={`Фото ${candidate.name}`} fill sizes="84px" unoptimized />
                    : <span>{candidate.name.trim().slice(0, 1).toUpperCase()}</span>}
                </div>
                <div>
                  <h2>{candidate.name}</h2>
                  <p>{candidate.specialization}</p>
                  <span className="candidate-verified"><BadgeCheck size={15} /> Личность подтверждена</span>
                </div>
              </div>

              <div className="candidate-fast-compare">
                <div><small>Предложенная цена</small><strong>{formatRubles(candidate.proposedPriceRubles)}</strong></div>
                <div><small>Приедет примерно</small><strong>{candidate.etaMinutes} мин</strong></div>
              </div>

              <dl className="candidate-trust-summary" aria-label="Доверие к мастеру">
                <div><dt><Star size={16} /> Рейтинг</dt><dd>{formatRating(candidate.rating)} <small>{formatReviewCount(candidate.reviewsCount)}</small></dd></div>
                <div><dt><Gauge size={16} /> Надёжность</dt><dd>{candidate.reliabilityScore === null ? "Новый мастер" : `${candidate.reliabilityScore}%`}</dd></div>
              </dl>

              <dl className="candidate-proof">
                <div><dt><BriefcaseBusiness size={15} /> Выполнено</dt><dd>{candidate.completedJobs}</dd></div>
                <div><dt><Wrench size={15} /> Похожих работ</dt><dd>{candidate.similarJobs}</dd></div>
              </dl>

              {candidate.comment && <p className="candidate-comment">«{candidate.comment}»</p>}

              <div className="candidate-card-actions">
                <Link className="button button--secondary" href={`/masters/${candidate.masterId}?orderId=${order.id}&offerId=${candidate.offerId}`}>Профиль</Link>
                <SelectMasterButton candidate={candidate} />
              </div>
              <small className="candidate-expiry"><Clock3 size={13} /> Предложение действует ограниченное время</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
