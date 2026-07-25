import { ArrowRight, Construction } from "lucide-react";
import Link from "next/link";

export function SectionPage({
  eyebrow,
  title,
  description,
  homeHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  homeHref: string;
}) {
  return (
    <div className="section-page">
      <header><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>
      <section className="dashboard-panel section-page__placeholder">
        <span><Construction size={30} /></span>
        <h2>Раздел подготовлен</h2>
        <p>Базовый layout, навигация и контроль доступа уже работают. Содержимое появится на следующем этапе продукта.</p>
        <Link className="text-link" href={homeHref}>Вернуться на главную <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
