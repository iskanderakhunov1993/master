"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Brand } from "./brand";

const navigation = [
  { href: "#how-it-works", label: "Как работает" },
  { href: "#benefits", label: "Преимущества" },
  { href: "#for-clients", label: "Для клиентов" },
  { href: "#for-masters", label: "Для мастеров" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#faq", label: "FAQ" },
];

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="public-header">
      <div className="container public-header__inner">
        <Brand />

        <nav className="public-nav" aria-label="Основная навигация">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="public-header__actions">
          <Link className="button button--ghost button--small" href="/login">
            Войти
          </Link>
          <Link className="button button--primary button--small" href="/register">
            Регистрация
          </Link>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-public-nav"
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {isOpen && (
        <div className="mobile-public-nav" id="mobile-public-nav">
          <nav className="container" aria-label="Мобильная навигация">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="mobile-public-nav__actions">
              <Link className="button button--secondary" href="/login">
                Войти
              </Link>
              <Link className="button button--primary" href="/register">
                Регистрация
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
