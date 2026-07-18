# Gate G2 — Creator UX Review

> Review date: 2026-07-17  
> Result: **GREEN / PASS**  
> Prototype mode: Clickable HTML fallback theo DEC-14

## Task completion

| Task | Result | Evidence |
|---|---|---|
| W1-D2-T01 Creator IA/navigation | PASS | `CREATOR_IA.md`; CR-01–CR-08 trace; country/profile persistent shell |
| W1-D2-T02 8 Creator low-fi views | PASS | `creator-prototype.html`; V01–V08 có goal/data/CTA/condition |
| W1-D2-T03 State/recovery variants | PASS | 8 common variants; KYC/content/payout domain states và recovery CTA |
| W1-D2-T04 Clickable S01/S02 | PASS | Scenario runner dùng shared V01–V08, không dead end; VN/PH context switch độc lập |
| W1-D2-T05 Screen-to-data contract | PASS | `SCREEN_DATA_CONTRACT.md`; `SCREEN_INVENTORY.md` v0.2 |
| W1-D2-T06 Tooling skeleton | PASS | pnpm workspace 6 projects, lockfile, scripts pass; không có business schema/migration |
| W1-D2-T07 G2/RTM/log | PASS | Checklist này; CR-01–CR-08 = `DESIGN_READY`; execution log cập nhật |

## G2 acceptance checklist

- [x] CR-01–CR-08 map vào view và scenario.
- [x] Country, local currency, locale và country-profile ID luôn nhìn thấy.
- [x] Campaign detail có reward, terms, eligibility, budget/slot và KYC guard.
- [x] KYC needs-changes chỉ mở field bank bị reject; accepted fields khóa và giữ history.
- [x] Content rejected có reason, version timeline và resubmit path.
- [x] Earnings giải thích source, Gross, Tax, Net và Pending/Confirmed/Available/Paid/Reversed.
- [x] Payout giải thích balance/minimum/OTP/reserve/processing/Failed/UNKNOWN/retry/reversal.
- [x] VND/PHP là số chính; USD chỉ reference.
- [x] S01 và S02 clickable, dùng shared views và không dead end.
- [x] Snapshot visual tồn tại và đã kiểm không clipping/overlap nghiêm trọng.

## Automated evidence

- `node scripts/check-workspace.mjs`: 8 Creator views, S01/S02, no business schema.
- `corepack pnpm -r check`: 6 workspace projects chạy check.
- `corepack pnpm check`: root workspace verification pass.
- Mockup server smoke: `HTTP 200`, response chứa V01 và V08.
- Snapshot: `docs/product/mockup/creator-prototype.png` (`152090` bytes tại lần review).

## Figma fallback explanation

Figma draft đã tạo thành công, Material 3 discovery cũng hoàn tất; connector mất khả dụng trước lúc ghi frame. Theo DEC-14, deliverable chuyển sang HTML để không chặn G2. Blank Figma draft không được tính evidence. Prototype HTML + PNG là evidence chính thức của Ngày 2.

## Handoff Ngày 3

- Bắt đầu `W1-D3-T01` và giữ V01–V08 ổn định trừ bug G2.
- Dựng V09–V12 Admin/Finance; hoàn tất clickable S03/S04 xuyên vai trò.
- Không tạo business schema trước Gate G4.
