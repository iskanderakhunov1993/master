import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImageIcon,
  MapPin,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { SelectMasterButton } from "@/components/client/select-master-button";
import type { ClientCandidate } from "@/lib/marketplace/types";
import { formatExperience, formatRating, formatReviewCount } from "@/lib/masters/presentation";
import { formatRubles } from "@/lib/orders/presentation";
import type { MasterProfileData } from "@/lib/masters/types";

export function PublicMasterProfile({
  data,
  candidate,
  backHref = "/",
}: {
  data: MasterProfileData;
  candidate?: ClientCandidate;
  backHref?: string;
}) {
  const { profile } = data;
  const reliability = profile.statistics.reliability;
  const similarJobs = candidate?.similarJobs
    ?? Math.max(0, ...data.categoryStats.map((stat) => stat.completedJobs));
  const onTimeRate = profile.statistics.completedJobs > 0
    ? Math.round(Math.max(0, profile.statistics.completedJobs - profile.statistics.lateArrivals) / profile.statistics.completedJobs * 100)
    : null;

  return (
    <div className="public-master-page">
      <header className="public-master-header"><Brand /><Link href={backHref}><ArrowLeft size={16} /> {candidate ? "К предложениям" : "На главную"}</Link></header>
      <main>
        <section className="public-master-hero">
          <div className="public-master-avatar">{profile.avatar ? <Image src={profile.avatar.url} alt={`Фото ${profile.name}`} fill sizes="140px" unoptimized /> : <span>{profile.name.trim().slice(0, 1).toUpperCase()}</span>}</div>
          <div className="public-master-intro"><span>Профиль мастера</span><h1>{profile.name}</h1><p>{candidate?.specialization ?? profile.categories.map((category) => category.name).join(" · ")}</p><div className="public-master-rating-line"><strong><Star size={16} fill="currentColor" /> {formatRating(profile.statistics.rating)}</strong><small>{formatReviewCount(profile.statistics.reviewsCount)}</small></div><div>{profile.verificationStatus === "VERIFIED" && <b><BadgeCheck size={16} /> Личность подтверждена</b>}<small><MapPin size={14} /> {profile.serviceAreas.slice(0, 3).map((area) => area.name).join(", ")}</small></div></div>
        </section>

        <section className="public-master-stats" aria-label="Показатели мастера">
          <article><Star size={20} /><strong>{formatRating(profile.statistics.rating)}</strong><span>{formatReviewCount(profile.statistics.reviewsCount)}</span></article>
          <article><BriefcaseBusiness size={20} /><strong>{profile.statistics.completedJobs}</strong><span>заказов выполнено</span></article>
          <article><ShieldCheck size={20} /><strong>{reliability.score === null ? "—" : `${reliability.score}%`}</strong><span>надёжность · {reliability.label.toLowerCase()}</span></article>
          <article><Wrench size={20} /><strong>{similarJobs}</strong><span>похожих работ</span></article>
          <article><Clock3 size={20} /><strong>{onTimeRate === null ? "—" : `${onTimeRate}%`}</strong><span>приездов вовремя</span></article>
          <article><CalendarDays size={20} /><strong>{profile.experienceYears}</strong><span>{formatExperience(profile.experienceYears)}</span></article>
        </section>

        <div className="public-master-layout">
          <div>
            <section className="public-master-section"><header><span>О специалисте</span><h2>Опыт и подход к работе</h2></header><p className="public-master-bio">{profile.bio}</p><div className="public-master-tags">{profile.categories.map((category) => <span key={category.id}><Wrench size={14} /> {category.name}</span>)}</div></section>

            <section className="public-master-section"><header><span>Примеры</span><h2>Портфолио</h2></header>{profile.portfolio.length > 0 ? <div className="public-master-portfolio">{profile.portfolio.map((item, index) => <Image key={item.id} src={item.url} alt={`Пример работы ${index + 1}`} width={260} height={190} unoptimized />)}</div> : <div className="public-master-empty"><ImageIcon size={25} /><div><strong>Фотографии пока не добавлены</strong><p>История выполненных работ доступна ниже.</p></div></div>}</section>

            <section className="public-master-section"><header><span>История</span><h2>Недавние работы</h2></header>{data.workHistory.length > 0 ? <ol className="public-work-history">{data.workHistory.map((item) => <li key={item.id}><span><CheckCircle2 size={16} /></span><div><strong>{item.title}</strong><b className="public-work-status">Выполнено</b><p>{item.description}</p><small>{new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(item.completedAt)}</small></div></li>)}</ol> : <div className="public-master-empty"><BriefcaseBusiness size={24} /><div><strong>История формируется</strong><p>Здесь появятся подтверждённые выполненные заказы.</p></div></div>}</section>

            <section className="public-master-section"><header><span>Отзывы</span><h2>Что говорят клиенты</h2></header><div className="public-review-summary"><Metric label="Качество" value={data.reviewSummary.quality} /><Metric label="Пунктуальность" value={data.reviewSummary.punctuality} /><Metric label="Общение" value={data.reviewSummary.communication} /><Metric label="Соблюдение договорённостей" value={data.reviewSummary.agreement} /></div>{data.reviews.length > 0 ? <div className="public-review-list">{data.reviews.map((review) => <article key={review.id}><div><strong>{review.clientName}</strong><span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < review.rating ? "currentColor" : "none"} />)}</span></div><p>{review.body}</p><small>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(review.createdAt)}</small></article>)}</div> : <div className="public-master-empty"><Star size={24} /><div><strong>Отзывов пока нет</strong><p>Они появятся после завершённых заказов.</p></div></div>}</section>
          </div>

          <aside className="public-master-aside">{candidate && <section className="public-candidate-offer"><span>Предложение мастера</span><strong>{formatRubles(candidate.proposedPriceRubles)}</strong><p><Clock3 size={16} /> Приедет примерно через {candidate.etaMinutes} минут</p><SelectMasterButton candidate={candidate} className="button button--primary button--large" /></section>}<section className="public-master-trust"><BadgeCheck size={27} /><h2>{profile.verificationStatus === "VERIFIED" ? "Личность подтверждена" : "Проверка не завершена"}</h2><p>Администратор вручную проверяет данные мастера. Это не является гарантией абсолютной безопасности или результата работы.</p><ul><li><CheckCircle2 size={15} /> Профиль и история работ</li><li><CheckCircle2 size={15} /> Рейтинг и отзывы</li><li><CheckCircle2 size={15} /> Прозрачная надёжность</li></ul></section></aside>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div><span>{label}</span><strong>{value === null ? "—" : value.toFixed(1)}</strong></div>;
}
