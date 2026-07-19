import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthContext } from "./auth.service";
import { AuthedRequest } from "./session-auth.guard";

/** @CurrentAuth() -> AuthContext đã được SessionAuthGuard gắn vào request. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.auth) {
      // Không bao giờ xảy ra nếu route đã @UseGuards(SessionAuthGuard); chặn lỗi lập trình.
      throw new Error("CurrentAuth used without SessionAuthGuard on the route.");
    }
    return req.auth;
  },
);
