"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { CalendarEvent } from "@/lib/calendar/types";

type CalendarMode = "DAY" | "WEEK" | "MONTH";

const modeLabels: Record<CalendarMode, string> = { DAY: "День", WEEK: "Неделя", MONTH: "Месяц" };

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(value: Date) {
  const day = value.getDay() || 7;
  return addDays(startOfDay(value), 1 - day);
}

function dateKey(value: Date | number) {
  const date = typeof value === "number" ? new Date(value) : value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function eventTime(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function headerLabel(anchor: Date, mode: CalendarMode) {
  if (mode === "DAY") {
    return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(anchor);
  }
  if (mode === "WEEK") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(start)} — ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(end)}`;
  }
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(anchor);
}

export function CalendarView({
  events,
  audience,
}: {
  events: CalendarEvent[];
  audience: "CLIENT" | "MASTER";
}) {
  const [mode, setMode] = useState<CalendarMode>("MONTH");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const todayKey = dateKey(new Date());

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dateKey(event.startAt);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [events]);

  function navigate(direction: -1 | 1) {
    setAnchor((current) => {
      if (mode === "DAY") return addDays(current, direction);
      if (mode === "WEEK") return addDays(current, direction * 7);
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  }

  const visibleDays = mode === "DAY"
    ? [anchor]
    : mode === "WEEK"
      ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(anchor), index))
      : (() => {
          const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
          const gridStart = startOfWeek(monthStart);
          return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
        })();

  return (
    <div className="calendar-page">
      <header className="client-page-heading calendar-heading">
        <div><span>{audience === "CLIENT" ? "Планы и заказы" : "Рабочее расписание"}</span><h1>Календарь</h1><p>{audience === "CLIENT" ? "Задачи и выезды мастеров без лишних деталей." : "Активные и запланированные заказы в одном расписании."}</p></div>
        <button className="button button--secondary" type="button" onClick={() => setAnchor(startOfDay(new Date()))}>Сегодня</button>
      </header>

      <section className="calendar-shell">
        <div className="calendar-toolbar">
          <div className="calendar-nav"><button type="button" onClick={() => navigate(-1)} aria-label="Предыдущий период"><ChevronLeft size={19} /></button><button type="button" onClick={() => navigate(1)} aria-label="Следующий период"><ChevronRight size={19} /></button><h2>{headerLabel(anchor, mode)}</h2></div>
          <div className="calendar-modes" role="tablist" aria-label="Вид календаря">{(Object.keys(modeLabels) as CalendarMode[]).map((item) => <button aria-selected={mode === item} className={mode === item ? "is-active" : ""} role="tab" type="button" key={item} onClick={() => setMode(item)}>{modeLabels[item]}</button>)}</div>
        </div>

        {events.length === 0 ? (
          <div className="calendar-empty"><span><CalendarDays size={28} /></span><h2>В календаре пока пусто</h2><p>{audience === "CLIENT" ? "Добавьте дату задаче или запланируйте заказ." : "Назначенные заказы появятся здесь автоматически."}</p></div>
        ) : mode === "DAY" ? (
          <DayAgenda date={anchor} events={eventsByDay.get(dateKey(anchor)) ?? []} />
        ) : (
          <div className={`calendar-grid calendar-grid--${mode.toLowerCase()}`}>
            {mode === "MONTH" && ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
            {visibleDays.map((date) => {
              const dayEvents = eventsByDay.get(dateKey(date)) ?? [];
              const outsideMonth = mode === "MONTH" && date.getMonth() !== anchor.getMonth();
              return (
                <article className={`${dateKey(date) === todayKey ? "is-today" : ""} ${outsideMonth ? "is-outside" : ""}`} key={date.toISOString()}>
                  <header><span>{mode === "WEEK" && new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date)}</span><b>{date.getDate()}</b></header>
                  <div>{dayEvents.slice(0, mode === "MONTH" ? 3 : 8).map((event) => <CalendarEventLink event={event} compact={mode === "MONTH"} key={event.id} />)}{mode === "MONTH" && dayEvents.length > 3 && <small>Ещё {dayEvents.length - 3}</small>}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="calendar-legend"><span><i className="is-planned" /> Запланировано</span><span><i className="is-completed" /> Выполнено</span><span><i className="is-urgent" /> Срочно</span></div>
    </div>
  );
}

function DayAgenda({ date, events }: { date: Date; events: CalendarEvent[] }) {
  return (
    <div className="calendar-agenda">
      <header><span>{new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date)}</span><strong>{date.getDate()}</strong></header>
      {events.length ? <div>{events.map((event) => <CalendarEventLink event={event} key={event.id} />)}</div> : <div className="calendar-day-empty"><Clock3 size={22} /><p>На этот день ничего не запланировано.</p></div>}
    </div>
  );
}

function CalendarEventLink({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  return (
    <Link className={`calendar-event calendar-event--${event.tone.toLowerCase()} ${compact ? "is-compact" : ""}`} href={event.href} title={`${event.title} · ${event.statusLabel}`}>
      <time>{eventTime(event.startAt)}</time><strong>{event.title}</strong>{!compact && <span>{event.statusLabel}</span>}
      {!compact && event.clientName && <small><UserRound size={13} /> {event.clientName}</small>}
      {!compact && event.location && <small><MapPin size={13} /> {event.location}</small>}
    </Link>
  );
}
