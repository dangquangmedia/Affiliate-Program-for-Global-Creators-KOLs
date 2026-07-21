"use client";

import { useMemo, useState } from "react";
import {
  Shell, MarketStrip, SectionHead, Kpi, Panel, Chip, Btn, Meter, MoneySpine, Note, Empty, Icon, css as s,
  type NavItem, type Role,
} from "../ui";
import {
  MARKETS, type Market, campaignsFor, slotsLabel, formatMoney, toUsdReference,
  EARNINGS, netMinor, KYC_FIELDS, PAYOUT_HISTORY, PAYOUT_MIN_MINOR, type Earning,
} from "../../../mockup/data";

const ROLE: Role = { key: "creator", name: "Minh Anh", scope: "Creator · hồ sơ đa nước", color: "#6e7bff" };
const NAV: NavItem[] = [
  { key: "home", label: "Trang chủ", icon: "home" },
  { key: "discover", label: "Khám phá", icon: "compass" },
  { key: "campaigns", label: "Chiến dịch", icon: "layers", badge: 2 },
  { key: "earnings", label: "Thu nhập", icon: "chart" },
  { key: "wallet", label: "Ví & rút tiền", icon: "wallet" },
];

const COVERS: Record<string, string> = {
  TikTok: "linear-gradient(135deg,#25152e,#3a1f4d)",
  Instagram: "linear-gradient(135deg,#3a1720,#5a2340)",
  YouTube: "linear-gradient(135deg,#2a1414,#4a1d1d)",
};

export default function CreatorDashboard() {
  const [market, setMarket] = useState<Market>("VN");
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const cur = MARKETS[market].currency;

  const campaigns = useMemo(() => campaignsFor(market), [market]);
  const earnings = useMemo(() => EARNINGS.filter((e) => e.currency === cur), [cur]);
  const money = useMemo(() => {
    const by = (st: Earning["status"]) => earnings.filter((e) => e.status === st).reduce((a, e) => a + netMinor(e), 0);
    const gross = earnings.reduce((a, e) => a + e.grossMinor, 0);
    const tax = earnings.reduce((a, e) => a + e.taxMinor, 0);
    return { gross, tax, net: gross - tax, pending: by("PENDING"), available: by("AVAILABLE"), paid: by("PAID") };
  }, [earnings]);

  const fm = (v: number) => formatMoney(v, cur);
  const usd = (v: number) => (showUsd ? `≈ ${toUsdReference(v, cur)} tham chiếu` : undefined);
  const kycPending = KYC_FIELDS.some((f) => f.state === "NEEDS_CHANGES");

  return (
    <Shell role={ROLE} market={market} setMarket={setMarket} nav={NAV} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Trang chủ"}
      subtitle="Hồ sơ Creator — dữ liệu tách biệt theo từng nước"
      user={{ name: "Nguyễn Minh Anh", sub: `Creator · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={market} note="Đổi VN/PH ở góc phải để thấy dữ liệu re-scope" />

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Trạng thái KYC" icon="shield" tone={kycPending ? "warn" : "ok"}
              value={kycPending ? "Cần bổ sung" : "Đã duyệt"} sub={kycPending ? <><Icon name="alert" size={13} /> 1 mục cần sửa</> : <><Icon name="check" size={13} /> Đủ điều kiện Join</>} />
            <Kpi label="Chiến dịch cần làm" icon="layers" tone="brand" value="2" sub={<>1 deadline trong 48h</>} />
            <Kpi label="Thu nhập chờ đối soát" icon="clock" tone="warn" value={fm(money.pending)} usd={usd(money.pending)} />
            <Kpi label="Số dư khả dụng" icon="wallet" tone="ok" value={fm(money.available)} usd={usd(money.available)} />
          </div>

          <div className={`${s.grid} ${s.split}`} style={{ marginTop: 22 }}>
            <Panel title="Việc cần làm tiếp theo" sub="sắp theo độ khẩn">
              {kycPending && (
                <div className={s.taskItem} style={{ ["--tone" as string]: "var(--warn)" }}>
                  <span className={s.taskIcon}><Icon name="shield" size={18} /></span>
                  <div className={s.taskBody}><b>Sửa hồ sơ KYC bị từ chối</b><span>Tài khoản ngân hàng — tên không khớp giấy tờ</span></div>
                  <Btn sm onClick={() => setActive("home")}>Sửa ngay</Btn>
                </div>
              )}
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--danger)" }}>
                <span className={s.taskIcon}><Icon name="clock" size={18} /></span>
                <div className={s.taskBody}><b>Nộp nội dung: {campaigns[0]?.title ?? "—"}</b><span>Hạn nộp đầu tiên còn 12 giờ · SLA 48h</span></div>
                <Btn sm variant="primary" onClick={() => setActive("campaigns")}>Nộp</Btn>
              </div>
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--info)" }}>
                <span className={s.taskIcon}><Icon name="chart" size={18} /></span>
                <div className={s.taskBody}><b>{fm(money.available)} sẵn sàng rút</b><span>Trên mức tối thiểu {fm(PAYOUT_MIN_MINOR[cur])}</span></div>
                <Btn sm onClick={() => setActive("wallet")}>Rút tiền</Btn>
              </div>
            </Panel>

            <Panel title="Dòng tiền của bạn" sub={MARKETS[market].currency}>
              {money.gross > 0 ? (
                <MoneySpine segments={[
                  { label: " chờ đối soát", amount: fm(money.pending), value: money.pending, color: "var(--warn)" },
                  { label: " khả dụng", amount: fm(money.available), value: money.available, color: "var(--info)" },
                  { label: " đã nhận", amount: fm(money.paid), value: money.paid, color: "var(--ok)" },
                ]} />
              ) : <Empty>Chưa có thu nhập ở thị trường {market}.<br />Tham gia chiến dịch để bắt đầu.</Empty>}
            </Panel>
          </div>

          <SectionHead title="Đề xuất cho bạn" hint={`chỉ campaign ở ${MARKETS[market].name}`} more={<button className={s.more} onClick={() => setActive("discover")}>Xem tất cả →</button>} />
          <CampaignGrid market={market} onOpen={() => setActive("campaigns")} />
        </>
      )}

      {active === "discover" && (
        <>
          <div className={s.btnRow} style={{ marginBottom: 16 }}>
            {["Tất cả nền tảng", "TikTok", "YouTube", "Còn suất", "Thưởng cao"].map((f, i) => (
              <button key={f} className={`${s.pillBtn} ${i === 0 ? s.pillBtnOn : ""}`}>{f}</button>
            ))}
          </div>
          <CampaignGrid market={market} onOpen={() => setActive("campaigns")} full />
        </>
      )}

      {active === "campaigns" && <MyCampaigns market={market} fm={fm} />}

      {active === "earnings" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Tổng Gross" icon="coins" tone="neutral" value={fm(money.gross)} usd={usd(money.gross)} />
            <Kpi label="Thuế (demo)" icon="scale" tone="warn" value={fm(money.tax)} sub={<>{market === "VN" ? "10%" : "8%"} synthetic</>} />
            <Kpi label="Net thực nhận" icon="chart" tone="ok" value={fm(money.net)} usd={usd(money.net)} />
            <Kpi label="Khả dụng để rút" icon="wallet" tone="info" value={fm(money.available)} />
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
                        <td>{e.campaignTitle}</td>
                        <td className={s.amt}>{fm(e.grossMinor)}</td>
                        <td className={s.amt} style={{ color: "var(--warn)" }}>−{fm(e.taxMinor)}</td>
                        <td className={s.amt}>{fm(netMinor(e))}</td>
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

      {active === "wallet" && <Wallet market={market} fm={fm} available={money.available} />}
    </Shell>
  );
}

function EarnChip({ status }: { status: Earning["status"] }) {
  const map = { PENDING: ["warn", "clock", "Chờ đối soát"], AVAILABLE: ["info", "check", "Khả dụng"], PAID: ["ok", "check", "Đã chi trả"], REVERSED: ["danger", "refresh", "Đảo bút toán"] } as const;
  const [tone, icon, label] = map[status];
  return <Chip tone={tone} icon={icon}>{label}</Chip>;
}

function CampaignGrid({ market, onOpen, full }: { market: Market; onOpen: () => void; full?: boolean }) {
  const list = campaignsFor(market);
  const shown = full ? list : list.slice(0, 3);
  return (
    <div className={`${s.grid} ${s.g3}`}>
      {shown.map((c) => {
        const sl = slotsLabel(c);
        const init = c.brand.split(" ").map((w) => w[0]).slice(0, 2).join("");
        return (
          <div key={c.id} className={s.campCard}>
            <div className={s.campCover} style={{ background: COVERS[c.platform] ?? "linear-gradient(135deg,#1a2338,#243049)" }}>
              <span className={s.init}>{init}</span>
              {c.status === "PAUSED" ? <Chip tone="warn" icon="clock">Tạm dừng</Chip> : sl.full ? <Chip tone="danger" icon="ban">Đầy suất</Chip> : <Chip tone="ok" icon="check">Còn suất</Chip>}
            </div>
            <div className={s.campBody}>
              <div><div className={s.campTitle}>{c.title}</div><div className={s.campBrand}>{c.brand} · {c.platform}</div></div>
              <div className={s.campReward}>{formatMoney(c.rewardMinor, c.currency)} <small>/ nội dung được duyệt</small></div>
              <Meter taken={c.slotsTaken} total={c.slotsTotal} />
              <div className={s.campMeta}><span>{sl.text}</span><span>{c.requiredHashtag}</span></div>
              <Btn sm block variant={sl.full ? "default" : "primary"} onClick={onOpen}>{sl.full ? "Vào danh sách chờ" : "Xem chi tiết & Join"}</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MyCampaigns({ market, fm }: { market: Market; fm: (v: number) => string }) {
  const list = campaignsFor(market);
  const rows = [
    { c: list[0], state: ["danger", "clock", "Cần nộp · 12h"] as const },
    { c: list[1] ?? list[0], state: ["info", "eye", "Đang duyệt"] as const },
    { c: list[2] ?? list[0], state: ["ok", "check", "Đã duyệt"] as const },
  ];
  return (
    <Panel title="Chiến dịch của tôi" sub="trạng thái tham gia + nội dung">
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Chiến dịch</th><th>Nền tảng</th><th className={s.amt}>Thưởng</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rows.map(({ c, state }, i) => c && (
              <tr key={i}>
                <td><b style={{ fontWeight: 600 }}>{c.title}</b><div className={s.campBrand}>{c.brand}</div></td>
                <td>{c.platform}</td>
                <td className={s.amt}>{fm(c.rewardMinor)}</td>
                <td><Chip tone={state[0]} icon={state[1]}>{state[2]}</Chip></td>
                <td style={{ textAlign: "right" }}><Btn sm variant={i === 0 ? "primary" : "default"}>{i === 0 ? "Nộp nội dung" : "Xem"}</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Wallet({ market, fm, available }: { market: Market; fm: (v: number) => string; available: number }) {
  const cur = MARKETS[market].currency;
  const min = PAYOUT_MIN_MINOR[cur];
  const canWithdraw = available >= min;
  const history = PAYOUT_HISTORY.filter((p) => p.currency === cur);
  return (
    <div className={`${s.grid} ${s.split}`}>
      <div className={s.grid} style={{ gap: 16 }}>
        <Panel title="Số dư ví" sub={MARKETS[market].name}>
          <div className={`${s.kv} ${s.kvBig}`}><span className={s.k}><Icon name="wallet" size={15} /> Khả dụng để rút</span><span className={s.v}>{fm(available)}</span></div>
          <div className={s.kv}><span className={s.k}>Mức rút tối thiểu</span><span className={s.v}>{fm(min)}</span></div>
          <div className={s.kv}><span className={s.k}>Tài khoản nhận</span><span className={s.v}>Vietcombank ···4455</span></div>
          <div style={{ marginTop: 14 }}>
            <Btn block variant="primary" disabled={!canWithdraw}><Icon name="lock" size={16} /> Yêu cầu rút tiền (OTP)</Btn>
            {!canWithdraw && <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 8, textAlign: "center" }}>Số dư dưới mức tối thiểu — chưa thể rút.</div>}
          </div>
        </Panel>
        <Note>Khi rút, tiền được <b>reserve</b> khỏi số dư ngay. Nếu provider báo <b>FAIL</b> → hoàn về ví đúng 1 lần. Nếu <b>UNKNOWN</b> → giữ tiền chờ Finance xác minh, không tự hoàn.</Note>
      </div>

      <Panel title="Lịch sử rút tiền" sub="nguồn sự thật của payout">
        {history.length ? history.map((p) => (
          <div key={p.id} className={s.kv}>
            <span className={s.k}><span className={s.num}>{p.requestedAt}</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={s.num} style={{ fontWeight: 650 }}>{fm(p.amountMinor)}</span>
              <PayoutChip state={p.state} />
            </span>
          </div>
        )) : <Empty>Chưa có yêu cầu rút nào ở {market}.</Empty>}
      </Panel>
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
