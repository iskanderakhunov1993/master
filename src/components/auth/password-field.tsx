"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
};

export function PasswordField({ value, onChange, autoComplete }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id="password"
        name="password"
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="Введите пароль"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <button
        type="button"
        aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}
