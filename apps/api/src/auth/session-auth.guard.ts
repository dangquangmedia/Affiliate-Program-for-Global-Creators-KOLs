import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, AuthContext } from "./auth.service";

// Request có gắn thêm ngữ cảnh đã xác thực sau khi qua guard.
export interface AuthedRequest extends Request {
  auth?: AuthContext;
}

/** Lấy Bearer token từ header Authorization. */
export function extractBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? value : undefined;
}

/**
 * Mọi route gắn @UseGuards(SessionAuthGuard) đều resolve session Ở SERVER — không bao giờ
 * tin danh tính/vai từ client. Đây là chốt của Core Platform: request đi kèm token, sự thật
 * (user + roles + country) tra từ DB. Ném 401 nếu không hợp lệ.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    req.auth = await this.auth.resolveSession(extractBearer(req));
    return true;
  }
}
