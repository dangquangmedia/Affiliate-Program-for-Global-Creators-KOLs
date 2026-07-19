import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JoinService } from "./join.service";

/**
 * Lớp scheduler MỎNG (QĐ-4): chỉ gọi `JoinService.reclaimExpired` định kỳ — toàn bộ logic nằm
 * ở service (test được, không phụ thuộc thời gian thực). Mặc định TẮT (test/demo không tự quét);
 * bật bằng biến môi trường `RECLAIM_SWEEP_MS` = chu kỳ quét (ms). Ví dụ dev: RECLAIM_SWEEP_MS=60000.
 */
@Injectable()
export class ReclaimScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReclaimScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(JoinService) private readonly join: JoinService) {}

  onModuleInit(): void {
    const ms = Number(process.env.RECLAIM_SWEEP_MS);
    if (!Number.isFinite(ms) || ms <= 0) return; // không cấu hình -> không chạy
    this.timer = setInterval(() => {
      void this.join
        .reclaimExpired()
        .then((r) => {
          if (r.reclaimed > 0) this.logger.log(`reclaimed=${r.reclaimed} promoted=${r.promoted}`);
        })
        .catch((e) => this.logger.error("reclaim sweep failed", e as Error));
    }, ms);
    this.timer.unref?.(); // đừng giữ process sống chỉ vì timer
    this.logger.log(`slot reclaim sweep bật, chu kỳ ${ms}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
