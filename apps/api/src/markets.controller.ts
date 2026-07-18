import { Controller, Get, Inject, Param } from "@nestjs/common";
import { MarketsService, MarketContext } from "./markets.service";

@Controller("markets")
export class MarketsController {
  constructor(@Inject(MarketsService) private readonly markets: MarketsService) {}

  @Get(":market/context")
  async getContext(@Param("market") market: string): Promise<MarketContext> {
    return this.markets.getContext(market);
  }
}
