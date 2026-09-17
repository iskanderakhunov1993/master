import type { Metadata } from "next";
import { Golos_Text, JetBrains_Mono, Unbounded } from "next/font/google";

import "./globals.css";

// Display, body and utility faces for the public landing. All three carry
// native Cyrillic; the dashboards keep their own type stack.
const display = Unbounded({
  subsets: ["cyrillic", "latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Мастер рядом — бытовые мастера рядом с вами",
    template: "%s — Мастер рядом",
  },
  description:
    "Вы называете свою цену, подходящие мастера отвечают своей. Адрес открывается только выбранному мастеру.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
