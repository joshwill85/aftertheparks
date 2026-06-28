import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const iconDir = join(root, "public/weather-icons");
const outPath = join(root, "docs/weather-icons/contact-sheet.png");
const files = readdirSync(iconDir).filter((file) => file.endsWith(".svg")).sort();

mkdirSync(join(root, "docs/weather-icons"), { recursive: true });

const cards = files
  .map((file) => {
    const svg = readFileSync(join(iconDir, file), "utf8");
    const encoded = Buffer.from(svg).toString("base64");
    const label = file.replace(".svg", "");
    return `<figure class="card">
      <img src="data:image/svg+xml;base64,${encoded}" alt="${label}" />
      <figcaption>${label}</figcaption>
    </figure>`;
  })
  .join("");

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        background: #f7f2e8;
        color: #17324d;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        box-sizing: border-box;
        width: 1520px;
        padding: 48px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 38px;
        line-height: 1.1;
      }
      p {
        margin: 0 0 32px;
        color: #5b6671;
        font-size: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 18px;
      }
      .card {
        align-items: center;
        background: #fffaf0;
        border: 1px solid rgba(23, 50, 77, 0.14);
        border-radius: 16px;
        box-shadow: 0 8px 22px rgba(23, 50, 77, 0.08);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 14px;
        height: 184px;
        justify-content: center;
        margin: 0;
      }
      img {
        height: 88px;
        object-fit: contain;
        width: 88px;
      }
      figcaption {
        font-size: 15px;
        font-weight: 750;
        max-width: 92%;
        overflow-wrap: anywhere;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>After the Parks Weather Icons</h1>
      <p>Production SVGs from public/weather-icons, regenerated after the Figma source pass.</p>
      <section class="grid">${cards}</section>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1520, height: 1280 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(outPath);
