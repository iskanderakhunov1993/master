import Link from "next/link";
import { Wrench } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="brand-link">
      <span className="brand-mark">
        <Wrench size={21} />
      </span>
      <span>
        Home<b>Fix</b>
      </span>
    </Link>
  );
}
