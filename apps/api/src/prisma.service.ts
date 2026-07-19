import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

// Delegate được gõ tay (client sinh ra là ESM .ts, nạp bằng dynamic import — xem ghi chú dưới).
// Chỉ khai báo phần đang dùng; mở rộng khi cần bảng mới.
export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  authProvider: string;
  providerSubject: string;
}
export interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}
export interface RoleRow {
  countryId: string | null;
  role: string;
}
export interface ProfileRow {
  id: string;
  userId: string;
  countryId: string;
  onboardingState: string;
}

export type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  country: {
    findUnique(args: { where: { code: string }; include?: unknown }): Promise<unknown>;
  };
  user: {
    upsert(args: {
      where: { authProvider_providerSubject: { authProvider: string; providerSubject: string } };
      create: Omit<UserRow, "id">;
      update: Partial<Omit<UserRow, "id">>;
    }): Promise<UserRow>;
    findUnique(args: { where: { id: string }; include?: unknown }): Promise<unknown>;
  };
  session: {
    create(args: { data: Omit<SessionRow, "id" | "revokedAt"> }): Promise<SessionRow>;
    findUnique(args: { where: { tokenHash: string }; include?: unknown }): Promise<unknown>;
    update(args: { where: { id: string }; data: Partial<SessionRow> }): Promise<SessionRow>;
  };
  creatorCountryProfile: {
    upsert(args: {
      where: { userId_countryId: { userId: string; countryId: string } };
      create: { userId: string; countryId: string };
      update: { onboardingState?: string };
    }): Promise<ProfileRow>;
    findMany(args: { where: { userId: string }; include?: unknown }): Promise<unknown>;
  };
  kycCase: {
    findUnique(args: { where: { id?: string; profileId?: string }; include?: unknown }): Promise<unknown>;
    findMany(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    create(args: { data: unknown; include?: unknown }): Promise<unknown>;
    update(args: { where: { id: string }; data: unknown; include?: unknown }): Promise<unknown>;
  };
  kycField: {
    update(args: { where: { caseId_key: { caseId: string; key: string } }; data: unknown }): Promise<unknown>;
  };
  campaign: {
    findMany(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    findFirst(args: { where?: unknown; include?: unknown }): Promise<unknown>;
    findUnique(args: { where: { id: string }; include?: unknown }): Promise<unknown>;
    create(args: { data: unknown; include?: unknown }): Promise<unknown>;
    update(args: { where: { id: string }; data: unknown }): Promise<unknown>;
  };
  participation: {
    findFirst(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    findMany(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    count(args: { where?: unknown }): Promise<number>;
    create(args: { data: unknown; include?: unknown }): Promise<unknown>;
    update(args: { where: unknown; data: unknown; include?: unknown }): Promise<unknown>;
  };
  countryConfig: {
    findUnique(args: { where: { countryId: string } }): Promise<unknown>;
  };
  submission: {
    findFirst(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    findMany(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    count(args: { where?: unknown }): Promise<number>;
    create(args: { data: unknown; include?: unknown }): Promise<unknown>;
    update(args: { where: unknown; data: unknown; include?: unknown }): Promise<unknown>;
  };
  earning: {
    findFirst(args: { where?: unknown; include?: unknown }): Promise<unknown>;
    findMany(args: { where?: unknown; include?: unknown; orderBy?: unknown }): Promise<unknown>;
    count(args: { where?: unknown }): Promise<number>;
    create(args: { data: unknown }): Promise<unknown>;
  };
  // Interactive transaction: callback nhận 1 client-like đã ở trong transaction (dùng cho
  // SELECT ... FOR UPDATE + đọc/ghi nguyên tử khi tranh suất — QĐ-5).
  $transaction<T>(fn: (tx: PrismaClientLike) => Promise<T>): Promise<T>;
};

/**
 * The generated Prisma client is emitted as ESM TypeScript source (see prisma/schema.prisma
 * generator config), while the rest of this NestJS app builds as CommonJS. A dynamic import()
 * loads the ESM client from CJS without forcing the whole app onto ESM module rules; the
 * process must run under tsx (see package.json scripts) so the .ts extension resolves.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client!: PrismaClientLike;

  async onModuleInit(): Promise<void> {
    const clientEntry = resolve(__dirname, "..", "src", "generated", "prisma", "client.ts");
    const { PrismaClient } = await import(pathToFileURL(clientEntry).href);
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    this.client = new PrismaClient({ adapter });
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }

  get db(): PrismaClientLike {
    return this.client;
  }
}
