import { Wrench } from "lucide-react";

import type { AdminMaster } from "@/lib/admin/types";
import { VERIFICATION_LABEL } from "@/lib/masters/presentation";

import { AdminEmpty, AdminPage } from "./admin-page";
import { UserBlockButton } from "./user-block-button";

export function AdminMasters({ masters }: { masters: AdminMaster[] }) {
  return (
    <AdminPage title="Мастера" description="Профили, верификация, рабочий статус и показатели мастеров.">
      {masters.length === 0 ? <AdminEmpty icon={<Wrench />} title="Мастеров пока нет" description="Зарегистрированные мастера появятся в этом списке." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Мастер</th><th>Категории</th><th>Верификация</th><th>Рабочий статус</th><th>Рейтинг</th><th>Выполнено</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>
          {masters.map((master) => <tr key={master.id}><td data-label="Мастер"><strong>{master.name}</strong><small>{master.email}</small></td><td data-label="Категории">{master.categories || "Не выбраны"}</td><td data-label="Верификация"><span className={`admin-status is-${master.verificationStatus.toLowerCase()}`}>{VERIFICATION_LABEL[master.verificationStatus]}</span></td><td data-label="Рабочий статус"><span className={`admin-status ${master.isBlocked ? "is-blocked" : master.isOnline ? "is-active" : ""}`}>{master.isBlocked ? "Заблокирован" : master.isOnline ? "Принимает заказы" : "Не принимает"}</span></td><td data-label="Рейтинг">{master.rating?.toFixed(1) ?? "Новый"}<small>{master.reviewsCount} отзывов</small></td><td data-label="Выполнено">{master.completedJobs}</td><td data-label="Действия"><UserBlockButton userId={master.id} userName={master.name} isBlocked={master.isBlocked} /></td></tr>)}
        </tbody></table></div>
      )}
    </AdminPage>
  );
}
