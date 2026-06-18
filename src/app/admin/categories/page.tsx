import { AppShell } from "@/components/AppShell";
import { categories } from "@/lib/mock-data";

export default function AdminCategoriesPage() {
  return (
    <AppShell role="ADMIN">
      <h1>Категории</h1>
      <div className="grid-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return <article className="card" key={category.slug}><span className="card-icon"><Icon size={24} /></span><h3>{category.name}</h3><p>{category.count} мастеров</p></article>;
        })}
      </div>
    </AppShell>
  );
}
