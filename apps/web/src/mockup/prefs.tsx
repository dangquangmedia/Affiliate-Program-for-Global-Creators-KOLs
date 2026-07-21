"use client";

// N16 — tùy chọn hiển thị DÙNG CHUNG cho toàn khu mockup: ngôn ngữ UI (vi/en) và có hiện USD
// tham chiếu hay không. Tách bạch 2 khái niệm để giải thích được với mentor:
//   - "locale dữ liệu" = sự thật của NƯỚC (VN → vi-VN, PH → en-PH), hiện ở ContextBanner.
//   - "ngôn ngữ UI" = LỰA CHỌN của người dùng, độc lập với nước → chứng minh i18n + fallback
//     chạy thật (đổi sang EN khi đang xem VN vẫn được).
// Lưu localStorage để giữ lựa chọn khi điều hướng giữa các màn. Mặc định vi + không USD để
// mọi luồng E2E (assert chuỗi tiếng Việt, tiền local) giữ nguyên.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "../lib/i18n";
import type { Market } from "./data";

interface Prefs {
  lang: Lang;
  market: Market; // NƯỚC đang chọn — DÙNG CHUNG mọi màn (không còn cục bộ từng trang)
  showUsd: boolean;
  setLang: (l: Lang) => void;
  setMarket: (m: Market) => void;
  toggleUsd: () => void;
}

const PrefsContext = createContext<Prefs | null>(null);

const LANG_KEY = "ag_pref_lang";
const USD_KEY = "ag_pref_usd";
const MARKET_KEY = "ag_pref_market";

// Mỗi nước có ngôn ngữ mặc định: VN → vi-VN, PH → en-PH. Đổi nước sẽ kéo theo ngôn ngữ này.
const marketLang = (m: Market): Lang => (m === "VN" ? "vi" : "en");

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  const [market, setMarketState] = useState<Market>("VN");
  const [showUsd, setShowUsd] = useState(false);

  // Đọc lại lựa chọn đã lưu sau khi hydrate (tránh lệch server/client).
  useEffect(() => {
    const savedMarket = window.localStorage.getItem(MARKET_KEY);
    if (savedMarket === "VN" || savedMarket === "PH") setMarketState(savedMarket);
    const l = window.localStorage.getItem(LANG_KEY);
    if (l === "vi" || l === "en") setLangState(l);
    if (window.localStorage.getItem(USD_KEY) === "1") setShowUsd(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  }, []);

  // Đổi nước = đổi luôn ngôn ngữ + tiền tệ (tiền tệ suy ra từ market ở nơi hiển thị).
  const setMarket = useCallback((m: Market) => {
    setMarketState(m);
    window.localStorage.setItem(MARKET_KEY, m);
    const l = marketLang(m);
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  }, []);

  const toggleUsd = useCallback(() => {
    setShowUsd((prev) => {
      const next = !prev;
      window.localStorage.setItem(USD_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <PrefsContext.Provider value={{ lang, market, showUsd, setLang, setMarket, toggleUsd }}>
      {children}
    </PrefsContext.Provider>
  );
}

/** Lấy tùy chọn hiển thị. Ngoài PrefsProvider trả mặc định vi + VN + không USD (an toàn cho SSR). */
export function usePrefs(): Prefs {
  return (
    useContext(PrefsContext) ?? {
      lang: "vi",
      market: "VN",
      showUsd: false,
      setLang: () => {},
      setMarket: () => {},
      toggleUsd: () => {},
    }
  );
}
