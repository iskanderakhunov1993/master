"use client";

import { ArrowRight, BriefcaseBusiness, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { loginAction } from "@/lib/auth/actions";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { INITIAL_AUTH_STATE, ROLE_LABEL } from "@/lib/auth/types";

import { PasswordField } from "./password-field";

const roleIcon = {
  CLIENT: UserRound,
  MASTER: BriefcaseBusiness,
  ADMIN: ShieldCheck,
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL_AUTH_STATE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <span className="auth-kicker">С возвращением</span>
        <h1>Войти в аккаунт</h1>
        <p>Продолжите работу с заказами и задачами.</p>
      </div>

      <form className="auth-form" action={formAction}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.ru"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <div className="field-label-row">
          <label htmlFor="password">Пароль</label>
        </div>
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />

        {state.status === "error" && (
          <div className="form-error" role="alert">{state.message}</div>
        )}

        <button className="button button--primary button--full button--large" disabled={isPending}>
          {isPending ? "Входим…" : "Войти"}
          {!isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>

      <div className="auth-divider"><span>или войдите в demo-аккаунт</span></div>

      <div className="demo-users">
        {DEMO_USERS.map((user) => {
          const Icon = roleIcon[user.role];
          return (
            <button
              type="button"
              key={user.email}
              onClick={() => {
                setEmail(user.email);
                setPassword(user.password);
              }}
            >
              <span className={`demo-users__icon demo-users__icon--${user.role.toLowerCase()}`}>
                <Icon size={18} />
              </span>
              <span><strong>{ROLE_LABEL[user.role]}</strong><small>{user.email}</small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="demo-hint">Пароль для всех demo-пользователей: <strong>Demo123!</strong></p>

      <p className="auth-card__footer">
        Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
