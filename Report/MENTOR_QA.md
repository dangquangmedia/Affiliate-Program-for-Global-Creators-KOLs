# Bộ câu hỏi & trả lời — Buổi review với Mentor

> Giả lập buổi hỏi đáp sau khi trình bày prototype **Affiliate GLOBAL** (đã làm N1–N10b:
> toàn bộ Tuần A + Tuần B). Mỗi câu: **em đóng vai mentor đặt câu hỏi** → **câu trả lời ngắn
> gọn nhưng đủ ý**, có trỏ tới chỗ chứng minh trong code khi cần.
>
> Quy ước đọc: 🟢 = đã làm chạy thật · 🟡 = đã thiết kế/model, chưa code runtime (Tuần C–D).
> Mã bài toán khó tham chiếu slide 9 của bản trình chiếu.
>
> **Phân vai tài liệu** (tránh trùng lặp): file này = Q&A **sản phẩm / nghiệp vụ / tổng quát**;
> các **bài toán khó kỹ thuật kèm file:dòng code chứng minh** ở `docs/HARD_PROBLEMS.md`; **đặc tả
> 18 bảng** ở `docs/DATA_MODEL.md`; **tư duy & lý do quyết định (WHY)** ở `docs/PRODUCT.md`. Câu
> nào trùng nội dung với 3 file kia thì ở đây chỉ giữ **bản ngắn + trỏ sang "nhà" của nó**.

---

## Nhóm 0 — Năm điểm cấn cốt lõi: 3 giải pháp, vì sao chọn giải pháp 1

> Đây là 5 quyết định sản phẩm "cấn" nhất — chỗ nếu chọn sai thì hỏng cả mô hình.
> Mỗi điểm trình bày **3 giải pháp khả dĩ**, giải pháp đã chọn đứng đầu (✅), kèm **lý do
> loại trừ** 2 giải pháp còn lại. Cách chốt quyết định này (liệt kê ≥3 rồi loại có lý do)
> chính là "tư duy sản phẩm" của cả dự án — không chốt cái gì mà không bác được phương án thay thế.

### Điểm cấn 1 — Tính tiền cho creator: theo content hay theo view? (QĐ-1)

| # | Giải pháp | Đánh giá |
|---|---|---|
| **✅ 1** | **Trả theo content ĐƯỢC DUYỆT, giá FLAT cố định** (reward rule tách 3 trục: trigger / pricing / cap) | **CHỌN** |
| 2 | Trả tuyến tính theo view (pay-per-view, 50đ/view…) | Loại (làm vỡ ngân sách) |
| 3 | CPS — trả theo đơn hàng/doanh thu thực | Loại Phase 1 (mock nặng) |

**Vì sao chọn 1:** toàn bộ vòng đời "nộp → duyệt → ghi thu nhập → rút" nằm TRONG hệ thống, khép
kín đầu-cuối; ngân sách kiểm soát tuyệt đối = `suất × đơn giá` (biết trần chi từ lúc tạo campaign);
ăn trọn tiêu chí chấm luồng E2E (0.4đ).
**Vì sao không 2:** ngân sách nhãn hàng là **cố định**, còn view là **hệ số nhân không trần** — 30
suất × 500k = 15tr cố định, nhưng trả 50đ/view thì 1 video 10M view = 500tr → **vỡ 33 lần**. *View
không có tội — hệ-số-nhân-không-trần mới có tội.* Nên view chỉ được làm **cổng điều kiện** (trục ①:
đạt X view → nhận flat), không được làm **giá** (trục ②).
**Vì sao không 3:** CPS là affiliate "thật" nhất (gắn doanh thu) nhưng cần tracking click +
attribution + chống gian lận + đối soát với sàn TMĐT — **mock rất nặng, không khép kín, dễ vỡ tiến
độ 4 tuần**.
**Điểm tinh tế:** cả GP2 và GP3 **không bị vứt bỏ** — em **model-hoá chừa đường** bằng vài cột
config (`trigger_type`, `pricing_type`, `view_threshold?`, `percent_bps?`), chi phí gần bằng 0.
Bật view-gate hay CPS về sau = đổi config, **không viết lại kiến trúc**.

### Điểm cấn 2 — Điều kiện được join của creator (QĐ-6)

Mặc định creator xem + join thẳng mọi campaign; riêng campaign đặc thù thì **xét duyệt**.

| # | Giải pháp | Đánh giá |
|---|---|---|
| **✅ 1** | **Mở mặc định + cờ `requires_approval` → Apply → Ops duyệt** (mô hình AccessTrade: advertiser duyệt publisher), xét trên **tự-khai social + lịch sử nội sinh** | **CHỌN** |
| 2 | Hard-gate tự động theo follower/chuyên môn (đọc API social thật) | Loại (dữ liệu ngoài tầm) |
| 3 | Thả nổi — ai cũng join, lọc bằng cách reject content | Loại (đẩy chi phí về sau) |

**Vì sao chọn 1:** điểm cấn thật nằm ở **nguồn dữ liệu** — follower/chuyên môn là dữ liệu NGOÀI hệ
thống. Apply→duyệt là điểm cân bằng: campaign mở giữ join thẳng (không bắt mọi người qua cổng),
campaign đặc thù thì Ops phân xử dựa 2 nguồn — hồ sơ tự khai (gắn nhãn "chưa xác minh") + **lịch sử
nội sinh** (số campaign hoàn thành, tỉ lệ duyệt, strike) là bộ lọc **không giả được**.
**Vì sao không 2:** *đừng xây cổng cứng trên dữ liệu mình không kiểm soát.* API social thật Phase 1
không kịp (app review hàng tuần); còn tự-khai thì screenshot vẫn giả được → hard-gate trên số giả =
vô nghĩa, lại chặn nhầm người thật.
**Vì sao không 3:** thả nổi → content kém tràn vào → Ops reject hàng loạt → **tốn suất** (mỗi suất
có ngân sách + thời gian đứng sau, QĐ-3/4) + **brand mất niềm tin**. Chi phí không biến mất, chỉ dời
xuống khâu đắt hơn.
**Cơ chế tự triệt tiêu gian lận:** khai láo → vào campaign → content kém → reject → strike/tier tụt
→ tự đào thải. Lịch sử nội sinh là bộ lọc sự thật cuối cùng.

### Điểm cấn 3 — 🟢 Tranh suất cuối cùng (concurrency) (QĐ-5, bài toán khó #3)

≥2 creator cùng bấm Join suất cuối. Làm ngây thơ (đọc `slotsLeft` → ghi) → cả hai thấy "còn 1" →
**oversell**.

| # | Giải pháp | Đánh giá |
|---|---|---|
| **✅ 1** | **Pessimistic lock — `SELECT campaign … FOR UPDATE`** trong 1 transaction + `UNIQUE(profile,campaign)` + waitlist FCFS | **CHỌN** |
| 2 | Optimistic lock (cột `version` + retry khi đụng) | Loại (tranh chấp cao) |
| 3 | Atomic conditional update (`UPDATE … WHERE slots_taken < slots_total`) | Loại (không gói được nhiều bước) |

**Vì sao chọn 1:** trong khóa hàng campaign, việc join còn phải làm **nhiều bước liên đới** — kiểm
KYC Approved, kiểm strike (QĐ-4), ghi snapshot điều khoản, đôn waitlist khi có suất trả về. Gom tất
cả vào **một vùng serial-hóa** dễ suy luận đúng hơn hẳn một chuỗi thao tác rời. Người thứ 2 xếp hàng
chờ khóa, vào đọc lại = 0 → từ chối/`WAITLISTED`. **Không bao giờ oversell dù 100 người bấm cùng
lúc** — có test RACE tự động (`Promise.all` 3 request → đúng 1 JOINED, 2 WAITLISTED).
**Vì sao không 2:** optimistic chỉ hợp khi **tranh chấp thấp**. Nhưng "suất cuối cùng" đúng là ca
tranh chấp **cao nhất** → retry storm (ai cũng đụng version, thử lại liên tục), vừa chậm vừa khó suy
luận công bằng FCFS.
**Vì sao không 3:** conditional update chỉ **tăng được một số đếm** — không bọc nổi chuỗi bước phức
tạp ở trên trong cùng một ranh giới nhất quán. Đúng cho bài toán chỉ-đếm, không đúng cho bài toán
nhiều-hệ-quả.
**Vì sao không Redis/Kafka:** thêm queue = thêm nghĩa vụ đảm bảo exactly-once **giữa queue ↔ DB**
(bài toán khó hơn cái đang giải). FOR UPDATE giải trọn trong 1 DB. Queue hợp cho **thông báo**, không
cho **quyết định tính đúng**.

### Điểm cấn 4 — Tìm brand & đảm bảo THU được tiền (QĐ-8)

2 bài tách biệt: (a) tìm brand ở đâu; (b) ký rồi làm sao chắc họ trả đủ. Điểm cấn nằm ở (b).

| # | Giải pháp (bài b — bảo đảm thanh toán) | Đánh giá |
|---|---|---|
| **✅ 1** | **Prepaid escrow 100%** — brand nạp đủ `budget + phí` TRƯỚC → campaign mới `ACTIVE` (status `PENDING_FUNDING` → `ACTIVE`) | **CHỌN** |
| 2 | Post-paid / NET-terms — làm xong xuất hoá đơn, brand trả sau | Loại (rủi ro công nợ) |
| 3 | Pay-as-you-go — brand trả dần theo từng content được duyệt | Loại (còn khe quỵt giữa chừng) |

**Vì sao chọn 1:** *hợp đồng không đòi được tiền; tiền nằm trong két mới chắc.* Prepaid escrow đưa
rủi ro quỵt về **0** cho cả creator lẫn nền tảng — mọi earning đều có tiền thật đứng sau. Khớp QĐ-3:
số phải nạp **biết chính xác từ lúc tạo** (`suất × giá + phí`). Bảo vệ **2 chiều**: brand cũng không
sợ trả cho content rác (tiền chỉ giải ngân khi Ops duyệt); còn suất thừa cuối kỳ → hoàn brand
(ledger `REFUND`).
**Vì sao không 2:** NET-terms = **rủi ro công nợ** — creator đã bỏ công làm content, brand xù/chậm
thì **nền tảng gánh** (phải đi đòi, mất uy tín với creator). Chỉ cấp cho brand có lịch sử tín nhiệm —
Phase xa.
**Vì sao không 3:** vẫn còn **khe hở**: brand ngừng nạp giữa chừng, creator đang làm dở bị kẹt tiền;
mỗi content lại một lần thu → phức tạp vận hành mà không xoá được rủi ro.
**Bài (a) go-to-market (chiến lược, không code):** giai đoạn 0 **concierge/agency mode** — tự đi bán
tay 3–5 brand đầu (F&B, mỹ phẩm nội địa, app cần UGC), dùng nền tảng làm tool nội bộ ("do things that
don't scale"). Pitch đắt nhất **có sẵn trong sản phẩm**: *"anh chỉ trả cho content ĐÃ NGHIỆM THU"* +
ngân sách trần cứng + dashboard minh bạch.

### Điểm cấn 5 — Thu phí sàn sao cho hợp lý (QĐ-7)

| # | Giải pháp | Đánh giá |
|---|---|---|
| **✅ 1** | **Take-rate 5–10% trên budget, thu từ BRAND** (brand nạp `budget + phí`; creator nhận đúng đơn giá niêm yết) | **CHỌN** |
| 2 | Cắt % vào tiền creator nhận (commission phía creator) | Loại (bào nguồn cung) |
| 3 | Phí rút tiền / phí giao dịch (thu khi creator rút) | Loại (phạt bước cuối) |

**Vì sao chọn 1:** đánh phí vào **bên có ngân sách + nhận giá trị đo được = brand** — họ vốn quen trả
agency 15–20%, take-rate 5–10% là **rẻ** so với chuẩn đó. Nhờ QĐ-3 (budget cố định) → phí cũng **cố
định, biết trước lúc tạo campaign**, không phí ẩn. Phí ≠ thuế → 2 dòng riêng trong ledger
(`PLATFORM_FEE`), không trộn.
**Vì sao không 2:** khó chịu của creator sinh ra từ **khoảng hụt giữa số niêm yết và số vào ví** —
*không phải từ việc có phí.* Cắt vào con số creator NHÌN THẤY = bào chính **nguồn cung** (người sáng
tạo), mất họ là mất hai-mặt của sàn. Nguyên tắc: **niêm yết = nhận** (trừ thuế có ghi chú rõ).
**Vì sao không 3:** phí rút chỉ là **pass-through** phí cổng thật — không nên biến thành nguồn thu;
thu phí ở bước rút = **phạt người đã đến tận bước cuối**, UX tệ nhất có thể. Miễn phí từ ngưỡng
`min_payout_minor`.
**Nguồn phụ về sau (không phải nguồn chính):** phí featured campaign, subscription cho brand chạy đều
(đổi lại giảm take-rate).

---

## Nhóm 1 — Sản phẩm & nghiệp vụ

**Q1. Tóm tắt trong 1 phút: sản phẩm này là gì và kiếm tiền thế nào?**
Nền tảng affiliate marketing đa quốc gia (Phase 1: VN + PH). Nhãn hàng bỏ ngân sách tạo
campaign; creator tham gia, đăng content lên mạng xã hội; content được Ops nghiệm thu thì
creator có thu nhập và rút được tiền; Admin vận hành vòng đời đó. **Nền tảng thu tiền từ brand**
(phí vận hành/`%` ngân sách) — Phase 1 mock vai brand: Local Admin tự tạo campaign, ngân sách
nhập tay. Em cố tình khép kín vòng "nộp → duyệt → ghi thu nhập → rút" trong hệ thống để ăn trọn
tiêu chí chấm luồng E2E (0.4 điểm).

**Q2. Book1 nói "3 nhóm người dùng: Core Platform, Admin, Creator" — sao mockup chỉ có 2 nhóm?**
Vì đó là **3 nhóm CHỨC NĂNG**, không phải 3 loại người đăng nhập. Creator và Admin (Local
Ops/Finance/Admin + Global Admin) là **actor thật** — có tài khoản, bấm nút. **Core Platform là
tầng nền** (đa quốc gia, cách ly, i18n, tiền tệ, thuế, RBAC) mà mọi actor đều tiêu thụ — nó
không có màn của riêng "người dùng Core Platform". Nó "sống" ở nút đổi VN/PH, định dạng tiền,
màn cấu hình quốc gia (V09)… Trong 22 Must, Core Platform chính là nhóm mã CP-01…CP-08.

**Q3. Vì sao bắt KYC ở bước Join, không phải lúc đăng ký hay lúc rút tiền? (QĐ-2)**
Join = **phát sinh nghĩa vụ tài chính** (giữ suất, hệ thống sẽ phải trả tiền) → phải định danh
người nhận tiền **trước khi cam kết**. Chặn ở lúc rút thì **quá muộn** (creator đã bỏ công làm
content mà không rút được → tranh chấp). Chặn ngay lúc đăng ký thì **quá sớm** (chưa gì đã bắt
nộp giấy tờ → UX tệ, mất người dùng). Join là điểm cân bằng đúng.

**Q4. "Đầy" là trạng thái do Admin bấm à?**
Không. **"Đầy" là suy ra** = `slots_taken >= slots_total`, không lưu cờ trong DB. Lưu cờ riêng
sẽ có nguy cơ lệch với số suất thực. Đây cũng là một biểu hiện của nguyên tắc "không lưu dữ liệu
suy được".

**Q5. Một creator dùng cả VN lẫn PH thì dữ liệu thế nào?**
1 tài khoản (`users`), **2 hồ sơ độc lập** (`creator_country_profiles` — UNIQUE(user, country)).
KYC, tài khoản ngân hàng, thu nhập tách riêng từng nước. Đổi nước = đổi ngữ cảnh, **không trộn
dữ liệu**. Đây là yêu cầu sản phẩm (luật từng nước khác nhau), không chỉ là chi tiết kỹ thuật.

---

## Nhóm 2 — Reward model (câu hỏi mentor đã "khoan" ở buổi trước)

**Q6. Thế trả theo view thì sao? Đó mới là affiliate thật.**
Em tách reward rule thành **3 trục độc lập**: ① điều kiện kích hoạt (trigger), ② cách định giá
(pricing), ③ trần ngân sách (cap). Điểm vỡ ngân sách **nằm ở trục ②** khi pricing = "tuyến tính
theo view, không trần": 30 suất × 500k = 15tr cố định, nhưng trả 50đ/view thì 1 video 10M view
= 500tr → vỡ 33 lần. **View không có tội — hệ-số-nhân-không-trần mới có tội.** Nên em cho view
tham gia **trục ①** (làm cổng: đạt X view → nhận flat) hoặc **bậc có trần**, miễn không làm hệ
số nhân vô hạn ở trục ②. Phase 1 chạy `CONTENT_APPROVED + FLAT`; view-gate chỉ là bật cột
`view_threshold`, **không đổi kiến trúc**.

**Q7. Thế CPS (trả theo đơn hàng) — không làm à?**
CPS là affiliate "thật" nhất (gắn doanh thu), nhưng cần tracking click + attribution + chống
gian lận + đối soát với sàn TMĐT — **mock rất nặng, không khép kín, dễ vỡ tiến độ 4 tuần**. Em
**model-hoá để chừa đường** (trục ① = `PAID_ORDER`, trục ② = `PERCENT`, có cột `percent_bps`)
nhưng **không triển khai runtime** Phase 1. Chi phí chừa đường gần bằng 0 (vài cột config).

**Q8. Nếu KOL làm đúng chuẩn nhưng 0 view thì có trả không?**
Phase 1 **có trả** — vì trả cho "content đạt kiểm duyệt", không phải cho view. Nếu sau này muốn
"phải có view mới trả" → bật `view_threshold` ở trục ①. Nguồn view khi đó: Ops nhập tay lúc
duyệt, hoặc mock "social-metrics provider" đúng định dạng (giống mock eKYC).

---

## Nhóm 3 — Database & mô hình dữ liệu

> Đặc tả đầy đủ từng bảng (vì sao tồn tại + khóa nào chống bug gì) sống ở **`docs/DATA_MODEL.md`**.
> Nhóm này chỉ giữ bản "trả lời miệng" ngắn; cần chi tiết thì trỏ sang đó.

**Q9. Vì sao 18 bảng mà không phải nhiều/ít hơn?**
Suy schema **từ 12 màn mockup**: mỗi bảng phải có ít nhất một màn "đòi" nó ra, không thì cắt. Bản
AI đầu sinh 45 bảng — em bỏ vì không giải thích nổi từng bảng. → chi tiết từng bảng: `DATA_MODEL.md`
mục 2.

**Q10. Tiền lưu kiểu gì? Vì sao?**
**Minor units** (`*_minor BIGINT`) + cột `currency`, **không float** (float sai 1 xu × hàng vạn
giao dịch = lệch sổ). VND exponent 0, PHP exponent 2. `net` **không lưu rời** — tính lại `gross −
tax`. → `DATA_MODEL.md` luật 1 · chứng minh code: `HARD_PROBLEMS.md` #2.

**Q11. Một khóa unique bất kỳ — nói nó chống bug gì?**
VD: `earning.submission_id` UNIQUE → exactly-once earning; `participation(profile,campaign)` UNIQUE
→ join idempotent; `payout_attempt.provider_ref` UNIQUE → chống double-pay. → bảng đầy đủ "khóa nào
chống bug gì": `DATA_MODEL.md` mục 4.

**Q12. Snapshot điều khoản là gì? (bài toán #5)**
Lúc join, **copy** đơn giá/trigger/pricing vào hàng `participation`; earning tính từ snapshot nên
Admin đổi giá sau **không hồi tố** người đã join. → chi tiết + code: `HARD_PROBLEMS.md` #5,
`DATA_MODEL.md` bảng 10.

---

## Nhóm 4 — Kiến trúc

**Q13. Vì sao Modular Monolith mà không microservices?**
Bài toán khó của đề là **tính đúng của tiền** (exactly-once, ledger, payout 3 trạng thái) — cần
**transaction trong 1 database**. Tách microservices = mất transaction, phải làm saga/2PC →
phức tạp gấp bội, dễ sai tiền. Đội 1 người/4 tuần: microservices chỉ thêm chi phí vận hành
(deploy, network, tracing) mà không đổi được giá trị nào ở quy mô này. Em vẫn **chia module
ranh giới rõ** (auth, country, kyc, campaign, money) nên sau này thật sự cần thì tách được;
ngược lại (gộp lại) mới khó.

**Q14. Một request đi qua đâu? Server tin cái gì từ client?**
`Client --(Bearer token)--> SessionAuthGuard --> Controller --> Service --> Prisma/DB`.
**Nguyên tắc lòng tin: server không bao giờ tin danh tính/vai/quốc gia từ client.** Danh tính +
vai lấy từ **session trong DB** (guard tra `session → user → role_assignments`), không từ
body/header tự khai. Route `/vn` `/ph` chỉ là **ý định hiển thị**; quyền thao tác nước nào do
`role_assignments` của phiên quyết định.

**Q15. Session lưu DB hay JWT? Vì sao?**
**Session lưu DB**, không JWT stateless. Token chỉ là con trỏ; sự thật (còn hạn? bị thu hồi?) ở
bảng `sessions`, lưu `sha256(token)` không lưu token thô (lộ DB cũng không tái dùng được). Đổi
lại JWT: **logout / khóa tài khoản có hiệu lực tức thì**, không phải chờ token hết hạn. Với hệ
dính tới tiền, khả năng thu hồi ngay quan trọng hơn cái tiện của stateless.

---

## Nhóm 5 — Điểm nghẽn & giải pháp (phần mentor quan tâm nhất)

**Q16. 🟢 Hai creator bấm Join suất cuối cùng — xử lý sao cho không oversell?**
Serial-hóa join bằng **khóa hàng campaign** (`SELECT campaign … FOR UPDATE`) + `UNIQUE(profile,
campaign)` → không bao giờ oversell dù 100 người bấm; hết suất → WAITLISTED FCFS. Có test RACE 3
người tranh 1 suất → 1 JOINED + 2 WAITLISTED. → cơ chế đầy đủ + file:dòng code & test:
`HARD_PROBLEMS.md` #7 (máy trạng thái & xung đột đồng thời).

**Q17. FOR UPDATE có phải "lựa chọn" không? Còn cách nào khác?**
3 biến thể cùng họ: **pessimistic** (FOR UPDATE), **optimistic** (version + retry — hợp tranh-chấp-
thấp), **atomic conditional update** (chỉ tăng được 1 số đếm). Chọn FOR UPDATE vì trong khóa còn
nhiều bước liên đới (KYC, strike, snapshot, đôn waitlist). → so sánh 3 giải pháp đầy đủ: **Nhóm 0,
điểm cấn 3**.

**Q18. Công bằng khi tranh suất — dựa trên gì?**
**FCFS** — thứ tự thắng = thứ tự **giành được khóa ở DB** ≈ thứ tự request tới. Tầng DB không có
"hòa" thật (luôn có một thứ tự tổng), nên không cần cơ chế phá hòa phức tạp. Dễ hiểu, dễ giải
thích, và người thua thấy **lý do có kiểu** (không phải "lỗi 500").

**Q19. 🟢 Creator join giữ suất rồi bỏ đó không làm — xử lý sao? (bài toán #4)**
Nguyên tắc: **đồng hồ chỉ chạy khi "bóng ở chân creator"**. JOINED quá hạn nộp (48h) hoặc
REJECTED quá hạn sửa (24h) → **thu hồi** (state `EXPIRED`, +1 `strike`, trả suất). Nhưng
`CONTENT_SUBMITTED`/`APPROVED` **miễn nhiễm** — đang chờ Ops thì dừng đồng hồ, không phạt oan
creator vì Ops chậm. Cơ chế: **worker quét nền** (`reclaimExpired()` — logic thuần, test được;
scheduler chỉ là lớp mỏng gọi định kỳ). Bị thu hồi ≥ 2 lần trên một campaign → **cấm join lại**
(strike). Suất khả dụng vẫn **suy ra** từ hold còn hiệu lực để join không oversell trong khe
giữa 2 lần quét.

**Q20. 🟢 Người thua race thì sao — chỉ báo lỗi rồi thôi?**
Không. Em kết hợp 3 việc: (1) đưa **thẳng vào hàng chờ FCFS** (`WAITLISTED` + `waitlisted_at`,
tái dùng bảng `participations`, không bảng mới) + hiện **vị trí trong hàng**; (2) khi một suất
được trả (creator rời / bị thu hồi) → **tự đôn** người đầu hàng chờ lên `JOINED` + snapshot điều
khoản **lúc đôn** + hạn nộp mới — làm **trong khóa campaign** nên an toàn; (3) **gợi ý campaign
tương tự** (cùng nước, còn suất, ưu tiên cùng nền tảng/mức thưởng gần). Người chờ/thua **không
bị strike** (không phải lỗi của họ). Rời/đôn trả suất rồi đôn lại = đếm suất net 0, không ai bị
kẹt oan.

**Q21. Ops double-click "Approve" có tạo 2 thu nhập không?**
Không — `earning.submission_id` **UNIQUE** + claim `WHERE state='SUBMITTED'` trong transaction:
approve thứ 2 khớp 0 hàng → 409, không sinh earning thứ 2. → chi tiết + file:dòng code & test:
`HARD_PROBLEMS.md` #3 (earning exactly-once).

**Q22. Cổng thanh toán trả về UNKNOWN/timeout thì làm gì?**
3 kết cục: Success→PAID; Fail xác nhận→hoàn balance đúng 1 lần; **UNKNOWN→GIỮ tiền (reserve), chờ
đối soát** (release vội = double-pay nếu provider thật đã chuyển). `provider_ref` UNIQUE →
callback/retry ghi 1 lần. → chi tiết + code: `HARD_PROBLEMS.md` #4 (payout 3 kết cục).

**Q23. Sổ tiền ghi sai thì sửa thế nào?**
`ledger_entries` **append-only** — không UPDATE/DELETE; sửa sai = ghi **bút toán đảo** (`REVERSAL`)
link `reversal_of_id` về bản gốc → luôn audit được (chuẩn kế toán). → chi tiết + code:
`HARD_PROBLEMS.md` #6 (sổ cái append-only).

---

## Nhóm 6 — Bảo mật & cách ly

**Q24. Ops Việt Nam có xem được hồ sơ KYC của Philippines không?**
Không. Vai + phạm vi nước lấy từ `role_assignments` của phiên; case PH mở bằng ID trực tiếp → **404**
(không lộ tồn tại tài nguyên nước khác). Mọi query scope theo `country_id` của phiên, không theo
tham số client. Có test kiểm chứng. → cơ chế + file:dòng code: `HARD_PROBLEMS.md` #1 (cách ly country).

**Q25. Nếu client sửa URL từ /vn thành /ph để "vượt rào" thì sao?**
Route chỉ là **ý định hiển thị**. Quyền thao tác vẫn do session + `role_assignments` quyết định
ở tầng service. Đổi URL không đổi được vai/nước của phiên → không đọc/ghi được dữ liệu ngoài
phạm vi. Server không tin đường dẫn.

**Q26. Mock những gì? Có công bố không?**
Có công bố rõ (không giả vờ thật): **SSO** ("Login Google" giả), **eKYC** (Ops duyệt tay),
**OTP** (mã cố định hiện màn dev), **cổng thanh toán** (provider giả có nút success/fail/unknown),
**tỷ giá** (bảng tĩnh). Mock đúng **định dạng interface** để sau thay bằng thật không đổi kiến trúc.

---

## Nhóm 7 — Chất lượng & kiểm thử

**Q27. Làm sao chứng minh những gì nói ở trên là đúng, không phải "chạy được trên máy em"?**
Test tự động: **API 44/44** (gồm cách ly cross-country, RBAC, join idempotent, snapshot, và test
**RACE 3 người tranh 1 suất**), **E2E trình duyệt 12/12** (login→chọn nước→KYC→duyệt→join→hàng
chờ). Lint + typecheck (API & web) sạch. Reclaim test dùng mẹo đẩy `submit_deadline_at` về quá
khứ để khỏi chờ 48h thật. Test là bằng chứng cho từng phát biểu, không phải demo tay.

**Q28. Test RACE thật sự chạy song song hay giả lập tuần tự?**
Bắn 3 request `Promise.all` (đồng thời) vào cùng endpoint. Nếu cơ chế sai thì sẽ oversell (≥2
JOINED). Kết quả ổn định: đúng 1 JOINED, 2 WAITLISTED, `slotsLeft = 0` — chứng minh FOR UPDATE
serial-hóa đúng.

---

## Nhóm 8 — Trade-off & quyết định cắt

**Q29. Vì sao làm sâu 1 luồng dọc thay vì làm rộng nhiều tính năng?**
Tiêu chí chấm nặng nhất (0.4) là **luồng E2E chạy được**. 1 luồng dọc chạy hết = ăn điểm; 10
tính năng dở dang = 0 điểm mục đó. Và tiền là chỗ **sai đắt nhất** — cần nền (Campaign/Join/
Content) vững trước khi đụng, nên money spine để Tuần C khi móng đã chắc.

**Q30. Đã cắt gì và nguyên tắc cắt là gì?**
Cắt: Brand portal (Phase 2), API/webhook công khai (Phase 3), CPS/đơn hàng, push notification,
social linking, báo cáo nâng cao, thuế pháp lý thật. **Nguyên tắc: không bao giờ cắt cách ly
country / tính đúng của tiền / audit.** Chỉ cắt tính năng "nice-to-have" nằm ngoài luồng tiền.

**Q31. Vì sao budget = suất × đơn giá mà không phải quỹ trừ dần? (QĐ-3)**
Đơn giản, dễ nghĩ ("còn 3 suất"), tổng trách nhiệm tài chính = N×X **biết trước từ lúc tạo**.
Quỹ trừ dần linh hoạt hơn nhưng phải xử lý race chạm đáy quỹ — không đáng độ phức tạp cho Phase
1. Nhưng em vẫn chừa `cap_type = POOL` trong `reward_rules` để mở sau.

---

## Nhóm 9 — Hướng phát triển tiếp (N11–N20)

**Q32. Bước tiếp theo cụ thể là gì?**
**Tuần C — money spine:** N11 content→review→Earning exactly-once; N12 ledger append-only +
dashboard Gross–Thuế–Net; N13 đối soát lock batch → AVAILABLE; N14 payout + OTP + reserve; N15
xử lý UNKNOWN + bút toán đảo + E2E cả spine tiền trên VN+PH. **Tuần D — triển khai + defense:**
i18n hoàn thiện, audit + negative tests, seed + README + docker, `HARD_PROBLEMS.md` thành bộ
Q&A, tổng duyệt demo.

**Q33. Nợ kỹ thuật / rủi ro còn lại?**
(1) Money spine chưa có → chưa demo được rút tiền thật. (2) Scheduler thu hồi hiện **tắt mặc
định** (bật bằng env `RECLAIM_SWEEP_MS`) — chủ ý để test/demo không tự quét; production cần bật
+ giám sát. (3) `fix_deadline_at` (hạn sửa sau reject) sẽ set ở N11 khi có luồng review. (4) Cần
Docker Postgres bật (cổng 54329) để chạy. (5) i18n/responsive mới ở mức nền, hoàn thiện ở N16.

**Q34. Nếu chỉ được thêm 1 tuần nữa thì ưu tiên gì?**
Money spine (N11–N15) — vì nó chứa **3 bài toán khó còn lại** (exactly-once, payout 3 trạng
thái, ledger đảo) và là phần "sai đắt nhất". Xong money spine là hệ thống chứng minh được toàn
bộ vòng đời một đồng tiền — giá trị lớn nhất cho một buổi bảo vệ.

---

## Phụ lục — Câu hỏi "bẫy" mentor có thể hỏi

**B1. Em chắc FOR UPDATE không gây deadlock chứ?**
Rủi ro deadlock đến từ khóa **nhiều hàng theo thứ tự khác nhau**. Ở đây join chỉ khóa **một
hàng campaign** rồi mới đụng participation của chính phiên đó — thứ tự khóa nhất quán (campaign
trước), không có vòng chờ chéo. Nếu sau này khóa nhiều campaign trong 1 giao dịch thì phải khóa
theo thứ tự id cố định.

**B2. slots_taken là số đếm — lỡ lệch với số participation thật thì sao?**
`slots_taken` được tăng/giảm **chỉ trong khóa campaign** (cùng transaction với việc tạo/đổi
participation), nên không lệch do race. Nó là "bộ đếm quyền uy"; "Đầy" vẫn suy ra từ nó. Có thể
thêm job đối chiếu định kỳ `slots_taken == count(hold hiệu lực)` như một lớp an toàn.

**B3. Vì sao không dùng hàng đợi/queue (Redis, Kafka) cho việc tranh suất?**
Vì lời giải đúng nằm ở **tính atomic của DB** — thêm queue là thêm hệ thống phải đảm bảo
exactly-once giữa queue và DB (bài toán khó hơn). FOR UPDATE giải trọn vẹn trong 1 DB, không
thêm hạ tầng. Queue hợp cho **thông báo** (đôn ai đó lên), không phải cho **quyết định tính
đúng**.

**B4. Prototype này có sẵn sàng production không?**
Chưa — và em không tuyên bố thế. Đây là **prototype hiểu-sâu**: chứng minh được các quyết định
lõi và các bài toán khó bằng code + test. Để production còn thiếu: SSO/eKYC/payment thật, money
spine hoàn chỉnh, observability, rate-limit, và kiểm thử tải. Nhưng **kiến trúc và mô hình dữ
liệu đã đặt đúng** để đi tiếp mà không phải đập lại.
