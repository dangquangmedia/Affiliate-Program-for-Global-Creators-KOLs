import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  country: {
    findUnique(args: { where: { code: string }; include?: unknown }): Promise<unknown>;
  };
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
