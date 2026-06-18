import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { categories } from "@/lib/mock-data";

export default function NewRequestPage() {
  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div>
          <h1>Создать заявку</h1>
          <p className="muted">MVP-форма покрывает категорию, фото, описание, адрес, срочность и бюджет.</p>
        </div>
      </div>
      <form className="form-grid">
        <label className="field">Категория<select>{categories.map((category) => <option key={category.slug}>{category.name}</option>)}</select></label>
        <label className="field">Название<input defaultValue="Течёт кран на кухне" /></label>
        <label className="field">Описание<textarea defaultValue="Нужно снять старый кран и установить новый. Кран уже куплен." /></label>
        <div className="two-col">
          <label className="field">Район<input defaultValue="Хамовники" /></label>
          <label className="field">Адрес<input defaultValue="ул. Ефремова, 12" /></label>
        </div>
        <div className="two-col">
          <label className="field">Срочность<select><option>URGENT</option><option>NORMAL</option></select></label>
          <label className="field">Бюджет<input defaultValue="4500" /></label>
        </div>
        <label className="field">Фото<input type="file" /></label>
        <Link className="primary-btn" href="/client/requests/req-1">Опубликовать заявку</Link>
      </form>
    </AppShell>
  );
}
