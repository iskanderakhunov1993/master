"use client";

import { AlertCircle, Check, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import { changePasswordAction, updateAccountAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/auth/types";

const PAGE_COPY: Record<Role, { eyebrow: string }> = {
  CLIENT: { eyebrow: "Кабинет клиента" },
  MASTER: { eyebrow: "Кабинет мастера" },
  ADMIN: { eyebrow: "Администрирование" },
};

export function AccountSettings({ role, name, email }: { role: Role; name: string; email: string }) {
  return (
    <div className="account-page">
      <header className="client-page-heading">
        <div><span>{PAGE_COPY[role].eyebrow}</span><h1>Профиль</h1><p>Имя, email и пароль для входа в аккаунт.</p></div>
      </header>
      <div className="account-grid">
        <ProfileForm name={name} email={email} />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProfileForm({ name, email }: { name: string; email: string }) {
  const [nameValue, setNameValue] = useState(name);
  const [emailValue, setEmailValue] = useState(email);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setIsSaving(true);
    const result = await updateAccountAction({ name: nameValue, email: emailValue });
    if (!result.ok) setError(result.message ?? "Не удалось сохранить изменения");
    else setSuccess(true);
    setIsSaving(false);
  }

  return (
    <form className="account-card" onSubmit={submit}>
      <header><small>Личные данные</small><h2>Имя и email</h2></header>
      <label>
        Имя
        <input value={nameValue} onChange={(event) => { setNameValue(event.target.value); setSuccess(false); }} maxLength={80} required />
      </label>
      <label>
        Email
        <input type="email" value={emailValue} onChange={(event) => { setEmailValue(event.target.value); setSuccess(false); }} required />
      </label>
      {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
      {success && <p className="task-form-success" role="status"><Check size={16} /> Изменения сохранены</p>}
      <button className="button button--primary" type="submit" disabled={isSaving}>
        {isSaving ? <><LoaderCircle className="spin" size={17} /> Сохраняем…</> : "Сохранить"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setIsSaving(true);
    const result = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
    if (!result.ok) {
      setError(result.message ?? "Не удалось изменить пароль");
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsSaving(false);
  }

  return (
    <form className="account-card" onSubmit={submit}>
      <header><small><ShieldCheck size={13} /> Безопасность</small><h2>Смена пароля</h2></header>
      <label>
        Текущий пароль
        <div className="password-field">
          <input type={isVisible ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setSuccess(false); }} required />
        </div>
      </label>
      <label>
        Новый пароль
        <div className="password-field">
          <input type={isVisible ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setSuccess(false); }} minLength={8} required />
        </div>
      </label>
      <label>
        Повторите новый пароль
        <div className="password-field">
          <input type={isVisible ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setSuccess(false); }} minLength={8} required />
          <button type="button" aria-label={isVisible ? "Скрыть пароли" : "Показать пароли"} onClick={() => setIsVisible((value) => !value)}>
            {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      <p className="field-hint">Минимум 8 символов.</p>
      {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
      {success && <p className="task-form-success" role="status"><Check size={16} /> Пароль изменён</p>}
      <button className="button button--secondary" type="submit" disabled={isSaving}>
        {isSaving ? <><LoaderCircle className="spin" size={17} /> Сохраняем…</> : "Изменить пароль"}
      </button>
    </form>
  );
}
