import Link from "next/link";
import { Clock3, MapPin, MessageCircle } from "lucide-react";
import { formatRub } from "@/lib/mock-data";

type RequestCardProps = {
  request: {
    id: string;
    title: string;
    category: string;
    budgetAmount: number;
    status: string;
    district: string;
    preferredTime: string;
    description: string;
  };
  href: string;
};

export function RequestCard({ request, href }: RequestCardProps) {
  return (
    <Link href={href} className="request-card">
      <div>
        <span className="pill">{request.category}</span>
        <h3>{request.title}</h3>
        <p>{request.description}</p>
      </div>
      <div className="request-meta">
        <span>
          <MapPin size={15} /> {request.district}
        </span>
        <span>
          <Clock3 size={15} /> {request.preferredTime}
        </span>
        <span>
          <MessageCircle size={15} /> {request.status}
        </span>
      </div>
      <strong>{formatRub(request.budgetAmount)}</strong>
    </Link>
  );
}
