"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to dark
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }

    // Listen for cross-tab changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue as Theme);
        if (e.newValue === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    };
    
    window.addEventListener("storage", handleStorage);
    
    // Custom event for same-tab updates
    const handleCustomEvent = (e: CustomEvent) => {
      setTheme(e.detail as Theme);
      if (e.detail === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };
    window.addEventListener("theme-change", handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("theme-change", handleCustomEvent as EventListener);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    
    if (nextTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    
    window.dispatchEvent(new CustomEvent("theme-change", { detail: nextTheme }));
  };

  return { theme, toggleTheme };
}
