"use client";

import {
  AlertCircle,
  BadgeCheck,
  Camera,
  Check,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState, useTransition } from "react";

import {
  saveMasterProfileAction,
} from "@/lib/masters/actions";
import { ALLOWED_MASTER_IMAGE_TYPES, MAX_MASTER_PORTFOLIO_ITEMS } from "@/lib/masters/media";
import { formatExperience, formatRating, formatReviewCount, VERIFICATION_LABEL } from "@/lib/masters/presentation";
import type { MasterMedia, MasterProfileData } from "@/lib/masters/types";

import { removeMasterImage, uploadMasterImage } from "./media-client";

const imageAccept = ALLOWED_MASTER_IMAGE_TYPES.join(",");

export function MasterProfileEditor({ data }: { data: MasterProfileData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(data.profile.name);
  const [phone, setPhone] = useState(data.profile.phone);
  const [experienceYears, setExperienceYears] = useState(String(data.profile.experienceYears));
  const [bio, setBio] = useState(data.profile.bio);
  const [categoryIds, setCategoryIds] = useState(data.profile.categories.map((category) => category.id));
  const [areaIds, setAreaIds] = useState(data.profile.serviceAreas.map((area) => area.id));
  const [avatar, setAvatar] = useState<MasterMedia | null>(data.profile.avatar);
  const [portfolio, setPortfolio] = useState(data.profile.portfolio);
  const reliability = data.profile.statistics.reliability;

  function toggle(id: string, values: string[], setValues: (values: string[]) => void) {
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
    setSaved(false);
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      setAvatar(await uploadMasterImage(file, "AVATAR", avatar?.id));
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadPortfolio(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (portfolio.length + files.length > MAX_MASTER_PORTFOLIO_ITEMS) {
      setError(`В портфолио можно добавить не больше ${MAX_MASTER_PORTFOLIO_ITEMS} фотографий`);
      return;
    }
    setError("");
    setIsUploading(true);
    for (const file of files) {
      try {
        const media = await uploadMasterImage(file, "PORTFOLIO");
        setPortfolio((current) => [...current, media]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию");
      }
    }
    setIsUploading(false);
    router.refresh();
  }

  async function deletePortfolio(mediaId: string) {
    setError("");
    setIsUploading(true);
    try {
      await removeMasterImage(mediaId, "PORTFOLIO");
      setPortfolio((current) => current.filter((media) => media.id !== mediaId));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить фотографию");
    } finally {
      setIsUploading(false);
    }
  }

  function saveProfile() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await saveMasterProfileAction({
        name,
        phone,
        experienceYears: Number(experienceYears),
        bio,
        categoryIds,
        areaIds,
      });
      if (!result.ok) {
        setError(result.message ?? "Не удалось сохранить профиль");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="master-profile-page">
      <header className="master-profile-hero">
        <div className="master-profile-avatar">{avatar ? <Image src={avatar.url} alt={`Фото ${name}`} fill sizes="112px" unoptimized /> : <span>{name.trim().slice(0, 1).toUpperCase() || <Camera size={28} />}</span>}<label htmlFor="profile-avatar" aria-label="Заменить фотографию"><Camera size={16} /></label><input id="profile-avatar" type="file" accept={imageAccept} onChange={uploadAvatar} /></div>
        <div className="master-profile-hero__identity"><span>Профиль мастера</span><h1>{name}</h1><p>{data.profile.categories.map((category) => category.name).join(" · ") || "Категории не выбраны"}</p><div>{data.profile.verificationStatus === "VERIFIED" && <b><BadgeCheck size={15} /> Личность подтверждена</b>}<small>{formatExperience(Number(experienceYears) || 0)}</small></div></div>
        <Link className="button button--secondary" href={`/masters/${data.profile.masterId}`} target="_blank">Публичный профиль <ExternalLink size={16} /></Link>
      </header>

      <section className="master-profile-stats">
        <article><strong>{formatRating(data.profile.statistics.rating)}</strong><span><Star size={15} /> Рейтинг · {formatReviewCount(data.profile.statistics.reviewsCount)}</span></article>
        <article><strong>{data.profile.statistics.completedJobs}</strong><span><Wrench size={15} /> Выполнено заказов</span></article>
        <article><strong>{reliability.score === null ? "—" : `${reliability.score}%`}</strong><span><ShieldCheck size={15} /> Надёжность · {reliability.label}</span></article>
      </section>

      <section className={`master-verification-card is-${data.profile.verificationStatus.toLowerCase()}`}>
        <span><BadgeCheck size={24} /></span>
        <div><small>Подтверждение личности</small><h2>{VERIFICATION_LABEL[data.profile.verificationStatus]}</h2><p>{data.profile.verificationStatus === "VERIFIED" ? "Статус установлен администратором и не может быть изменён в профиле." : data.profile.verificationStatus === "PENDING" ? "Заявка находится на ручной проверке." : data.profile.verificationRejectionReason || "Подайте данные на ручную проверку."}</p></div>
        {data.profile.verificationStatus !== "VERIFIED" && <Link className="button button--secondary" href="/master/onboarding?step=2">{data.profile.verificationStatus === "REJECTED" ? "Исправить заявку" : "Открыть проверку"}</Link>}
      </section>

      {error && <div className="master-alert master-alert--error" role="alert"><AlertCircle size={18} /> {error}</div>}
      {saved && <div className="master-alert master-alert--success" role="status"><Check size={18} /> Изменения сохранены</div>}

      <div className="master-profile-layout">
        <div className="master-profile-edit-sections">
          <section className="master-profile-section"><header><span>Основное</span><h2>Контактные данные</h2></header><div className="master-form-grid"><label>Имя<input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={80} /></label><label>Телефон<input value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false); }} maxLength={24} inputMode="tel" /></label><label>Опыт, лет<input type="number" min="0" max="70" value={experienceYears} onChange={(event) => { setExperienceYears(event.target.value); setSaved(false); }} /></label><label className="is-wide">О себе<textarea value={bio} onChange={(event) => { setBio(event.target.value); setSaved(false); }} rows={6} maxLength={1000} /><span>{bio.length} / 1000</span></label></div></section>

          <section className="master-profile-section"><header><span>Специализация</span><h2>Категории</h2></header><div className="master-profile-chips">{data.categoryOptions.map((category) => <button className={categoryIds.includes(category.id) ? "is-selected" : ""} type="button" key={category.id} aria-pressed={categoryIds.includes(category.id)} onClick={() => toggle(category.id, categoryIds, setCategoryIds)}><Check size={13} /> {category.name}</button>)}</div></section>

          <section className="master-profile-section"><header><span>География</span><h2>Районы работы</h2></header><div className="master-area-chips">{data.areaOptions.map((area) => <button className={areaIds.includes(area.id) ? "is-selected" : ""} type="button" key={area.id} aria-pressed={areaIds.includes(area.id)} onClick={() => toggle(area.id, areaIds, setAreaIds)}><MapPinned size={14} /> {area.name}</button>)}</div></section>

          <section className="master-profile-section"><header><div><span>Работы</span><h2>Портфолио</h2></div><label className="button button--secondary" htmlFor="profile-portfolio"><ImagePlus size={16} /> Добавить</label><input id="profile-portfolio" type="file" accept={imageAccept} multiple onChange={uploadPortfolio} /></header>{portfolio.length > 0 ? <div className="master-portfolio-grid">{portfolio.map((item, index) => <article key={item.id}><Image src={item.url} alt={`Работа ${index + 1}`} fill sizes="180px" unoptimized /><button type="button" aria-label={`Удалить работу ${index + 1}`} onClick={() => deletePortfolio(item.id)}><Trash2 size={16} /></button></article>)}</div> : <div className="master-profile-empty"><ImagePlus size={23} /><div><strong>Портфолио пока пустое</strong><p>Добавьте фотографии, которые помогают оценить качество работ.</p></div></div>}</section>

          <div className="master-profile-save"><button className="button button--primary button--large" type="button" onClick={saveProfile} disabled={isPending || isUploading}>{isPending || isUploading ? <><LoaderCircle className="spin" size={18} /> Сохраняем…</> : <><Save size={17} /> Сохранить профиль</>}</button></div>
        </div>

        <aside className="master-reliability-card"><span>Прозрачный показатель</span><h2>Надёжность</h2><strong>{reliability.score === null ? "Нет данных" : `${reliability.score}%`}</strong><p>Формула учитывает только факты выполнения заказов и не является гарантией абсолютной безопасности.</p><ul>{reliability.metrics.map((metric) => <li key={metric.label}><div><span>{metric.label}</span><b>{metric.value}</b></div>{metric.penalty > 0 && <small>−{metric.penalty} п.</small>}</li>)}</ul></aside>
      </div>
    </div>
  );
}
