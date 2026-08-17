import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function getTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
  } catch (error) {
    console.error("Impossibile leggere i file tracciati con `git ls-files`.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const trackedFiles = getTrackedFiles();
const failures = [];

const forbiddenTrackedPaths = [
  [/^node_modules\//, "node_modules"],
  [/^dist\//, "build output dist"],
  [/^coverage\//, "coverage output"],
  [/^playwright-report\//, "Playwright report"],
  [/^playwright-pwa-report\//, "Playwright PWA report"],
  [/^test-results\//, "Playwright test results"],
  [/^test-results-pwa\//, "Playwright PWA test results"],
  [/^\.netlify\//, "local Netlify state"],
  [/^supabase\/\.temp\//, "local Supabase temp state"],
  [/^supabase\/\.branches\//, "local Supabase branch state"]
];

for (const filePath of trackedFiles) {
  if (/^\.env(?:\.|$)/.test(filePath) && filePath !== ".env.example") {
    failures.push(`${filePath}: environment file must not be tracked`);
  }

  for (const [pattern, description] of forbiddenTrackedPaths) {
    if (pattern.test(filePath)) {
      failures.push(`${filePath}: tracked ${description}`);
    }
  }
}

const contentChecks = [
  {
    label: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/
  },
  {
    label: "GitHub access token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/
  },
  {
    label: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/
  },
  {
    label: "Stripe secret key",
    pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/
  },
  {
    label: "Supabase service-role assignment",
    pattern: /(?:SUPABASE_SERVICE_ROLE_KEY|service[_-]?role[_-]?key)\s*[:=]\s*["']?(?!replace|placeholder|example)[^\s"'#]{20,}/i
  },
  {
    label: "absolute Windows workspace path",
    pattern: /\b[A-Za-z]:\\(?:Users\\|Documents and Settings\\|[^\r\n"']{0,100}\\(?:lindio|doclia|vennilo|nurseboard)(?:\\|\b))/i
  }
];

for (const filePath of trackedFiles) {
  let buffer;

  try {
    buffer = readFileSync(filePath);
  } catch {
    continue;
  }

  if (buffer.includes(0)) continue;

  const text = buffer.toString("utf8");

  for (const check of contentChecks) {
    if (check.pattern.test(text)) {
      failures.push(`${filePath}: possible ${check.label}`);
    }
  }
}

console.log("\nRelease hygiene:");
console.log(`- tracked files inspected: ${trackedFiles.length}`);
console.log("- generated/local state: checked");
console.log("- high-signal secret patterns: checked");
console.log("- absolute local workspace paths: checked");

if (failures.length > 0) {
  console.error("\nRelease hygiene gate: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release hygiene gate: PASS\n");
