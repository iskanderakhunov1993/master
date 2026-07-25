import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Мастер рядом — бытовые мастера рядом с вами",
    template: "%s — Мастер рядом",
  },
  description:
    "Создайте заказ за минуту и получите предложения от проверенных бытовых мастеров рядом с вами.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
