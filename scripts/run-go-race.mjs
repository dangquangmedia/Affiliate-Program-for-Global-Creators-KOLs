import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeArgs = ["compose", "-f", "compose.race.yaml", "-p", "affiliate-week6-race"];
let exitCode = 1;

try {
  const build = spawnSync(
    "docker",
    ["build", "-f", "apps/api-go/Dockerfile.race", "-t", "affiliate-go-race:week6", "."],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (build.error || build.status !== 0) {
    if (build.error) console.error(build.error.message);
    process.exitCode = build.status ?? 1;
    throw new Error("Race image build failed.");
  }
  const result = spawnSync(
    "docker",
    [...composeArgs, "up", "--no-build", "--abort-on-container-exit", "--exit-code-from", "race", "race"],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (result.error) console.error(result.error.message);
  else exitCode = result.status ?? 1;
} finally {
  spawnSync("docker", [...composeArgs, "down", "--volumes", "--remove-orphans"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

process.exit(exitCode);
