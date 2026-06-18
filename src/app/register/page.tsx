import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /></header>
      <main className="section">
        <span className="badge">Регистрация</span>
        <h2>Создать аккаунт</h2>
        <form className="form-grid">
          <div className="two-col">
            <label className="field">Имя<input placeholder="Александр" /></label>
            <label className="field">Роль<select><option>CLIENT</option><option>MASTER</option></select></label>
          </div>
          <label className="field">Телефон<input placeholder="+7 999 000 00 00" /></label>
          <label className="field">Email<input placeholder="user@example.com" /></label>
          <label className="field">Пароль<input type="password" /></label>
          <Link className="primary-btn" href="/client/dashboard">Создать профиль</Link>
        </form>
      </main>
    </div>
  );
}
