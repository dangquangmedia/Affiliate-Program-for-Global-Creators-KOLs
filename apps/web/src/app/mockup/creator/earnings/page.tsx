"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Badge, KV, Empty, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { getEarnings, type EarningsDashboard, type Earning } from "../../../../lib/earnings-client";
import { formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

const STATUS_BADGE: Record<Earning["status"], { kind: "warn" | "success" | "info" | "danger"; label: string }> = {
  PENDING: { kind: "warn", label: "Chờ đối soát" },
  AVAILABLE: { kind: "success", label: "Rút được" },
  PAID: { kind: "info", label: "Đã trả" },
  REVERSED: { kind: "danger", label: "Đã đảo" },
};

// Nhãn bút toán sổ cái (N12 chỉ có 2 loại đầu; còn lại chừa cho payout N14-15).
const ENTRY_LABEL: Record<string, string> = {
  EARNING_ACCRUE: "Ghi nhận thu nhập",
  TAX: "Khấu trừ thuế",
  PAYOUT_RESERVE: "Giữ tiền rút",
  PAYOUT_PAID: "Đã chi trả",
  PAYOUT_RELEASE: "Hoàn về số dư",
  REVERSAL: "Bút toán đảo",
};

export default function EarningsScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<EarningsDashboard | null>(null);
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await getEarnings(market);
    if ("unauthorized" in res) {
      setStatus("needLogin");
      return;
    }
    setData(res);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load();
  }, [load]);

  const cur = data?.summary.currency ?? MARKETS[market].currency;

  return (
    <Frame screen="V07 Earnings" title="Thu nhập" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi kiếm được bao nhiêu, tiền đang ở trạng thái nào? →
        Mỗi khoản hiện rõ <strong>Gross – Thuế – Net</strong> và vòng đời <strong>PENDING →
        AVAILABLE → PAID</strong>. <em>Bài toán khó #2 (tiền = số nguyên minor units, Net = Gross −
        Thuế tính lại) &amp; #6: số dư là nguồn sự thật ở SỔ CÁI APPEND-ONLY bên dưới — không sửa,
        chỉ ghi thêm.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Bạn cần đăng nhập">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải…</p>}

      {status === "ready" && data && (
        <>
          <ContextBanner market={market} />

          {/* Tổng quan Gross–Thuế–Net + số dư sổ cái */}
          <Card title="Tổng quan thu nhập" sub="Số dư khả dụng để rút chỉ tính phần đã đối soát (AVAILABLE) — N13.">
            <KV k="Tổng Gross (tất cả)">{formatMoney(data.summary.totalGrossMinor, cur, locale)}</KV>
            <KV k="Tổng Thuế (demo)">− {formatMoney(data.summary.totalTaxMinor, cur, locale)}</KV>
            <KV k="Tổng Net" strong>
              {formatMoney(data.summary.totalNetMinor, cur, locale)}
            </KV>
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge kind="warn">Chờ đối soát: {formatMoney(data.summary.pendingNetMinor, cur, locale)}</Badge>
              <Badge kind="success">Rút được: {formatMoney(data.summary.availableNetMinor, cur, locale)}</Badge>
              <Badge kind="info">Đã trả: {formatMoney(data.summary.paidNetMinor, cur, locale)}</Badge>
            </div>
            <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
              Số dư sổ cái (đã trừ thuế): <b style={{ color: "#cfe0ff" }}>{formatMoney(data.ledger.balanceMinor, cur, locale)}</b>
            </p>
          </Card>

          {data.earnings.length === 0 ? (
            <Card>
              <Empty icon="💸">
                Chưa có thu nhập. Hãy{" "}
                <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
                  tham gia campaign
                </Link>{" "}
                và nộp nội dung được duyệt.
              </Empty>
            </Card>
          ) : (
            data.earnings.map((e) => (
              <Card key={e.id} title={e.campaignTitle ?? "—"} sub={`Ghi nhận ${new Date(e.createdAt).toLocaleString(locale)}`}>
                <div style={{ marginBottom: 10 }}>
                  <Badge kind={STATUS_BADGE[e.status].kind}>{STATUS_BADGE[e.status].label}</Badge>
                </div>
                <KV k="Gross (tổng)">{formatMoney(e.grossMinor, e.currency, locale)}</KV>
                <KV k="Thuế (demo)">− {formatMoney(e.taxMinor, e.currency, locale)}</KV>
                <KV k="Net (thực nhận)" strong>
                  {formatMoney(e.netMinor, e.currency, locale)}
                </KV>
              </Card>
            ))
          )}

          {/* Sổ cái append-only — bằng chứng bài toán khó #6 */}
          <Card
            title="Sổ cái (append-only)"
            sub="Mọi thay đổi tiền là 1 dòng ghi THÊM, không sửa/xoá. Sửa sai = ghi bút toán đảo có link gốc."
          >
            {data.ledger.entries.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>Chưa có bút toán nào.</p>
            ) : (
              data.ledger.entries.map((en) => {
                const neg = en.amountMinor < 0;
                return (
                  <div
                    key={en.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid #1b2430", gap: 10, flexWrap: "wrap" }}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: "#e6edf3" }}>{ENTRY_LABEL[en.entryType] ?? en.entryType}</span>
                      <span style={{ fontSize: 11, color: "#6b7684" }}> · {new Date(en.createdAt).toLocaleString(locale)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: neg ? "#ff9ba3" : "#6ee787" }}>
                        {neg ? "−" : "+"} {formatMoney(Math.abs(en.amountMinor), en.currency, locale)}
                      </span>
                      <span style={{ fontSize: 12, color: "#8b96a3", minWidth: 90, textAlign: "right" }}>
                        dư {formatMoney(en.balanceAfterMinor, en.currency, locale)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <p style={{ fontSize: 13, color: "#8b96a3" }}>
            Muốn rút tiền khả dụng? →{" "}
            <Link href="/mockup/creator/wallet" style={{ color: "#6aa6ff" }}>
              Ví &amp; rút tiền
            </Link>{" "}
            (mở khi có đối soát — N13/N14)
          </p>
        </>
      )}
    </Frame>
  );
}
