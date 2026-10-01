"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  FileCheck2,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState, useTransition } from "react";

import {
  completeMasterOnboardingAction,
  saveMasterAreasAction,
  saveMasterBasicAction,
  saveMasterCategoriesAction,
  saveMasterExperienceAction,
  setMasterOnboardingStepAction,
  submitMasterVerificationAction,
} from "@/lib/masters/actions";
import { ALLOWED_MASTER_IMAGE_TYPES, MAX_MASTER_PORTFOLIO_ITEMS } from "@/lib/masters/media";
import { VERIFICATION_LABEL } from "@/lib/masters/presentation";
import type { MasterMedia, MasterProfileData, VerificationStatus } from "@/lib/masters/types";

import { removeMasterImage, uploadMasterImage } from "./media-client";

const onboardingSteps = ["Данные", "Проверка", "Категории", "Районы", "Опыт", "Портфолио"];
const imageAccept = ALLOWED_MASTER_IMAGE_TYPES.join(",");

export function MasterOnboarding({ data, initialStep }: { data: MasterProfileData; initialStep?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(Math.min(6, Math.max(1, initialStep ?? data.profile.onboardingStep)));
  const [error, setError] = useState("");
  const [name, setName] = useState(data.profile.name);
  const [phone, setPhone] = useState(data.profile.phone);
  const [avatar, setAvatar] = useState<MasterMedia | null>(data.profile.avatar);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(data.profile.verificationStatus);
  const [legalName, setLegalName] = useState(data.profile.name);
  const [documentLastFour, setDocumentLastFour] = useState("");
  const [identityDocument, setIdentityDocument] = useState<MasterMedia | null>(data.identityDocument);
  const [categoryIds, setCategoryIds] = useState(data.profile.categories.map((category) => category.id));
  const [areaIds, setAreaIds] = useState(data.profile.serviceAreas.map((area) => area.id));
  const [experienceYears, setExperienceYears] = useState(String(data.profile.experienceYears));
  const [bio, setBio] = useState(data.profile.bio);
  const [portfolio, setPortfolio] = useState(data.profile.portfolio);

  function toggleSelection(id: string, current: string[], update: (ids: string[]) => void) {
    update(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function uploadSingle(event: ChangeEvent<HTMLInputElement>, kind: "AVATAR" | "IDENTITY") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const media = await uploadMasterImage(file, kind, kind === "AVATAR" ? avatar?.id : undefined);
      if (kind === "AVATAR") setAvatar(media);
      else setIdentityDocument(media);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить изображение");
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadPortfolio(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
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
  }

  async function deletePortfolioItem(mediaId: string) {
    setError("");
    setIsUploading(true);
    try {
      await removeMasterImage(mediaId, "PORTFOLIO");
      setPortfolio((current) => current.filter((item) => item.id !== mediaId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить фотографию");
    } finally {
      setIsUploading(false);
    }
  }

  function moveTo(target: number) {
    setError("");
    setStep(target);
    startTransition(async () => {
      await setMasterOnboardingStepAction(target);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    setError("");
    startTransition(async () => {
      let result;
      if (step === 1) {
        if (!avatar) {
          setError("Добавьте фотографию профиля");
          return;
        }
        result = await saveMasterBasicAction({ name, phone });
      } else if (step === 2) {
        if (verificationStatus === "PENDING" || verificationStatus === "VERIFIED") {
          if (data.profile.onboardingCompleted) {
            router.push("/master/profile");
            return;
          }
          moveTo(3);
          return;
        }
        if (!identityDocument) {
          setError("Добавьте фотографию документа");
          return;
        }
        result = await submitMasterVerificationAction({ legalName, documentLastFour, documentMediaId: identityDocument.id });
        if (result.ok) setVerificationStatus("PENDING");
      } else if (step === 3) result = await saveMasterCategoriesAction(categoryIds);
      else if (step === 4) result = await saveMasterAreasAction(areaIds);
      else if (step === 5) result = await saveMasterExperienceAction({ experienceYears: Number(experienceYears), bio });
      else {
        result = await completeMasterOnboardingAction();
        if (result.ok) {
          router.push("/master");
          router.refresh();
          return;
        }
      }

      if (!result?.ok) {
        setError(result?.message ?? "Проверьте введённые данные");
        return;
      }
      if (step < 6) {
        setStep((current) => current + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="master-onboarding-page">
      <header className="master-onboarding-topbar">
        <Link href={data.profile.onboardingCompleted ? "/master/profile" : "/"}><X size={20} /><span>Закрыть</span></Link>
        <div><small>Настройка профиля</small><strong>Шаг {step} из 6 · {onboardingSteps[step - 1]}</strong></div>
        <span><Check size={14} /> Сохраняется</span>
      </header>
      <div className="master-onboarding-progress"><span style={{ width: `${(step / 6) * 100}%` }} /></div>
      <ol className="master-onboarding-stepper" aria-label="Этапы настройки профиля">
        {onboardingSteps.map((label, index) => <li className={index + 1 === step ? "is-current" : index + 1 < step ? "is-complete" : ""} key={label}><span>{index + 1 < step ? <Check size={12} /> : index + 1}</span><small>{label}</small></li>)}
      </ol>
      <main className="master-onboarding-content">{renderStep()}</main>
      <footer className="master-onboarding-footer">
        {step > 1 ? <button className="button button--secondary" type="button" onClick={() => moveTo(step - 1)} disabled={isPending || isUploading}><ArrowLeft size={17} /> Назад</button> : <span />}
        <div>{error && <span className="master-onboarding-error" role="alert"><AlertCircle size={16} /> {error}</span>}<button className="button button--primary button--large" type="button" onClick={next} disabled={isPending || isUploading}>{isPending || isUploading ? <><LoaderCircle className="spin" size={18} /> Сохраняем…</> : <>{step === 6 ? "Завершить настройку" : step === 2 && data.profile.onboardingCompleted ? "Вернуться в профиль" : "Продолжить"} <ArrowRight size={17} /></>}</button></div>
      </footer>
    </div>
  );

  function renderStep() {
    if (step === 1) return (
      <OnboardingSection icon={UserRound} title="Основные данные" description="Клиент увидит ваше имя и фотографию, когда будет выбирать мастера.">
        <div className="master-avatar-editor">
          <div className="master-avatar-preview">{avatar ? <Image src={avatar.url} alt="Фото профиля" fill sizes="120px" unoptimized /> : <span>{name.trim().slice(0, 1).toUpperCase() || <Camera size={28} />}</span>}</div>
          <div><strong>Фотография профиля</strong><p>Чёткое фото лица без документов в кадре.</p><label className="button button--secondary" htmlFor="master-avatar"><Upload size={16} /> {avatar ? "Заменить фото" : "Добавить фото"}</label><input id="master-avatar" type="file" accept={imageAccept} onChange={(event) => uploadSingle(event, "AVATAR")} /></div>
        </div>
        <div className="master-form-grid"><label>Имя<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" placeholder="Михаил" /></label><label>Телефон<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={24} inputMode="tel" autoComplete="tel" placeholder="+7 999 123-45-67" /></label></div>
      </OnboardingSection>
    );

    if (step === 2) return (
      <OnboardingSection icon={BadgeCheck} title="Подтверждение личности" description="Заявку проверит администратор вручную. Статус нельзя изменить самостоятельно.">
        {(verificationStatus === "PENDING" || verificationStatus === "VERIFIED") ? (
          <div className={`verification-state-card is-${verificationStatus.toLowerCase()}`}><span>{verificationStatus === "VERIFIED" ? <BadgeCheck size={28} /> : <LoaderCircle size={28} />}</span><div><small>Verification status</small><h2>{VERIFICATION_LABEL[verificationStatus]}</h2><p>{verificationStatus === "VERIFIED" ? "Данные подтверждены администратором." : "Обычно ручная проверка занимает до одного рабочего дня."}</p></div></div>
        ) : (
          <>
            {verificationStatus === "REJECTED" && <div className="master-alert master-alert--error"><AlertCircle size={18} /><div><strong>Заявка возвращена</strong><p>{data.profile.verificationRejectionReason || "Проверьте данные и отправьте заявку повторно."}</p></div></div>}
            <div className="master-form-grid"><label className="is-wide">Имя как в документе<input value={legalName} onChange={(event) => setLegalName(event.target.value)} maxLength={100} /></label><label>Тип документа<input value="Паспорт" readOnly /></label><label>Последние 4 цифры номера<input value={documentLastFour} onChange={(event) => setDocumentLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" /></label></div>
            <div className="identity-upload"><span><FileCheck2 size={25} /></span><div><strong>{identityDocument ? identityDocument.fileName : "Фотография страницы с данными"}</strong><p>JPG, PNG или WebP · до 8 МБ. Документ доступен только вам и администратору.</p></div><label className="button button--secondary" htmlFor="identity-document">{identityDocument ? "Заменить" : "Загрузить"}</label><input id="identity-document" type="file" accept={imageAccept} onChange={(event) => uploadSingle(event, "IDENTITY")} /></div>
          </>
        )}
        <div className="master-privacy-note"><ShieldCheck size={19} /><p>Мы показываем клиентам только badge «Личность подтверждена», без данных документа.</p></div>
      </OnboardingSection>
    );

    if (step === 3) return (
      <OnboardingSection icon={Wrench} title="Категории работ" description="Выберите одну или несколько категорий — по ним будет формироваться лента заказов.">
        <div className="master-choice-grid">{data.categoryOptions.map((category) => <button className={categoryIds.includes(category.id) ? "is-selected" : ""} type="button" key={category.id} aria-pressed={categoryIds.includes(category.id)} onClick={() => toggleSelection(category.id, categoryIds, setCategoryIds)}><span><Wrench size={19} /></span><strong>{category.name}</strong><Check size={15} /></button>)}</div>
        <p className="master-selection-count">Выбрано: {categoryIds.length}</p>
      </OnboardingSection>
    );

    if (step === 4) return (
      <OnboardingSection icon={MapPinned} title="Районы работы" description="Выберите районы, куда вам удобно выезжать. Точный адрес появится только после выбора мастера клиентом.">
        <div className="service-area-list">{data.areaOptions.map((area) => <button className={areaIds.includes(area.id) ? "is-selected" : ""} type="button" key={area.id} aria-pressed={areaIds.includes(area.id)} onClick={() => toggleSelection(area.id, areaIds, setAreaIds)}><span><MapPinned size={17} /></span><div><strong>{area.name}</strong><small>{area.city}</small></div><Check size={15} /></button>)}</div>
      </OnboardingSection>
    );

    if (step === 5) return (
      <OnboardingSection icon={Sparkles} title="Опыт и о себе" description="Коротко расскажите клиенту, с какими задачами вы работаете и как организуете работу.">
        <div className="master-experience-field"><label>Количество лет опыта<input type="number" min="0" max="70" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label></div>
        <label className="master-bio-field">О себе<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={7} maxLength={1000} placeholder="Например: работаю с сантехникой и установкой бытовой техники. Заранее согласовываю стоимость…" /><span>{bio.length} / 1000</span></label>
      </OnboardingSection>
    );

    return (
      <OnboardingSection icon={ImagePlus} title="Портфолио" description="Добавьте фотографии выполненных работ. Этот шаг необязательный.">
        <div className="portfolio-upload"><input id="master-portfolio" type="file" accept={imageAccept} multiple onChange={uploadPortfolio} disabled={portfolio.length >= MAX_MASTER_PORTFOLIO_ITEMS} /><label htmlFor="master-portfolio"><span><ImagePlus size={25} /></span><strong>Добавить фотографии работ</strong><small>До {MAX_MASTER_PORTFOLIO_ITEMS} изображений · без личных данных клиентов</small></label></div>
        {portfolio.length > 0 && <div className="master-portfolio-grid">{portfolio.map((item, index) => <article key={item.id}><Image src={item.url} alt={`Работа ${index + 1}`} fill sizes="180px" unoptimized /><button type="button" aria-label={`Удалить работу ${index + 1}`} onClick={() => deletePortfolioItem(item.id)}><Trash2 size={16} /></button></article>)}</div>}
        <div className="onboarding-ready-card"><Check size={22} /><div><strong>Профиль почти готов</strong><p>После завершения вы попадёте в кабинет. Принимать заказы можно будет после подтверждения личности.</p></div></div>
      </OnboardingSection>
    );
  }
}

function OnboardingSection({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return <section className="master-onboarding-section"><header><span><Icon size={23} /></span><div><h1>{title}</h1><p>{description}</p></div></header>{children}</section>;
}
