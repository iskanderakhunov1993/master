import { Wrench } from "lucide-react";

type BrandProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function Brand({ compact = false, inverse = false }: BrandProps) {
  return (
    <div className={`brand${inverse ? " brand--inverse" : ""}`} aria-label="Мастер рядом">
      <span className="brand__mark" aria-hidden="true">
        М
        <Wrench className="brand__wrench" size={13} strokeWidth={2.5} />
      </span>
      {!compact && <span className="brand__text">Мастер рядом</span>}
    </div>
  );
}
