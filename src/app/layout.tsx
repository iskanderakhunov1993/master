import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "МастерGO / HomeFix",
  description: "MVP маркетплейса бытовых мастеров без высокой комиссии.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
