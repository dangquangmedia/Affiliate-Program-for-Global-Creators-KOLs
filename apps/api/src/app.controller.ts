import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root(): { service: string; endpoints: string[] } {
    return {
      service: "affiliate-global-api",
      endpoints: ["/health", "/markets/{market}/context (e.g. /markets/vn/context)"],
    };
  }
}
