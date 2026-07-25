import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AsyncStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  busy?: boolean;
};

export function AsyncState({
  title,
  description,
  icon: Icon = LoaderCircle,
  action,
  busy = false,
}: AsyncStateProps) {
  return (
    <section className="ui-state" aria-live="polite" aria-busy={busy || undefined}>
      <span className={busy ? "ui-state__icon is-spinning" : "ui-state__icon"}><Icon size={23} /></span>
      <div><strong>{title}</strong>{description && <p>{description}</p>}</div>
      {action}
    </section>
  );
}
