import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma.service";

// Tầng nền Core Platform: danh tính + phiên. Mock SSO (nút "Login with Google" giả) —
// KHÔNG có provider thật; ta tự tạo user từ email và cấp session lưu DB (thu hồi được).
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}
export interface AuthRole {
  countryId: string | null;
  role: string;
}
export interface AuthContext {
  user: AuthUser;
  roles: AuthRole[];
}
export interface LoginResult {
  token: string; // token thô — chỉ trả 1 lần lúc login, không lưu ở server dạng thô
  expiresAt: Date;
  user: AuthUser;
}

const MOCK_PROVIDER = "mock-google";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

type SessionWithUser = {
  id: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: { id: string; email: string; displayName: string; roleAssignments: AuthRole[] };
};

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Mock SSO: upsert user theo (provider, email) rồi cấp 1 session mới. */
  async mockLogin(email: string, displayName?: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const name = displayName?.trim() || normalizedEmail.split("@")[0];

    const user = await this.prisma.db.user.upsert({
      where: {
        authProvider_providerSubject: { authProvider: MOCK_PROVIDER, providerSubject: normalizedEmail },
      },
      create: {
        email: normalizedEmail,
        displayName: name,
        authProvider: MOCK_PROVIDER,
        providerSubject: normalizedEmail,
      },
      update: { displayName: name },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.db.session.create({
      data: { userId: user.id, tokenHash: this.hash(token), expiresAt },
    });

    return { token, expiresAt, user: { id: user.id, email: user.email, displayName: user.displayName } };
  }

  /** Đổi token thô -> ngữ cảnh đã xác thực. Ném 401 nếu thiếu/hết hạn/đã thu hồi. */
  async resolveSession(token: string | undefined): Promise<AuthContext> {
    if (!token) {
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Missing session token." });
    }

    const session = (await this.prisma.db.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: { include: { roleAssignments: true } } },
    })) as SessionWithUser | null;

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({ code: "UNAUTHENTICATED", message: "Session is invalid or expired." });
    }

    return {
      user: { id: session.user.id, email: session.user.email, displayName: session.user.displayName },
      roles: session.user.roleAssignments.map((r) => ({ countryId: r.countryId, role: r.role })),
    };
  }

  /** Thu hồi phiên (logout). Idempotent: token sai/không có -> im lặng. */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const session = (await this.prisma.db.session.findUnique({
      where: { tokenHash: this.hash(token) },
    })) as { id: string; revokedAt: Date | null } | null;
    if (session && !session.revokedAt) {
      await this.prisma.db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    }
  }
}
