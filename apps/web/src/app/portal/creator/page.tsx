"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shell, MarketStrip, SectionHead, Kpi, Panel, Chip, Btn, Meter, MoneySpine, Note, Empty, Icon, Modal, css as s,
  type NavItem, type Role,
} from "../ui";
import { MARKETS, formatMoney, toUsdReference, type Market, type Currency } from "../../../mockup/data";
import { readPrefMarket } from "../session";
import { loadSession } from "../../../lib/auth-client";
import { listCampaigns, myParticipations, joinCampaign, type CampaignSummary, type Participation } from "../../../lib/campaign-client";
import { submitContent } from "../../../lib/content-client";
import { getEarnings, type EarningsDashboard, type Earning } from "../../../lib/earnings-client";
import { getWallet, requestOtp, createPayout, type Wallet } from "../../../lib/payout-client";
import { getMyKyc, type KycCase } from "../../../lib/kyc-client";

const ROLE: Role = { key: "creator", name: "Lê Văn Quang", scope: "Creator · hồ sơ đa nước", color: "#6e7bff" };
const NAV: NavItem[] = [
  { key: "home", label: "Trang chủ", icon: "home" },
  { key: "discover", label: "Khám phá", icon: "compass" },
  { key: "campaigns", label: "Chiến dịch", icon: "layers" },
  { key: "earnings", label: "Thu nhập", icon: "chart" },
  { key: "wallet", label: "Ví & rút tiền", icon: "wallet" },
];

const COVERS: Record<string, string> = {
  TikTok: "linear-gradient(135deg,#25152e,#3a1f4d)",
  Instagram: "linear-gradient(135deg,#3a1720,#5a2340)",
  YouTube: "linear-gradient(135deg,#2a1414,#4a1d1d)",
};

// Mã lỗi thật từ apps/api/src/campaign/join.service.ts (đầy suất thì vào waitlist -> vẫn ok:true,
// nên không có mã "hết suất" ở đây — chỉ 3 nhánh conflict thật + fallback chung).
const JOIN_ERROR_MESSAGES: Record<string, string> = {
  KYC_REQUIRED: "Cần duyệt KYC trước khi tham gia",
  CAMPAIGN_NOT_JOINABLE: "Chiến dịch đã tạm dừng hoặc kết thúc",
  JOIN_BLOCKED_STRIKE: "Bạn đã bị chặn tham gia lại chiến dịch này (quá số lần bị thu hồi suất)",
};
function joinErrorMessage(code: string): string {
  return JOIN_ERROR_MESSAGES[code] ?? "Không tham gia được, thử lại sau.";
}

export default function CreatorDashboard() {
  const [market, setMarketState] = useState<Market>(readPrefMarket);
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const cur = MARKETS[market].currency;

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [mine, setMine] = useState<Participation[]>([]);
  const [earn, setEarn] = useState<EarningsDashboard | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [kyc, setKyc] = useState<KycCase | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loadSession()) return;
    try {
      const [c, p, e, w, k] = await Promise.all([
        listCampaigns(market), myParticipations(market), getEarnings(market), getWallet(market), getMyKyc(market),
      ]);
      if (!("unauthorized" in c)) setCampaigns(c);
      setMine(p);
      if (!("unauthorized" in e)) setEarn(e);
      if (!("unauthorized" in w)) setWallet(w);
      setKyc(k);
      setLoadErr(null);
    } catch {
      // Lỗi mạng/transport — KHÔNG để dữ liệu trống bị hiểu nhầm là "chưa có gì".
      setLoadErr("Không tải được dữ liệu, thử lại sau.");
    }
  }, [market]);

  useEffect(() => {
    void load();
  }, [load]);

  function setMarket(m: Market) {
    setMarketState(m);
    if (typeof window !== "undefined") window.localStorage.setItem("ag_pref_market", m);
  }

  const [joinErr, setJoinErr] = useState<string | null>(null);

  async function onJoin(id: string) {
    try {
      const res = await joinCampaign(market, id);
      if (!res.ok) {
        setJoinErr(joinErrorMessage(res.code));
        return;
      }
      setJoinErr(null);
      await load();
    } catch {
      setJoinErr("Không tham gia được, thử lại sau.");
    }
  }

  const [submitFor, setSubmitFor] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitCaption, setSubmitCaption] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function onSubmit(campaignId: string, url: string, caption: string) {
    setSubmitBusy(true);
    setSubmitErr(null);
    try {
      const res = await submitContent(market, campaignId, url, caption);
      if (res.ok) {
        setSubmitFor(null);
        setSubmitUrl("");
        setSubmitCaption("");
        await load();
      } else {
        setSubmitErr(res.message);
      }
    } catch {
      setSubmitErr("Không xử lý được, thử lại sau.");
    } finally {
      setSubmitBusy(false);
    }
  }

  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutErr, setPayoutErr] = useState<string | null>(null);

  // Mock OTP: requestOtp trả sẵn `.code` (server tự công bố cho demo) nên nộp lệnh rút
  // gói gọn 1 bước bấm nút — không cần form nhập tay mã OTP.
  async function onPayout(amountMinor: number) {
    setPayoutBusy(true);
    setPayoutErr(null);
    try {
      const otp = await requestOtp(market);
      if (!otp) {
        setPayoutErr("Không lấy được OTP, thử lại sau.");
        return;
      }
      const res = await createPayout(market, {
        amountMinor,
        otpId: otp.otpId,
        code: otp.code,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!res.ok) setPayoutErr(res.message);
      await load();
    } catch {
      setPayoutErr("Không xử lý được, thử lại sau.");
    } finally {
      setPayoutBusy(false);
    }
  }

  const money = useMemo(() => {
    const summary = earn?.summary;
    return {
      gross: summary?.totalGrossMinor ?? 0,
      tax: summary?.totalTaxMinor ?? 0,
      net: summary?.totalNetMinor ?? 0,
      pending: summary?.pendingNetMinor ?? 0,
      available: summary?.availableNetMinor ?? 0,
      paid: summary?.paidNetMinor ?? 0,
    };
  }, [earn]);
  const earnings = earn?.earnings ?? [];

  // NGUỒN SỰ THẬT cho "rút được": ví (đã trừ các lệnh đang giữ), KHÔNG phải tổng net AVAILABLE
  // trọn đời (số đó không trừ tiền đã rút → gây hiểu nhầm "khả dụng" khác với ví).
  const withdrawable = wallet?.withdrawableMinor ?? 0;
  // "Đã nhận" = tổng các lệnh rút đã chi trả thật (earning không tự đổi sang PAID vì payout theo số tiền).
  const paidOut = (wallet?.payouts ?? []).filter((p) => p.state === "PAID").reduce((a, p) => a + p.amountMinor, 0);

  const fm = (v: number) => formatMoney(v, cur);
  const usd = (v: number) => (showUsd ? `≈ ${toUsdReference(v, cur)} tham chiếu` : undefined);
  const kycPending = (kyc?.fields ?? []).some((f) => f.state === "NEEDS_CHANGES");
  const openTasks = mine.filter((p) => p.state === "JOINED" || p.state === "REJECTED");
  const minPayout = wallet?.minPayoutMinor ?? 0;
  const navWithBadge = useMemo<NavItem[]>(
    () => NAV.map((n) => (n.key === "campaigns" ? { ...n, badge: openTasks.length } : n)),
    [openTasks.length],
  );

  return (
    <Shell role={ROLE} market={market} setMarket={setMarket} nav={navWithBadge} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Trang chủ"}
      subtitle="Hồ sơ Creator — dữ liệu tách biệt theo từng nước"
      user={{ name: "Nguyễn Minh Anh", sub: `Creator · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={market} note="Đổi VN/PH ở góc phải để thấy dữ liệu re-scope" />

      {loadErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{loadErr}</Chip></div>}

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Trạng thái KYC" icon="shield" tone={kycPending ? "warn" : "ok"}
              value={kycPending ? "Cần bổ sung" : kyc ? "Đã duyệt" : "Chưa nộp"}
              sub={kycPending ? <><Icon name="alert" size={13} /> có mục cần sửa</> : <><Icon name="check" size={13} /> Đủ điều kiện Join</>} />
            <Kpi label="Chiến dịch cần làm" icon="layers" tone="brand" value={String(openTasks.length)} sub={<>đang chờ nộp / sửa nội dung</>} />
            <Kpi label="Thu nhập chờ đối soát" icon="clock" tone="warn" value={fm(money.pending)} usd={usd(money.pending)} />
            <Kpi label="Số dư ví (rút được)" icon="wallet" tone="ok" value={fm(withdrawable)} usd={usd(withdrawable)} />
          </div>

          <div className={`${s.grid} ${s.split}`} style={{ marginTop: 22 }}>
            <Panel title="Việc cần làm tiếp theo" sub="sắp theo độ khẩn">
              {kycPending && (
                <div className={s.taskItem} style={{ ["--tone" as string]: "var(--warn)" }}>
                  <span className={s.taskIcon}><Icon name="shield" size={18} /></span>
                  <div className={s.taskBody}><b>Sửa hồ sơ KYC bị từ chối</b><span>Có trường bị Ops yêu cầu bổ sung</span></div>
                  <Btn sm onClick={() => setActive("home")}>Sửa ngay</Btn>
                </div>
              )}
              {openTasks.length > 0 ? openTasks.map((p) => (
                <div key={p.campaignId} className={s.taskItem} style={{ ["--tone" as string]: "var(--danger)" }}>
                  <span className={s.taskIcon}><Icon name="clock" size={18} /></span>
                  <div className={s.taskBody}><b>Nộp nội dung: {p.campaignTitle ?? "—"}</b><span>Trạng thái: {p.state}</span></div>
                  <Btn sm variant="primary" onClick={() => { setActive("campaigns"); setSubmitFor(p.campaignId); }}>Nộp</Btn>
                </div>
              )) : <Empty>Chưa có chiến dịch nào cần nộp.</Empty>}
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--info)" }}>
                <span className={s.taskIcon}><Icon name="chart" size={18} /></span>
                <div className={s.taskBody}><b>{fm(withdrawable)} sẵn sàng rút</b><span>Trên mức tối thiểu {fm(minPayout)}</span></div>
                <Btn sm onClick={() => setActive("wallet")}>Rút tiền</Btn>
              </div>
            </Panel>

            <Panel title="Dòng tiền của bạn" sub={MARKETS[market].currency}>
              {money.gross > 0 ? (
                <MoneySpine segments={[
                  { label: " chờ đối soát", amount: fm(money.pending), value: money.pending, color: "var(--warn)" },
                  { label: " rút được", amount: fm(withdrawable), value: withdrawable, color: "var(--info)" },
                  { label: " đã nhận", amount: fm(paidOut), value: paidOut, color: "var(--ok)" },
                ]} />
              ) : <Empty>Chưa có thu nhập ở thị trường {market}.<br />Tham gia chiến dịch để bắt đầu.</Empty>}
            </Panel>
          </div>

          <SectionHead title="Đề xuất cho bạn" hint={`chỉ campaign ở ${MARKETS[market].name}`} more={<button className={s.more} onClick={() => setActive("discover")}>Xem tất cả →</button>} />
          {joinErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{joinErr}</Chip></div>}
          <CampaignGrid campaigns={campaigns.slice(0, 3)} mine={mine} onJoin={onJoin} onOpen={() => setActive("campaigns")} />
        </>
      )}

      {active === "discover" && (
        <>
          {joinErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{joinErr}</Chip></div>}
          <CampaignGrid campaigns={campaigns} mine={mine} onJoin={onJoin} onOpen={() => setActive("campaigns")} full />
        </>
      )}

      {active === "campaigns" && (
        <MyCampaigns
          mine={mine}
          fm={fm}
          submitFor={submitFor}
          setSubmitFor={setSubmitFor}
          submitUrl={submitUrl}
          setSubmitUrl={setSubmitUrl}
          submitCaption={submitCaption}
          setSubmitCaption={setSubmitCaption}
          submitBusy={submitBusy}
          submitErr={submitErr}
          onSubmit={onSubmit}
        />
      )}

      {active === "earnings" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Tổng Gross" icon="coins" tone="neutral" value={fm(money.gross)} usd={usd(money.gross)} />
            <Kpi label="Thuế (demo)" icon="scale" tone="warn" value={fm(money.tax)} sub={<>{market === "VN" ? "10%" : "8%"} synthetic</>} />
            <Kpi label="Net thực nhận" icon="chart" tone="ok" value={fm(money.net)} usd={usd(money.net)} sub={<>tổng đã duyệt (trọn đời)</>} />
            <Kpi label="Khả dụng để rút" icon="wallet" tone="info" value={fm(withdrawable)} sub={<>= số dư ví (đã trừ đã rút)</>} />
          </div>
          <Panel title="Sổ thu nhập" sub="Gross − Thuế = Net, luôn tính lại">
            {earnings.length ? (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Ngày</th><th>Chiến dịch</th><th className={s.amt}>Gross</th><th className={s.amt}>Thuế</th><th className={s.amt}>Net</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {earnings.map((e) => (
                      <tr key={e.id}>
                        <td className={s.num}>{e.createdAt}</td>
                        <td>{e.campaignTitle ?? "—"}</td>
                        <td className={s.amt}>{fm(e.grossMinor)}</td>
                        <td className={s.amt} style={{ color: "var(--warn)" }}>−{fm(e.taxMinor)}</td>
                        <td className={s.amt}>{fm(e.netMinor)}</td>
                        <td><EarnChip status={e.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>Chưa có thu nhập ở {MARKETS[market].name}.</Empty>}
          </Panel>
          <div style={{ marginTop: 16 }}>
            <Note>PENDING chờ Finance đối soát → AVAILABLE có thể rút → kết quả chi trả cuối cùng nằm ở Ví. Số tiền trong Ví là nguồn sự thật của payout.</Note>
          </div>
        </>
      )}

      {active === "wallet" && (
        <WalletPanel
          market={market} fm={fm} wallet={wallet}
          busy={payoutBusy} err={payoutErr}
          onPayout={(amt) => void onPayout(amt)}
        />
      )}
    </Shell>
  );
}

function EarnChip({ status }: { status: Earning["status"] }) {
  const map = { PENDING: ["warn", "clock", "Chờ đối soát"], AVAILABLE: ["info", "check", "Khả dụng"], PAID: ["ok", "check", "Đã chi trả"], REVERSED: ["danger", "refresh", "Đảo bút toán"] } as const;
  const [tone, icon, label] = map[status];
  return <Chip tone={tone} icon={icon}>{label}</Chip>;
}

function CampaignGrid({ campaigns, mine, onJoin, onOpen, full }: {
  campaigns: CampaignSummary[]; mine: Participation[]; onJoin: (id: string) => void; onOpen: () => void; full?: boolean;
}) {
  const shown = full ? campaigns : campaigns.slice(0, 3);
  const joinedIds = new Set(mine.map((p) => p.campaignId));
  if (shown.length === 0) return <Empty>Chưa có chiến dịch nào ở thị trường này.</Empty>;
  return (
    <div className={`${s.grid} ${s.g3}`}>
      {shown.map((c) => {
        const joined = joinedIds.has(c.id);
        const init = c.brand.split(" ").map((w) => w[0]).slice(0, 2).join("");
        return (
          <div key={c.id} className={s.campCard} data-testid="creator-campaign">
            <div className={s.campCover} style={{ background: COVERS[c.platform] ?? "linear-gradient(135deg,#1a2338,#243049)" }}>
              <span className={s.init}>{init}</span>
              {c.status === "PAUSED" ? <Chip tone="warn" icon="clock">Tạm dừng</Chip> : c.full ? <Chip tone="danger" icon="ban">Đầy suất</Chip> : <Chip tone="ok" icon="check">Còn suất</Chip>}
            </div>
            <div className={s.campBody}>
              <div><div className={s.campTitle}>{c.title}</div><div className={s.campBrand}>{c.brand} · {c.platform}</div></div>
              <div className={s.campReward}>{formatMoney(c.rewardMinor, c.currency as Currency)} <small>/ nội dung được duyệt</small></div>
              <Meter taken={c.slotsTaken} total={c.slotsTotal} />
              <div className={s.campMeta}><span>{c.slotsLeft}/{c.slotsTotal} suất còn lại</span><span>{c.requiredHashtag}</span></div>
              {joined ? (
                <Btn sm block onClick={onOpen}>Đã tham gia · Xem</Btn>
              ) : (
                <Btn sm block variant={c.full || c.status !== "ACTIVE" ? "default" : "primary"} disabled={c.status !== "ACTIVE"}
                  onClick={() => void onJoin(c.id)}>
                  {c.status !== "ACTIVE" ? "Không thể tham gia" : c.full ? "Vào danh sách chờ" : "Join chiến dịch"}
                </Btn>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyCampaigns({
  mine, fm, submitFor, setSubmitFor, submitUrl, setSubmitUrl, submitCaption, setSubmitCaption, submitBusy, submitErr, onSubmit,
}: {
  mine: Participation[];
  fm: (v: number) => string;
  submitFor: string | null;
  setSubmitFor: (id: string | null) => void;
  submitUrl: string;
  setSubmitUrl: (v: string) => void;
  submitCaption: string;
  setSubmitCaption: (v: string) => void;
  submitBusy: boolean;
  submitErr: string | null;
  onSubmit: (campaignId: string, url: string, caption: string) => void;
}) {
  const submitTitle = mine.find((p) => p.campaignId === submitFor)?.campaignTitle ?? null;
  return (
    <>
    <Panel title="Chiến dịch của tôi" sub="trạng thái tham gia + nội dung">
      {mine.length === 0 ? (
        <Empty>Chưa tham gia chiến dịch nào ở thị trường này.</Empty>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Chiến dịch</th><th className={s.amt}>Thưởng</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {mine.map((p) => (
                <tr key={p.campaignId}>
                  <td><b style={{ fontWeight: 600 }}>{p.campaignTitle ?? "—"}</b></td>
                  <td className={s.amt}>{p.snapshotRewardMinor != null ? fm(p.snapshotRewardMinor) : "—"}</td>
                  <td><Chip tone={stateTone(p.state)}>{p.state}</Chip></td>
                  <td style={{ textAlign: "right" }}>
                    {(p.state === "JOINED" || p.state === "REJECTED") && (
                      <Btn sm variant="primary" onClick={() => setSubmitFor(p.campaignId)}>Nộp nội dung</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </Panel>

      {submitFor && (
        <Modal title="Nộp nội dung" sub={submitTitle ? `Chiến dịch: ${submitTitle}` : undefined} onClose={() => setSubmitFor(null)}>
          {submitErr && <div style={{ marginBottom: 10 }}><Chip tone="danger">{submitErr}</Chip></div>}
          <div className={s.field}>
            <label>URL nội dung</label>
            <input className={s.input} value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className={s.field}>
            <label>Caption</label>
            <input className={s.input} value={submitCaption} onChange={(e) => setSubmitCaption(e.target.value)} placeholder="Nội dung caption kèm hashtag" />
          </div>
          <div className={s.btnRow}>
            <Btn variant="primary" disabled={submitBusy || !submitUrl.trim()} testId="creator-submit-content"
              onClick={() => void onSubmit(submitFor, submitUrl, submitCaption)}>
              {submitBusy ? "Đang nộp…" : "Nộp nội dung"}
            </Btn>
            <Btn variant="ghost" disabled={submitBusy} onClick={() => setSubmitFor(null)}>Huỷ</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function stateTone(state: string): "danger" | "info" | "ok" | "warn" | "neutral" {
  if (state === "APPROVED") return "ok";
  if (state === "REJECTED") return "danger";
  if (state === "CONTENT_SUBMITTED") return "info";
  if (state === "JOINED") return "warn";
  return "neutral";
}

function WalletPanel({
  market, fm, wallet, busy, err, onPayout,
}: {
  market: Market;
  fm: (v: number) => string;
  wallet: Wallet | null;
  busy: boolean;
  err: string | null;
  onPayout: (amountMinor: number) => void;
}) {
  const available = wallet?.withdrawableMinor ?? 0;
  const min = wallet?.minPayoutMinor ?? 0;
  const exp = MARKETS[market].exponent;
  const majorStr = (minor: number) => String(minor / 10 ** exp);

  // Ô nhập số tiền — mặc định = toàn bộ khả dụng; reset khi số dư đổi (VD sau khi rút xong / đổi nước).
  const [amountStr, setAmountStr] = useState(() => majorStr(available));
  useEffect(() => { setAmountStr(majorStr(available)); }, [available, exp]);

  const parsed = Number(amountStr.replace(/[\s,]/g, ""));
  const amountMinor = Number.isFinite(parsed) ? Math.round(parsed * 10 ** exp) : NaN;
  const hasBalance = available >= min && available > 0;
  const validAmount = Number.isFinite(amountMinor) && amountMinor > 0;
  const belowMin = validAmount && amountMinor < min;
  const overBal = validAmount && amountMinor > available;
  const canWithdraw = hasBalance && validAmount && !belowMin && !overBal && !busy;

  const history = wallet?.payouts ?? [];
  return (
    <div className={`${s.grid} ${s.split}`}>
      <div className={s.grid} style={{ gap: 16 }}>
        <Panel title="Số dư ví" sub={MARKETS[market].name}>
          <div className={`${s.kv} ${s.kvBig}`}><span className={s.k}><Icon name="wallet" size={15} /> Khả dụng để rút</span><span className={s.v}>{fm(available)}</span></div>
          <div className={s.kv}><span className={s.k}>Mức rút tối thiểu</span><span className={s.v}>{fm(min)}</span></div>
          {err && <div style={{ marginTop: 10 }}><Chip tone="danger">{err}</Chip></div>}
          {hasBalance && (
            <div className={s.field} style={{ marginTop: 14 }}>
              <label>Số tiền muốn rút (trong phạm vi khả dụng)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className={s.input} inputMode="decimal" value={amountStr} disabled={busy}
                  onChange={(e) => setAmountStr(e.target.value)} data-testid="creator-payout-amount" placeholder={majorStr(available)} />
                <Btn sm disabled={busy} onClick={() => setAmountStr(majorStr(available))}>Toàn bộ</Btn>
              </div>
              {belowMin && <div className={s.fieldHint}>Dưới mức tối thiểu {fm(min)}.</div>}
              {overBal && <div className={s.fieldHint}>Vượt số dư khả dụng {fm(available)}.</div>}
              {!validAmount && amountStr.trim() !== "" && <div className={s.fieldHint}>Nhập số hợp lệ.</div>}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Btn block variant="primary" disabled={!canWithdraw} testId="creator-request-payout"
              onClick={() => onPayout(amountMinor)}>
              <Icon name="lock" size={16} /> {busy ? "Đang xử lý…" : hasBalance ? `Yêu cầu rút ${validAmount ? fm(amountMinor) : ""} (OTP)` : "Yêu cầu rút tiền (OTP)"}
            </Btn>
            {!hasBalance && <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 8, textAlign: "center" }}>Số dư dưới mức tối thiểu — chưa thể rút.</div>}
          </div>
        </Panel>
        <Note>OTP demo được server tự công bố kèm phản hồi nên bấm 1 lần là rút xong. Khi rút, tiền được <b>reserve</b> khỏi số dư ngay. Nếu provider báo <b>FAIL</b> → hoàn về ví đúng 1 lần. Nếu <b>UNKNOWN</b> → giữ tiền chờ Finance xác minh, không tự hoàn.</Note>
      </div>

      <div data-testid="creator-payout-history">
        <Panel title="Lịch sử rút tiền" sub="nguồn sự thật của payout">
          {history.length ? history.map((p) => (
            <div key={p.id} className={s.kv}>
              <span className={s.k}><span className={s.num}>{new Date(p.requestedAt).toLocaleString(MARKETS[market].locale)}</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={s.num} style={{ fontWeight: 650 }}>{fm(p.amountMinor)}</span>
                <PayoutChip state={p.state} />
              </span>
            </div>
          )) : <Empty>Chưa có yêu cầu rút nào ở {market}.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

const PAYOUT_MAP = {
  PAID: ["ok", "check", "Đã chi trả"],
  PROCESSING: ["info", "clock", "Đang xử lý"],
  FAILED_RELEASED: ["warn", "refresh", "Hoàn balance"],
  UNKNOWN_HOLD: ["hold", "hold", "Giữ chờ xác minh"],
} as const;
function PayoutChip({ state }: { state: string }) {
  const v = PAYOUT_MAP[state as keyof typeof PAYOUT_MAP] ?? (["info", "clock", state] as const);
  return <Chip tone={v[0]} icon={v[1]}>{v[2]}</Chip>;
}
