import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { Pool, type QueryResultRow } from "pg";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const envPath = resolve(repositoryRoot, ".env");
if (!process.env.DATABASE_URL && existsSync(envPath)) process.loadEnvFile(envPath);

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) throw new Error("DATABASE_URL is required for the Go API acceptance suite.");
const databaseUrl = new URL(rawDatabaseUrl);
databaseUrl.searchParams.delete("schema");

const pool = new Pool({ connectionString: databaseUrl.toString(), max: 4, allowExitOnIdle: true });
const execFileAsync = promisify(execFile);

export async function goApiBaseUrl(): Promise<string> {
  const baseUrl = process.env.GO_API_BASE_URL ?? "http://127.0.0.1:3001";
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) throw new Error(`Go API is not healthy at ${baseUrl}: HTTP ${response.status}`);
  return baseUrl;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await pool.query<T>(text, values)).rows;
}

export async function scalar<T>(text: string, values: unknown[] = []): Promise<T> {
  const rows = await sql<{ value: T }>(text, values);
  if (rows.length !== 1) throw new Error(`Expected one scalar row, received ${rows.length}.`);
  return rows[0].value;
}

export async function runReclaim(): Promise<{ reclaimed: number }> {
  const { stdout } = await execFileAsync("go", ["-C", "apps/api-go", "run", "./cmd/reclaim"], {
    cwd: repositoryRoot,
    env: process.env,
  });
  const match = stdout.match(/"reclaimed":(\d+)/);
  if (!match) throw new Error(`Cannot read reclaim result from Go command: ${stdout}`);
  return { reclaimed: Number(match[1]) };
}
