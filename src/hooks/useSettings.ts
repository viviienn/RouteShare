"use client";

import { useEffect, useState } from "react";

export function useSettings() {
  const [enable3D, setEnable3D] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("enable3D");
    if (stored !== null) {
      setEnable3D(stored === "true");
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "enable3D" && e.newValue !== null) {
        setEnable3D(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleCustomEvent = (e: CustomEvent) => {
      setEnable3D(e.detail as boolean);
    };
    window.addEventListener("settings-change", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("settings-change", handleCustomEvent as EventListener);
    };
  }, []);

  const toggle3D = () => {
    const nextVal = !enable3D;
    setEnable3D(nextVal);
    localStorage.setItem("enable3D", String(nextVal));
    window.dispatchEvent(new CustomEvent("settings-change", { detail: nextVal }));
  };

  return { enable3D, toggle3D };
}
