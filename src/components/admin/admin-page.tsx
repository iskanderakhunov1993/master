import type { ReactNode } from "react";

export function AdminPage({ title, description, actions, children }: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-page">
      <header className="client-page-heading">
        <div><span>Администрирование</span><h1>{title}</h1><p>{description}</p></div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function AdminEmpty({ title, description, icon }: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return <section className="client-empty-card"><span>{icon}</span><h2>{title}</h2><p>{description}</p></section>;
}
