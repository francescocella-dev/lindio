import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const DEFAULT_BASE_URL = "http://127.0.0.1:4183";
const DEFAULT_OUTPUT_DIRECTORY = "docs/assets/demo";
const PREVIEW_START_TIMEOUT_MS = 60_000;

const CUSTOMER_MESSAGE = [
  "Ciao, mi chiamo Giulia Bianchi.",
  "Ho bisogno di una pulizia post ristrutturazione per un appartamento vuoto di 80 mq a Roma domani.",
  "È al secondo piano con ascensore e posso inviare foto.",
  "Vorrei un preventivo. Il mio numero è 333 123 4567."
].join(" ");

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveBaseUrl() {
  const rawValue = process.env.LINDIO_DEMO_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const url = new URL(rawValue);

  if (url.username || url.password) {
    throw new Error("The demo base URL must not contain embedded credentials.");
  }

  if (!isLoopback(url.hostname) && url.protocol !== "https:") {
    throw new Error("Remote screenshot capture requires an HTTPS base URL.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The demo base URL must point to the application origin root.");
  }

  return new URL("/", url);
}

function resolveOutputDirectory() {
  const configuredDirectory =
    process.env.LINDIO_DEMO_SCREENSHOT_DIR?.trim() || DEFAULT_OUTPUT_DIRECTORY;

  return path.resolve(process.cwd(), configuredDirectory);
}

async function waitForPreview(baseUrl, childProcess, stderrLines) {
  const loginUrl = new URL("/login", baseUrl).href;
  const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (childProcess.exitCode !== null) {
      const details = stderrLines.slice(-12).join("\n");
      throw new Error(
        `Vite preview exited before becoming ready.${details ? `\n${details}` : ""}`
      );
    }

    try {
      const response = await fetch(loginUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Preview is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for Vite preview at ${loginUrl}.`);
}

async function startLocalPreview(baseUrl) {
  if (!isLoopback(baseUrl.hostname)) return null;

  const viteCli = path.resolve(process.cwd(), "node_modules/vite/bin/vite.js");
  const port = baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80");
  const host = baseUrl.hostname === "localhost" ? "127.0.0.1" : baseUrl.hostname;
  const stderrLines = [];

  const childProcess = spawn(
    process.execPath,
    [viteCli, "preview", "--host", host, "--port", port, "--strictPort"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }
  );

  childProcess.stdout.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) console.log(`[vite preview] ${text}`);
  });

  childProcess.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) {
      stderrLines.push(text);
      console.error(`[vite preview] ${text}`);
    }
  });

  await waitForPreview(baseUrl, childProcess, stderrLines);
  return childProcess;
}

async function stopLocalPreview(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) return;

  childProcess.kill();
  await Promise.race([
    new Promise((resolve) => childProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000))
  ]);

  if (childProcess.exitCode === null) childProcess.kill("SIGKILL");
}

async function waitForStablePaint(page) {
  await page.evaluate(async () => {
    if (globalThis.document?.fonts?.ready) await globalThis.document.fonts.ready;

    await new Promise((resolve) => {
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(resolve);
      });
    });
  });
}

async function captureScreenshot(page, outputDirectory, fileName) {
  await waitForStablePaint(page);
  const outputPath = path.join(outputDirectory, fileName);

  await page.screenshot({
    path: outputPath,
    type: "jpeg",
    quality: 88,
    fullPage: false,
    animations: "disabled",
    caret: "hide"
  });

  console.log(`Captured ${path.relative(process.cwd(), outputPath)}`);
}

async function gotoRoute(page, baseUrl, route, heading) {
  await page.goto(new URL(route, baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: heading }).first().waitFor({
    state: "visible",
    timeout: 30_000
  });
}

async function enterDemo(page, baseUrl) {
  await gotoRoute(page, baseUrl, "/login", "Entra in Lindio");
  await page.getByRole("button", { name: "Esplora la demo" }).click();
  await page.waitForURL((url) => url.pathname === "/today", { timeout: 30_000 });
  await page.getByText("Demo locale", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000
  });
}

async function createCanonicalRequest(page, baseUrl, onAnalysisReady) {
  await gotoRoute(page, baseUrl, "/leads/new", "Registra una richiesta cliente");
  await page.getByLabel("Messaggio / nota").fill(CUSTOMER_MESSAGE);
  await page.getByRole("button", { name: "Analizza messaggio" }).click();

  const analysisDialog = page.getByRole("dialog");
  await analysisDialog.getByRole("heading", { name: "Analisi della richiesta" }).waitFor({
    state: "visible",
    timeout: 30_000
  });
  await analysisDialog.getByText("Pulizia post-ristrutturazione", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000
  });
  await analysisDialog.getByText("Analisi deterministica locale", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000
  });

  if (onAnalysisReady) await onAnalysisReady();

  await analysisDialog.getByRole("button", { name: "Usa dati nella richiesta" }).click();
  await page.getByLabel("Nome cliente").waitFor({ state: "visible", timeout: 30_000 });

  const saveButton = page.getByRole("button", { name: "Salva richiesta" });
  await saveButton.waitFor({ state: "visible", timeout: 30_000 });
  await saveButton.focus();
  await saveButton.press("Enter");

  await page.waitForURL((url) => /^\/leads\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
  await page.getByRole("heading", { name: "Giulia Bianchi" }).waitFor({
    state: "visible",
    timeout: 30_000
  });
}

async function prepareScenario(page, baseUrl, onAnalysisReady) {
  await enterDemo(page, baseUrl);
  await createCanonicalRequest(page, baseUrl, onAnalysisReady);
}

function createDesktopContext(browser) {
  return browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    reducedMotion: "reduce",
    serviceWorkers: "block"
  });
}

function createMobileContext(browser) {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    reducedMotion: "reduce",
    serviceWorkers: "block"
  });
}

async function captureDesktop(browser, baseUrl, outputDirectory) {
  const context = await createDesktopContext(browser);
  const page = await context.newPage();

  try {
    await gotoRoute(page, baseUrl, "/login", "Entra in Lindio");
    await captureScreenshot(page, outputDirectory, "login-desktop.jpg");

    await prepareScenario(page, baseUrl, async () => {
      await captureScreenshot(page, outputDirectory, "intake-analysis-desktop.jpg");
    });

    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await captureScreenshot(page, outputDirectory, "lead-detail-desktop.jpg");

    await gotoRoute(page, baseUrl, "/today", /Ciao .+, cosa devi fare oggi\?/);
    await captureScreenshot(page, outputDirectory, "today-desktop.jpg");

    await gotoRoute(page, baseUrl, "/leads", "Richieste clienti");
    await captureScreenshot(page, outputDirectory, "leads-desktop.jpg");

    await gotoRoute(page, baseUrl, "/report", "Controllo operativo");
    await captureScreenshot(page, outputDirectory, "report-desktop.jpg");
  } finally {
    await context.close();
  }
}

async function captureMobile(browser, baseUrl, outputDirectory) {
  const context = await createMobileContext(browser);
  const page = await context.newPage();

  try {
    await prepareScenario(page, baseUrl);

    await gotoRoute(page, baseUrl, "/today", /Ciao .+, cosa devi fare oggi\?/);
    await captureScreenshot(page, outputDirectory, "today-mobile.jpg");

    await gotoRoute(page, baseUrl, "/leads", "Richieste clienti");
    await captureScreenshot(page, outputDirectory, "leads-mobile.jpg");
  } finally {
    await context.close();
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const outputDirectory = resolveOutputDirectory();

  await mkdir(outputDirectory, { recursive: true });

  const previewProcess = await startLocalPreview(baseUrl);
  const browser = await chromium.launch({ headless: true });

  try {
    await captureDesktop(browser, baseUrl, outputDirectory);
    await captureMobile(browser, baseUrl, outputDirectory);
  } finally {
    await browser.close();
    await stopLocalPreview(previewProcess);
  }

  console.log(`Screenshot capture completed for ${baseUrl.origin}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
