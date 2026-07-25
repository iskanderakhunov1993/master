import { House, Wrench } from "lucide-react";
import Link from "next/link";

type BrandProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function Brand({ compact = false, inverse = false }: BrandProps) {
  return (
    <Link
      className={`brand${inverse ? " brand--inverse" : ""}`}
      href="/"
      aria-label="Мастер рядом — на главную"
    >
      <span className="brand__mark" aria-hidden="true">
        <House size={21} strokeWidth={2.25} />
        <Wrench className="brand__wrench" size={13} strokeWidth={2.6} />
      </span>
      {!compact && <span className="brand__text">Мастер рядом</span>}
    </Link>
  );
}
