import { BadRequestException, Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, AuthContext, LoginResult } from "./auth.service";
import { SessionAuthGuard, extractBearer } from "./session-auth.guard";
import { CurrentAuth } from "./current-auth.decorator";

interface MockLoginBody {
  email?: unknown;
  displayName?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  // Mock SSO: đổi email lấy session. Công khai (chưa có session mới login được).
  @Post("mock-login")
  async mockLogin(@Body() body: MockLoginBody): Promise<LoginResult> {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "A valid email is required." });
    }
    const displayName = typeof body.displayName === "string" ? body.displayName : undefined;
    return this.auth.mockLogin(email, displayName);
  }

  // Ai đang đăng nhập + có vai gì. Chốt: dữ liệu này tra từ session server, không từ client.
  @Get("me")
  @UseGuards(SessionAuthGuard)
  me(@CurrentAuth() auth: AuthContext): AuthContext {
    return auth;
  }

  // Thu hồi phiên hiện tại.
  @Post("logout")
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request): Promise<{ ok: true }> {
    await this.auth.logout(extractBearer(req));
    return { ok: true };
  }
}
