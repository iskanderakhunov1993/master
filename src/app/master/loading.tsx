import { AsyncState } from "@/components/ui/async-state";

export default function MasterLoading() {
  return <div className="dashboard-route-loading" role="status"><AsyncState title="Загружаем кабинет" description="Проверяем заказы и расписание." busy /></div>;
}
