import { AsyncState } from "@/components/ui/async-state";

export default function ClientLoading() {
  return <div className="dashboard-route-loading" role="status"><AsyncState title="Загружаем кабинет" description="Проверяем актуальные задачи и заказы." busy /></div>;
}
