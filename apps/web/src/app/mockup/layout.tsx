import type { ReactNode } from "react";
import { PrefsProvider } from "../../mockup/prefs";

// N16 — bọc toàn khu /mockup trong PrefsProvider để công tắc ngôn ngữ + USD (ở Frame) và nội
// dung mỗi màn cùng đọc 1 nguồn tùy chọn, giữ lựa chọn khi điều hướng.
export default function MockupLayout({ children }: { children: ReactNode }) {
  return <PrefsProvider>{children}</PrefsProvider>;
}
