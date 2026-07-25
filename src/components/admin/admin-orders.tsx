import { ClipboardList } from "lucide-react";
import Link from "next/link";

import type { AdminOrder } from "@/lib/admin/types";
import { formatRubles, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";

import { AdminEmpty, AdminPage } from "./admin-page";

const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  return (
    <AdminPage title="Заказы" description="Операционный обзор заказов и их текущих состояний.">
      {orders.length === 0 ? <AdminEmpty icon={<ClipboardList />} title="Заказов пока нет" description="Отправленные клиентами заказы появятся здесь." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Заказ</th><th>Статус</th><th>Участники</th><th>Цена</th><th>Создан</th></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id}><td data-label="Заказ"><Link className="admin-order-link" href={`/admin/orders?order=${order.id}`}>{order.categoryName}</Link><small>{order.description || "Без описания"}</small>{order.orderType === "URGENT" && <span className="admin-urgent">Срочно</span>}</td><td data-label="Статус"><span className={`admin-status is-${order.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[order.status]}</span></td><td data-label="Участники"><strong>{order.clientName}</strong><small>{order.masterName || "Мастер не выбран"}</small></td><td data-label="Цена">{formatRubles(order.priceRubles)}</td><td data-label="Создан">{date.format(order.createdAt)}</td></tr>)}
        </tbody></table></div>
      )}
    </AdminPage>
  );
}
