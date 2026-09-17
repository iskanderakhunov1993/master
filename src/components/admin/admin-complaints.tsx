import { MessageSquareWarning } from "lucide-react";
import Link from "next/link";

import type { AdminComplaint } from "@/lib/admin/types";

import { AdminEmpty, AdminPage } from "./admin-page";

const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
const statusLabel = { OPEN: "Открыта", IN_REVIEW: "На рассмотрении", RESOLVED: "Решена", REJECTED: "Отклонена" };

export function AdminComplaints({ complaints }: { complaints: AdminComplaint[] }) {
  return (
    <AdminPage title="Жалобы и споры" description="Обращения пользователей и заказы, по которым открыт спор.">
      {complaints.length === 0 ? <AdminEmpty icon={<MessageSquareWarning />} title="Открытых обращений нет" description="Если клиент сообщит о проблеме с выполнением, обращение появится здесь автоматически." /> : (
        <div className="admin-complaint-list">{complaints.map((complaint) => <article key={complaint.id}><header><span className="admin-complaint-icon"><MessageSquareWarning /></span><div><small>{complaint.kind === "DISPUTE" ? "Спор по заказу" : "Жалоба"} · {date.format(complaint.createdAt)}</small><h2>{complaint.subject}</h2></div><span className={`admin-status is-${complaint.status.toLowerCase()}`}>{statusLabel[complaint.status]}</span></header><p>{complaint.description}</p><dl><div><dt>Отправитель</dt><dd>{complaint.reporterName}</dd></div><div><dt>Вторая сторона</dt><dd>{complaint.againstName || "Не указана"}</dd></div></dl><Link href={`/admin/orders?order=${complaint.orderId}`}>Заказ #{complaint.orderId.slice(0, 8)}</Link></article>)}</div>
      )}
    </AdminPage>
  );
}
