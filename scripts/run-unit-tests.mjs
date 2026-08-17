import { rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = resolve(projectRoot, ".tmp-test-build");

rmSync(outputDir, { recursive: true, force: true });

const tscExecutable = process.platform === "win32" ? "tsc.cmd" : "tsc";
const compile = spawnSync(tscExecutable, ["-p", "tsconfig.test-build.json"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

writeFileSync(resolve(outputDir, "package.json"), '{"type":"commonjs"}\n');

const tests = [
  "tests/unit/lead-validation.test.cjs",
  "tests/unit/lead-workflow.test.cjs",
  "tests/unit/lead-operations.test.cjs",
  "tests/unit/reminder-policy.test.cjs",
  "tests/unit/application-error.test.cjs",
  "tests/unit/intake-analysis-contract.test.cjs",
  "tests/unit/deterministic-intake-analyzer.test.cjs",
  "tests/unit/account-validation.test.cjs",
  "tests/unit/auth-validation.test.cjs",
  "tests/unit/local-lead-service.test.cjs",
  "tests/unit/demo-account-repository.test.cjs",
  "tests/unit/supabase-auth-repository.test.cjs",
  "tests/unit/supabase-repositories.test.cjs"
].map((file) => resolve(projectRoot, file));

const run = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    LINDIO_TEST_BUILD_DIR: outputDir
  }
});

rmSync(outputDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
