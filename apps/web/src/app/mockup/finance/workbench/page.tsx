"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, Empty, mk } from "../../../../mockup/ui";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { formatMoney } from "../../../../lib/i18n";
import { listBatches, getBatch, createBatch, lockBatch, type ReconBatch } from "../../../../lib/reconciliation-client";

type Status = "loading" | "needStaff" | "ready";

export default function FinanceWorkbenchScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [batches, setBatches] = useState<ReconBatch[]>([]);
  const [selected, setSelected] = useState<ReconBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await listBatches(market);
    if ("forbidden" in res) {
      setStatus("needStaff");
      setBatches([]);
      return;
    }
    setBatches(res);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    setStatus("loading");
    setSelected(null);
    load();
  }, [load]);

  async function loginAsFinance() {
    const email = `finance.${market.toLowerCase()}@demo.affiliate.gl`;
    saveSession(await mockLogin(email, `Finance ${market}`));
    await load();
  }

  async function openBatch(id: string) {
    setSelected(await getBatch(market, id));
  }

  async function doCreate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await createBatch(market);
      if (res.ok) {
        await load();
        setSelected(res.batch);
      } else {
        setErr(res.code === "NOTHING_TO_RECONCILE" ? "Không có thu nhập PENDING nào để đối soát." : res.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function doLock(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await lockBatch(market, id);
      if (res.ok && res.batch) {
        setSelected(res.batch);
        await load();
      } else if (res.code === "BATCH_ALREADY_LOCKED") {
        setErr("Batch đã bị khoá bởi người khác (bất biến).");
        await openBatch(id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame screen="V12 Finance workbench" title="Đối soát & chi trả (Local Finance)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> Finance chốt số &amp; mở tiền rút thế nào? → Tạo batch
        gom thu nhập <strong>PENDING</strong> → khoá (lock) để chuyển sang <strong>AVAILABLE</strong>
        (rút được). <em>Bài toán #6: batch đã khoá là BẤT BIẾN; 1 earning vào đúng 1 batch
        (UNIQUE). Payout 3 kết cục là N14.</em>
      </Note>

      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải…</p>}

      {status === "needStaff" && (
        <Card title={`Cần quyền Finance ${market}`} sub="Phiên hiện tại không có vai Local Finance của nước này.">
          <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>
            Đăng nhập bằng tài khoản Finance demo (mock SSO) để đối soát nước {market}.
          </p>
          <BtnRow>
            <Btn variant="primary" onClick={loginAsFinance}>
              Đăng nhập vai Finance {market}
            </Btn>
          </BtnRow>
        </Card>
      )}

      {status === "ready" && (
        <>
          {err && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{err}</Badge>
            </div>
          )}

          <Card title="Kỳ đối soát" sub="Gom mọi thu nhập PENDING chưa đối soát của nước này vào 1 batch mới.">
            <BtnRow>
              <Btn variant="primary" disabled={busy} onClick={doCreate}>
                {busy ? "…" : "Tạo batch đối soát"}
              </Btn>
            </BtnRow>
            {batches.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <Empty icon="📊">Chưa có batch nào. Tạo batch khi có thu nhập PENDING.</Empty>
              </div>
            ) : (
              <table className={mk.table} style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>Kỳ</th><th>Số dòng</th><th>Tổng net</th><th>Trạng thái</th><th></th></tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{b.period}</td>
                      <td>{b.lineCount}</td>
                      <td>{formatMoney(b.totalNetMinor, b.currency ?? MARKETS[market].currency, locale)}</td>
                      <td>{b.status === "LOCKED" ? <Badge kind="info">🔒 Đã khoá</Badge> : <Badge kind="warn">Đang mở</Badge>}</td>
                      <td><Btn onClick={() => openBatch(b.id)}>Xem</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {selected && (
            <Card
              title={`Batch kỳ ${selected.period} · ${market}`}
              sub={selected.status === "LOCKED" ? "Đã khoá — bất biến. Muốn sửa phải tạo điều chỉnh (bút toán đảo)." : "Kiểm tra từng dòng rồi khoá để mở tiền rút."}
            >
              <table className={mk.table}>
                <thead>
                  <tr><th>Creator</th><th>Campaign</th><th>Net</th><th>Ghi chú</th></tr>
                </thead>
                <tbody>
                  {(selected.lines ?? []).map((l) => (
                    <tr key={l.id}>
                      <td>{l.creatorName}</td>
                      <td>{l.campaignTitle ?? "—"}</td>
                      <td>{formatMoney(l.netMinor, l.currency, locale)}</td>
                      <td>{l.anomaly ? <Badge kind="danger">{l.anomaly}</Badge> : <Badge kind="success">OK</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12 }}>
                <KV k="Tổng hợp lệ (loại dòng bất thường)" strong>
                  {formatMoney(selected.totalNetMinor, selected.currency ?? MARKETS[market].currency, locale)}
                </KV>
              </div>
              {selected.status === "OPEN" ? (
                <BtnRow>
                  <Btn variant="primary" disabled={busy} onClick={() => doLock(selected.id)}>
                    {busy ? "…" : "Khoá batch (PENDING → Rút được)"}
                  </Btn>
                </BtnRow>
              ) : (
                <>
                  <div style={{ marginTop: 10 }}><Badge kind="info">🔒 LOCKED — không sửa trực tiếp</Badge></div>
                  <p style={{ fontSize: 13, color: "#a9b6c4", marginTop: 8 }}>
                    Các khoản hợp lệ đã chuyển sang <b>AVAILABLE</b> — creator thấy &quot;rút được&quot; ở{" "}
                    <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>màn Thu nhập (V07)</Link>.
                  </p>
                </>
              )}
            </Card>
          )}

          <Card title="Hàng đợi payout — N14 (mock)" sub="Rút tiền + OTP + provider 3 kết cục (paid/fail-hoàn/unknown-giữ) sẽ nối ở N14-15.">
            <p style={{ color: "#8b96a3", fontSize: 13 }}>
              Sau khi batch khoá → tiền AVAILABLE → creator tạo lệnh rút (reserve) → Finance xử lý
              kết cục provider. Phần này chưa nối dữ liệu thật.
            </p>
          </Card>
        </>
      )}
    </Frame>
  );
}
