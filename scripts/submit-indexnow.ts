import {
  buildIndexNowPayload,
  getIndexNowKey,
  indexNowEndpoint,
  normalizeChangedUrls,
} from "@/lib/seo/indexNow";

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const key = getIndexNowKey();
  const changedUrls = process.argv.slice(2);

  if (!key) {
    throw new Error("INDEXNOW_KEY is required to submit changed URLs.");
  }

  if (changedUrls.length === 0) {
    throw new Error(
      "Pass one or more changed URLs, for example: npm run seo:indexnow -- /today /tonight"
    );
  }

  const normalizedUrls = normalizeChangedUrls(baseUrl, changedUrls);
  if (normalizedUrls.length === 0) {
    throw new Error("No submitted URLs matched the configured site host.");
  }

  const payload = buildIndexNowPayload(baseUrl, key, normalizedUrls);
  const response = await fetch(indexNowEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `IndexNow submission failed with ${response.status}: ${body.slice(0, 500)}`
    );
  }

  console.log(
    `Submitted ${payload.urlList.length} changed URL(s) to IndexNow for ${payload.host}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
