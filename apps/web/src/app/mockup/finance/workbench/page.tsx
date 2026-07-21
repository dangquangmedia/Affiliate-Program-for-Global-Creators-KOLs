"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, Empty, mk } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { t, formatMoney } from "../../../../lib/i18n";
import { listBatches, getBatch, createBatch, lockBatch, type ReconBatch } from "../../../../lib/reconciliation-client";
import {
  payoutQueue,
  payoutHolds,
  settlePayout,
  resolveHold,
  type PayoutQueueItem,
  type SettleResult,
  type ResolveResult,
} from "../../../../lib/payout-client";

type Status = "loading" | "needStaff" | "ready";

export default function FinanceWorkbenchScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [batches, setBatches] = useState<ReconBatch[]>([]);
  const [selected, setSelected] = useState<ReconBatch | null>(null);
  const [payouts, setPayouts] = useState<PayoutQueueItem[]>([]);
  const [holds, setHolds] = useState<PayoutQueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { lang, market, setMarket } = usePrefs();
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await listBatches(market);
    if ("forbidden" in res) {
      setStatus("needStaff");
      setBatches([]);
      return;
    }
    setBatches(res);
    const pq = await payoutQueue(market);
    setPayouts("forbidden" in pq ? [] : pq);
    const hq = await payoutHolds(market);
    setHolds("forbidden" in hq ? [] : hq);
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
        setErr(res.code === "NOTHING_TO_RECONCILE" ? t(lang, "fin.errNothing") : res.message);
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
        setErr(t(lang, "fin.errLocked"));
        await openBatch(id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function doSettle(id: string, result: SettleResult) {
    setBusy(true);
    setErr(null);
    try {
      const res = await settlePayout(market, id, result);
      if (!res.ok && res.code === "ALREADY_SETTLED") setErr(t(lang, "fin.errSettled"));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function doResolve(id: string, result: ResolveResult) {
    setBusy(true);
    setErr(null);
    try {
      const res = await resolveHold(market, id, result);
      if (!res.ok && res.code === "NOT_ON_HOLD") setErr(t(lang, "fin.errNotHold"));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame screen="V12 Finance workbench" title={t(lang, "fin.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "fin.noteQ")}</strong> {t(lang, "fin.noteBody")} <em>{t(lang, "fin.noteHard")}</em>
      </Note>

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "fin.loading")}</p>}

      {status === "needStaff" && (
        <Card title={t(lang, "fin.needStaffTitle", { market })} sub={t(lang, "fin.needStaffSub")}>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>{t(lang, "fin.needStaffBody", { market })}</p>
          <BtnRow>
            <Btn variant="primary" onClick={loginAsFinance}>
              {t(lang, "fin.loginBtn", { market })}
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

          <Card title={t(lang, "fin.batchTitle")} sub={t(lang, "fin.batchSub")}>
            <BtnRow>
              <Btn variant="primary" disabled={busy} onClick={doCreate}>
                {busy ? "…" : t(lang, "fin.createBatch")}
              </Btn>
            </BtnRow>
            {batches.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <Empty icon="📊">{t(lang, "fin.noBatch")}</Empty>
              </div>
            ) : (
              <table className={mk.table} style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>{t(lang, "fin.colPeriod")}</th><th>{t(lang, "fin.colLines")}</th><th>{t(lang, "fin.colNet")}</th><th>{t(lang, "fin.colStatus")}</th><th></th></tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{b.period}</td>
                      <td>{b.lineCount}</td>
                      <td>{formatMoney(b.totalNetMinor, b.currency ?? MARKETS[market].currency, locale)}</td>
                      <td>{b.status === "LOCKED" ? <Badge kind="info">{t(lang, "fin.locked")}</Badge> : <Badge kind="warn">{t(lang, "fin.open")}</Badge>}</td>
                      <td><Btn onClick={() => openBatch(b.id)}>{t(lang, "fin.view")}</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {selected && (
            <Card
              title={t(lang, "fin.batchDetail", { period: selected.period, market })}
              sub={selected.status === "LOCKED" ? t(lang, "fin.batchDetailLocked") : t(lang, "fin.batchDetailOpen")}
            >
              <table className={mk.table}>
                <thead>
                  <tr><th>{t(lang, "fin.colCreator")}</th><th>{t(lang, "fin.colCampaign")}</th><th>Net</th><th>{t(lang, "fin.colNote")}</th></tr>
                </thead>
                <tbody>
                  {(selected.lines ?? []).map((l) => (
                    <tr key={l.id}>
                      <td>{l.creatorName}</td>
                      <td>{l.campaignTitle ?? "—"}</td>
                      <td>{formatMoney(l.netMinor, l.currency, locale)}</td>
                      <td>{l.anomaly ? <Badge kind="danger">{l.anomaly}</Badge> : <Badge kind="success">{t(lang, "fin.lineOk")}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12 }}>
                <KV k={t(lang, "fin.totalValid")} strong>
                  {formatMoney(selected.totalNetMinor, selected.currency ?? MARKETS[market].currency, locale)}
                </KV>
              </div>
              {selected.status === "OPEN" ? (
                <BtnRow>
                  <Btn variant="primary" disabled={busy} onClick={() => doLock(selected.id)}>
                    {busy ? "…" : t(lang, "fin.lockBatch")}
                  </Btn>
                </BtnRow>
              ) : (
                <>
                  <div style={{ marginTop: 10 }}><Badge kind="info">{t(lang, "fin.lockedNote")}</Badge></div>
                  <p style={{ fontSize: 13, color: "#a9b6c4", marginTop: 8 }}>
                    {t(lang, "fin.lockedBody1")} <b>AVAILABLE</b> {t(lang, "fin.lockedBody2")}{" "}
                    <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>{t(lang, "fin.earningsScreen")}</Link>.
                  </p>
                </>
              )}
            </Card>
          )}

          <Card title={t(lang, "fin.queueTitle", { n: payouts.length })} sub={t(lang, "fin.queueSub")}>
            {payouts.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>{t(lang, "fin.queueEmpty")}</p>
            ) : (
              <table className={mk.table}>
                <thead>
                  <tr><th>{t(lang, "fin.colCreator")}</th><th>{t(lang, "fin.colAmount")}</th><th>{t(lang, "fin.colStatus")}</th><th>{t(lang, "fin.colOutcome")}</th></tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} data-creator={p.creatorName}>
                      <td>{p.creatorName}</td>
                      <td>{formatMoney(p.amountMinor, p.currency, locale)}</td>
                      <td><Badge kind="info">{t(lang, "fin.held")}</Badge></td>
                      <td>
                        <BtnRow>
                          <Btn variant="primary" disabled={busy} onClick={() => doSettle(p.id, "SUCCESS")}>{t(lang, "fin.outSuccess")}</Btn>
                          <Btn variant="danger" disabled={busy} onClick={() => doSettle(p.id, "FAIL")}>{t(lang, "fin.outFail")}</Btn>
                          <Btn variant="ghost" disabled={busy} onClick={() => doSettle(p.id, "UNKNOWN")}>{t(lang, "fin.outUnknown")}</Btn>
                        </BtnRow>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={t(lang, "fin.holdsTitle", { n: holds.length })} sub={t(lang, "fin.holdsSub")}>
            {holds.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>{t(lang, "fin.holdsEmpty")}</p>
            ) : (
              <table className={mk.table}>
                <thead>
                  <tr><th>{t(lang, "fin.colCreator")}</th><th>{t(lang, "fin.colAmount")}</th><th>{t(lang, "fin.colStatus")}</th><th>{t(lang, "fin.colResolve")}</th></tr>
                </thead>
                <tbody>
                  {holds.map((p) => (
                    <tr key={p.id} data-creator={p.creatorName}>
                      <td>{p.creatorName}</td>
                      <td>{formatMoney(p.amountMinor, p.currency, locale)}</td>
                      <td><Badge kind="warn">{t(lang, "fin.unknownHold")}</Badge></td>
                      <td>
                        <BtnRow>
                          <Btn variant="primary" disabled={busy} onClick={() => doResolve(p.id, "SUCCESS")}>{t(lang, "fin.resolvePaid")}</Btn>
                          <Btn variant="danger" disabled={busy} onClick={() => doResolve(p.id, "FAIL")}>{t(lang, "fin.resolveFail")}</Btn>
                        </BtnRow>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </Frame>
  );
}
