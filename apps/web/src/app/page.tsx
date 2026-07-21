import { redirect } from "next/navigation";

// Trang gốc gộp vào Trung tâm điều hành (/portal) — không còn màn walking-skeleton rời rạc.
// Các link kiểm chứng country-context (/vn, /ph) + prototype nằm ngay trong /portal.
export default function HomePage() {
  redirect("/portal");
}
