import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /></header>
      <main className="section">
        <span className="badge">Вход</span>
        <h2>Войти в сервис</h2>
        <form className="form-grid">
          <label className="field">Email<input defaultValue="client@homefix.local" /></label>
          <label className="field">Пароль<input type="password" defaultValue="demo1234" /></label>
          <Link className="primary-btn" href="/product">Войти как клиент</Link>
          <Link className="secondary-btn" href="/product">Войти как мастер</Link>
        </form>
      </main>
    </div>
  );
}
