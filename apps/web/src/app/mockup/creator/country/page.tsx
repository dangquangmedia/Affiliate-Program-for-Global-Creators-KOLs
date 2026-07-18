"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, ContextBanner } from "../../../../mockup/ui";

type View = "choose" | "creating" | "hasProfiles";

export default function CountryScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("choose");

  return (
    <Frame screen="V02 Country" title="Chọn quốc gia" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> 1 tài khoản toàn cầu nhưng hồ sơ (KYC, ngân hàng,
        thuế, thu nhập) phải RIÊNG từng nước vì luật mỗi nước khác nhau. → Creator chọn/ tạo hồ
        sơ theo nước, và có thể chuyển qua lại. <em>Bài toán khó #1: dữ liệu 2 nước không được
        trộn — chuyển nước là chuyển ngữ cảnh, không copy dữ liệu.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "choose", label: "Chưa có hồ sơ" },
          { key: "creating", label: "Đang tạo" },
          { key: "hasProfiles", label: "Đã có hồ sơ" },
        ]}
      />

      {view === "hasProfiles" ? (
        <>
          <ContextBanner market={market} />
          <Card title="Hồ sơ của bạn" sub="Mỗi nước một hồ sơ độc lập.">
            <div className={undefined}>
              {(Object.keys(MARKETS) as Market[]).map((m) => (
                <div
                  key={m}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #182029",
                  }}
                >
                  <span>
                    {MARKETS[m].flag} {MARKETS[m].name} · {MARKETS[m].currency}
                  </span>
                  {m === market ? (
                    <Badge kind="success">Đang dùng</Badge>
                  ) : (
                    <Btn onClick={() => setMarket(m)}>Chuyển sang</Btn>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <p style={{ fontSize: 13, color: "#8b96a3" }}>
            Tiếp tục →{" "}
            <Link href="/mockup/creator/kyc" style={{ color: "#6aa6ff" }}>
              KYC nước {market}
            </Link>
          </p>
        </>
      ) : (
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <Card key={m} title={`${MARKETS[m].flag} ${MARKETS[m].name}`} sub={`Ngôn ngữ ${MARKETS[m].locale} · ${MARKETS[m].currency}`}>
              {view === "creating" && m === market ? (
                <Badge kind="info">Đang tạo hồ sơ…</Badge>
              ) : (
                <BtnRow>
                  <Btn
                    variant="primary"
                    onClick={() => {
                      setMarket(m);
                      setView("creating");
                    }}
                  >
                    Tạo hồ sơ {m}
                  </Btn>
                </BtnRow>
              )}
            </Card>
          ))}
        </div>
      )}
    </Frame>
  );
}
