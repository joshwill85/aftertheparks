#!/usr/bin/env node
/**
 * Create Turnstile widget via Cloudflare Dashboard using system Chrome profile.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "038f9993bc99b633e35d87e8284d799f";
const WIDGET_NAME = process.env.TURNSTILE_WIDGET_NAME ?? "After the Parks My Plan";
const DOMAINS = (process.env.TURNSTILE_DOMAINS ?? "aftertheparks.com,www.aftertheparks.com,localhost").split(",");
const OUT_FILE = join(process.cwd(), ".env.cloudflare.local");

const PROFILE_CANDIDATES = [
  join(homedir(), "Library/Application Support/Google/Chrome"),
  join(process.cwd(), "tmp", "cf-playwright-profile"),
];

const ADD_URL = `https://dash.cloudflare.com/${ACCOUNT_ID}/turnstile/add`;
const LIST_URL = `https://dash.cloudflare.com/${ACCOUNT_ID}/turnstile`;

async function extractKeysFromPage(page) {
  const text = await page.locator("body").innerText();
  const keys = text.match(/0x[0-9A-Za-z_-]+/g) ?? [];
  const unique = [...new Set(keys)];
  if (unique.length >= 2) {
    return { sitekey: unique[0], secret: unique[1] };
  }
  return null;
}

async function tryExistingWidget(page) {
  await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 120_000 });
  const link = page.getByText(WIDGET_NAME, { exact: false }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForTimeout(2000);
    const keys = await extractKeysFromPage(page);
    if (keys) return keys;
  }
  return null;
}

async function createWidget(page) {
  await page.goto(ADD_URL, { waitUntil: "networkidle", timeout: 120_000 });

  if (page.url().includes("login")) {
    throw new Error("Not logged in to Cloudflare Dashboard in Chrome");
  }

  const existing = await tryExistingWidget(page);
  if (existing) return existing;

  await page.goto(ADD_URL, { waitUntil: "networkidle", timeout: 120_000 });

  await page.getByLabel(/widget name|site name|name/i).fill(WIDGET_NAME).catch(async () => {
    await page.locator("input").first().fill(WIDGET_NAME);
  });

  for (const domain of DOMAINS) {
    const host = domain.trim();
    const hostInput = page.getByLabel(/hostname|domain/i).first();
    if (await hostInput.isVisible().catch(() => false)) {
      await hostInput.fill(host);
      await hostInput.press("Enter");
    } else {
      const any = page.locator('input[type="text"]').nth(1);
      await any.fill(host);
      await any.press("Enter");
    }
    await page.waitForTimeout(500);
  }

  await page.getByText(/^Invisible$/i).click().catch(() => {});
  await page.getByRole("button", { name: /create/i }).click();
  await page.waitForTimeout(4000);

  const keys = await extractKeysFromPage(page);
  if (!keys) throw new Error("Could not read sitekey/secret from dashboard");
  return keys;
}

async function main() {
  let lastError;
  for (const profile of PROFILE_CANDIDATES) {
    if (!existsSync(profile)) {
      mkdirSync(profile, { recursive: true });
    }
    try {
      const context = await chromium.launchPersistentContext(profile, {
        channel: "chrome",
        headless: false,
        viewport: { width: 1280, height: 900 },
      });
      const page = context.pages()[0] ?? (await context.newPage());
      const keys = await createWidget(page);
      writeFileSync(
        OUT_FILE,
        `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${keys.sitekey}\nTURNSTILE_SECRET_KEY=${keys.secret}\n`,
        { mode: 0o600 }
      );
      console.log(`Wrote ${OUT_FILE}`);
      await context.close();
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Dashboard automation failed");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
