"use client";

import { ArrowRight, Check, Wrench, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { registerAction } from "@/lib/auth/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/types";

import { PasswordField } from "./password-field";

type PublicRole = "CLIENT" | "MASTER";

export function RegisterForm({ initialRole }: { initialRole: PublicRole }) {
  const [state, formAction, isPending] = useActionState(registerAction, INITIAL_AUTH_STATE);
  const [role, setRole] = useState<PublicRole>(initialRole);
  const [password, setPassword] = useState("");

  return (
    <div className="auth-card auth-card--register">
      <div className="auth-card__heading">
        <span className="auth-kicker">Начните бесплатно</span>
        <h1>Создать аккаунт</h1>
        <p>Выберите, как вы хотите пользоваться сервисом.</p>
      </div>

      <form className="auth-form" action={formAction}>
        <fieldset className="role-picker">
          <legend>Я хочу</legend>
          <label className={role === "CLIENT" ? "is-selected" : ""}>
            <input
              type="radio"
              name="role"
              value="CLIENT"
              checked={role === "CLIENT"}
              onChange={() => setRole("CLIENT")}
            />
            <span className="role-picker__icon"><UserRound size={22} /></span>
            <span><strong>Мне нужен мастер</strong><small>Создавать и контролировать заказы</small></span>
            <span className="role-picker__check"><Check size={14} /></span>
          </label>
          <label className={role === "MASTER" ? "is-selected" : ""}>
            <input
              type="radio"
              name="role"
              value="MASTER"
              checked={role === "MASTER"}
              onChange={() => setRole("MASTER")}
            />
            <span className="role-picker__icon"><Wrench size={22} /></span>
            <span><strong>Я мастер</strong><small>Получать подходящие заказы</small></span>
            <span className="role-picker__check"><Check size={14} /></span>
          </label>
        </fieldset>

        <label htmlFor="name">Имя</label>
        <input id="name" name="name" type="text" autoComplete="name" placeholder="Как к вам обращаться" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.ru" required />

        <label htmlFor="password">Пароль</label>
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        <small className="field-hint">Минимум 8 символов</small>

        {state.status === "error" && (
          <div className="form-error" role="alert">{state.message}</div>
        )}

        <button className="button button--primary button--full button--large" disabled={isPending}>
          {isPending ? "Создаём аккаунт…" : "Зарегистрироваться"}
          {!isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>

        <p className="terms-note">Создавая аккаунт, вы соглашаетесь с правилами сервиса и политикой конфиденциальности.</p>
      </form>

      <p className="auth-card__footer">
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </div>
  );
}
