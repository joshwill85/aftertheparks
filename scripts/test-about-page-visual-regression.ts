import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = path.join(process.cwd(), "test-results/about-page");

const viewports = [
  { name: "390", width: 390, height: 1200 },
  { name: "768", width: 768, height: 1200 },
  { name: "1024", width: 1024, height: 1200 },
  { name: "1440", width: 1440, height: 1200 },
] as const;

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

function intersects(a: Box, b: Box): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function requiredBox(locator: Locator, label: string): Promise<Box> {
  await expectVisible(locator, label);
  const box = await locator.boundingBox();
  assert.ok(box, `${label} should have a measurable bounding box.`);
  assert.ok(box.width > 0, `${label} should have nonzero width.`);
  assert.ok(box.height > 0, `${label} should have nonzero height.`);
  return box;
}

async function expectVisible(locator: Locator, label: string) {
  const count = await locator.count();
  assert.ok(count > 0, `${label} should exist.`);
  assert.ok(await locator.first().isVisible(), `${label} should be visible.`);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `Expected no horizontal overflow, got scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}.`
  );
}

async function assertHeroArtDoesNotOverlapText(page: Page) {
  const textBox = await requiredBox(page.getByTestId("about-hero-text"), "hero text");
  const artBox = await requiredBox(page.getByTestId("about-hero-art"), "hero art");
  assert.ok(
    !intersects(textBox, artBox),
    "Hero art should not overlap hero text."
  );
}

async function assertStorySpineDoesNotCutBodyCopy(page: Page) {
  const routeBox = await requiredBox(
    page.getByTestId("about-story-route"),
    "story spine route"
  );
  const bodyCopies = page.getByTestId("about-story-copy");
  const count = await bodyCopies.count();
  assert.ok(count > 0, "Story body copy should exist.");

  for (let index = 0; index < count; index += 1) {
    const copyBox = await requiredBox(
      bodyCopies.nth(index),
      `story body copy ${index + 1}`
    );
    assert.ok(
      !intersects(routeBox, copyBox),
      `Story spine route should not cut through body copy ${index + 1}.`
    );
  }
}

async function assertMessyCardsReadableOnMobile(page: Page) {
  const cards = page.getByTestId("about-messy-card");
  const count = await cards.count();
  assert.ok(count >= 14, "Messy-to-magic cards should include input and output labels.");

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const text = (await card.innerText()).trim();
    assert.ok(text.length > 0, `Messy-to-magic card ${index + 1} should have text.`);
    const box = await requiredBox(card, `messy-to-magic card ${index + 1}`);
    assert.ok(box.width >= 92, `Messy-to-magic card ${index + 1} is too narrow.`);
    const clipState = await card.evaluate((element) => {
      return {
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
    assert.ok(
      clipState.scrollWidth <= clipState.clientWidth + 1,
      `Messy-to-magic card ${index + 1} clips horizontally.`
    );
    assert.ok(
      clipState.scrollHeight <= clipState.clientHeight + 1,
      `Messy-to-magic card ${index + 1} clips vertically.`
    );
  }
}

async function assertRouteProgressUpdates(page: Page) {
  await page.evaluate(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight * 0.42,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(120);
  const progress = await page.locator("[data-about-page]").evaluate((element) => {
    return Number.parseFloat(
      element.style.getPropertyValue("--about-route-progress") || "0"
    );
  });

  assert.ok(
    progress > 0.05,
    `Story route progress should update on scroll; received ${progress}.`
  );
}

async function gotoAbout(page: Page) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await page.goto(`${baseUrl}/about`, {
      waitUntil: "domcontentloaded",
    });
    lastStatus = response?.status() ?? 0;

    try {
      await page.waitForSelector('[data-testid="about-hero-text"]', {
        state: "visible",
        timeout: 15000,
      });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw new Error(
          `About page did not render the hero hook after navigation; last status was ${lastStatus}.`
        );
      }
      await page.waitForTimeout(500);
    }
  }
}

async function run() {
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.addInitScript(() => {
        localStorage.setItem("atp-welcomed", "1");
      });
      await gotoAbout(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `about-${viewport.name}.png`),
      });

      await assertNoHorizontalOverflow(page);
      await assertHeroArtDoesNotOverlapText(page);
      await assertStorySpineDoesNotCutBodyCopy(page);
      await assertRouteProgressUpdates(page);

      if (viewport.width === 390) {
        await assertMessyCardsReadableOnMobile(page);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

run()
  .then(() => {
    console.log("About page visual regression coverage passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
