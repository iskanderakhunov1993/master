export type CalendarEventKind = "TASK" | "ORDER";
export type CalendarEventTone = "PLANNED" | "COMPLETED" | "URGENT" | "ACTIVE";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  title: string;
  startAt: number;
  href: string;
  statusLabel: string;
  tone: CalendarEventTone;
  clientName?: string;
  location?: string;
};
