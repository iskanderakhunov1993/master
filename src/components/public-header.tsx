"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "#terms", label: "Условия" },
  { href: "#for-masters", label: "Мастерам" },
];

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="ak-header">
      <div className="ak-bar">
        <Link className="ak-mark" href="/">
          <span className="ak-mark__icon" aria-hidden="true">
            М
          </span>
          Мастер рядом
        </Link>

        <nav className="ak-nav" aria-label="Разделы страницы">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ak-header__actions">
          <Link className="ak-btn ak-btn--ghost ak-btn--sm" href="/login">
            Войти
          </Link>
          <Link className="ak-btn ak-btn--primary ak-btn--sm" href="/register?role=CLIENT">
            Создать заказ
          </Link>
        </div>

        <button
          className="ak-burger"
          type="button"
          aria-expanded={isOpen}
          aria-controls="ak-mobile-nav"
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {isOpen && (
        <div className="ak-wrap ak-mobile-nav" id="ak-mobile-nav">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
              {item.label}
            </Link>
          ))}
          <div className="ak-mobile-nav__actions">
            <Link className="ak-btn ak-btn--ghost" href="/login">
              Войти
            </Link>
            <Link className="ak-btn ak-btn--primary" href="/register?role=CLIENT">
              Создать заказ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
