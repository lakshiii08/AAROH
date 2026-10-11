"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Language, getTranslation } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, params) => getTranslation("en", key, params),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  const applyLanguageToDOM = useCallback((lang: Language) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "sat" ? "sat" : lang === "hi" ? "hi" : "en";
      document.body.setAttribute("data-lang", lang);
      if (lang === "sat") {
        document.body.classList.add("lang-sat");
      } else {
        document.body.classList.remove("lang-sat");
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    let currentLang: Language = "en";
    const savedLang = localStorage.getItem("aaroh_language") as Language | null;
    if (savedLang && (savedLang === "en" || savedLang === "hi" || savedLang === "sat")) {
      currentLang = savedLang;
      setLanguageState(savedLang);
    }
    applyLanguageToDOM(currentLang);

    // Cross-tab and window sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "aaroh_language" && e.newValue) {
        const newLang = e.newValue as Language;
        if (newLang === "en" || newLang === "hi" || newLang === "sat") {
          setLanguageState(newLang);
          applyLanguageToDOM(newLang);
        }
      }
    };

    const handleCustomChange = (e: any) => {
      if (e.detail && (e.detail === "en" || e.detail === "hi" || e.detail === "sat")) {
        setLanguageState(e.detail);
        applyLanguageToDOM(e.detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("aaroh-language-change", handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("aaroh-language-change", handleCustomChange);
    };
  }, [applyLanguageToDOM]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    applyLanguageToDOM(lang);

    if (typeof window !== "undefined") {
      localStorage.setItem("aaroh_language", lang);
      window.dispatchEvent(new CustomEvent("aaroh-language-change", { detail: lang }));

      // Asynchronously sync to user & teacher preference endpoints
      fetch("/api/user/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});

      fetch("/api/teacher/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return getTranslation(language, key, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
