import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /></header>
      <main className="section">
        <span className="badge">Регистрация</span>
        <h2>Создать аккаунт без лишних шагов</h2>
        <p className="muted">Для MVP выбираем роль и сразу попадаем в рабочий сценарий. Полная верификация мастера и документы появятся следующим этапом.</p>
        <form className="form-grid">
          <div className="two-col">
            <label className="field">Имя<input placeholder="Александр" /></label>
            <label className="field">Роль<select><option>Клиент</option><option>Мастер</option></select></label>
          </div>
          <label className="field">Телефон<input placeholder="+7 999 000 00 00" /></label>
          <label className="field">Email<input placeholder="user@example.com" /></label>
          <label className="field">Пароль<input type="password" /></label>
          <Link className="primary-btn" href="/product">Создать профиль и открыть MVP</Link>
        </form>
      </main>
    </div>
  );
}
