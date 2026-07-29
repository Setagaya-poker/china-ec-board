"use client";

import { useEffect, useState } from "react";

const storageKey = "dashboard-ui-theme";
const themes = ["classic", "phantom-china"] as const;
type ThemeName = (typeof themes)[number];

const isTheme = (value: string | null): value is ThemeName =>
  value === "classic" || value === "phantom-china";

const getInitialTheme = (): ThemeName => {
  if (typeof window === "undefined") return "phantom-china";

  const params = new URLSearchParams(window.location.search);
  const queryTheme = params.get("theme");
  if (isTheme(queryTheme)) return queryTheme;

  const savedTheme = window.localStorage.getItem(storageKey);
  if (isTheme(savedTheme)) return savedTheme;

  return "phantom-china";
};

export function UiThemeClient({ showButton = true }: { showButton?: boolean }) {
  const [theme, setTheme] = useState<ThemeName>("phantom-china");

  useEffect(() => {
    const nextTheme = getInitialTheme();
    setTheme(nextTheme);
    document.documentElement.dataset.uiTheme = nextTheme;
    document.documentElement.classList.add("ui-theme-ready");
    window.localStorage.setItem(storageKey, nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "phantom-china" ? "classic" : "phantom-china";
    setTheme(nextTheme);
    document.documentElement.dataset.uiTheme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
  };

  if (!showButton) {
    return null;
  }

  return (
    <button
      aria-label={`UIテーマを${theme === "phantom-china" ? "classic" : "phantom-china"}へ切り替え`}
      className="themeSwitcher"
      onClick={toggleTheme}
      type="button"
    >
      <span>{theme === "phantom-china" ? "PHANTOM" : "CLASSIC"}</span>
      <strong>{theme === "phantom-china" ? "新" : "旧"}</strong>
    </button>
  );
}
