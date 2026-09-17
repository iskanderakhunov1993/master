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
    <header className="nz-header">
      <div className="nz-wrap nz-header__bar">
        <Link className="nz-logo" href="/">
          <span className="nz-logo__mark" aria-hidden="true">
            М
          </span>
          Мастер рядом
        </Link>

        <nav className="nz-nav" aria-label="Разделы страницы">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nz-header__actions">
          <Link className="nz-btn nz-btn--sm nz-btn--outline" href="/login">
            Войти
          </Link>
          <Link className="nz-btn nz-btn--sm nz-btn--primary" href="/register?role=CLIENT">
            Создать заказ
          </Link>
        </div>

        <button
          className="nz-burger"
          type="button"
          aria-expanded={isOpen}
          aria-controls="nz-mobile-nav"
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {isOpen && (
        <div className="nz-wrap nz-mobile-nav" id="nz-mobile-nav">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
              {item.label}
            </Link>
          ))}
          <div className="nz-mobile-nav__actions">
            <Link className="nz-btn nz-btn--outline" href="/login">
              Войти
            </Link>
            <Link className="nz-btn nz-btn--primary" href="/register?role=CLIENT">
              Создать заказ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
