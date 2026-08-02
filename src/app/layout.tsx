import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Мастер рядом — бытовые мастера рядом с вами",
    template: "%s — Мастер рядом",
  },
  description:
    "Опишите бытовую задачу, сравните предложения и выберите мастера по цене, профилю и истории работ.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
