# End-to-end mockup evidence — Day 2–3

## Mở prototype

```powershell
corepack pnpm mockup
```

Sau đó mở `http://127.0.0.1:4173` hoặc mở trực tiếp `creator-prototype.html`.

## Evidence

- `creator-prototype.html`: clickable low-fi với 12 shared core views, S01–S04 và recovery states.
- V01–V08: Creator; V09: Admin shell; V10: Ops review; V11: Campaign builder; V12: Finance workbench.
- `creator-prototype-v04.png`: snapshot visual Gate G3 đã render ngày 2026-07-18.
- `creator-prototype.png`: snapshot lịch sử của Gate G2; không dùng để chứng minh V09–V12.
- Figma draft cũ trống vì connector mất khả dụng trước khi ghi frame; không dùng file trống làm evidence.

## Review path

1. Chạy S01/S02 để kiểm Creator flow và PH partial KYC.
2. Chạy S03: V05 -> V10 -> V06 -> V10 -> V07; replay approve không tạo earning thứ hai.
3. Chạy S04: V08 -> V12; confirmed failure release once, Unknown hold, Paid và linked reversal.
4. Mở từng V01–V12 từ left nav; country/role context phải luôn visible.
5. Chọn từng state variant và switch VN/PH; recovery phải rõ, không copy dữ liệu xuyên country.

## Giới hạn

Prototype là UX/business contract, không gọi API và không chứng minh feature runtime. PostgreSQL Day 3 chỉ là infrastructure health, chưa có business schema trước G4.
