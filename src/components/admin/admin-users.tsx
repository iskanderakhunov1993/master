import { UsersRound } from "lucide-react";

import type { AdminUser } from "@/lib/admin/types";
import { ROLE_LABEL } from "@/lib/auth/types";

import { AdminEmpty, AdminPage } from "./admin-page";
import { UserBlockButton } from "./user-block-button";

const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" });

export function AdminUsers({ users }: { users: AdminUser[] }) {
  return (
    <AdminPage title="Пользователи" description="Роли, состояние доступа и активность аккаунтов.">
      {users.length === 0 ? <AdminEmpty icon={<UsersRound />} title="Пользователей нет" description="Новые аккаунты появятся здесь после регистрации." /> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Заказы</th><th>Регистрация</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id}><td data-label="Пользователь"><strong>{user.name}</strong><small>{user.email}</small></td><td data-label="Роль"><span className="admin-role-pill">{ROLE_LABEL[user.role]}</span></td><td data-label="Статус"><span className={`admin-status ${user.isBlocked ? "is-blocked" : "is-active"}`}>{user.isBlocked ? "Заблокирован" : "Активен"}</span></td><td data-label="Заказы">{user.orderCount}</td><td data-label="Регистрация">{date.format(user.createdAt)}</td><td data-label="Действия"><UserBlockButton userId={user.id} userName={user.name} isBlocked={user.isBlocked} disabled={user.role === "ADMIN"} /></td></tr>)}
        </tbody></table></div>
      )}
    </AdminPage>
  );
}
