import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  AFTER_THE_PARKS_INDEXNOW_KEY,
  buildIndexNowPayload,
  getIndexNowKey,
  indexNowEndpoint,
  normalizeChangedUrls,
} from "@/lib/seo/indexNow";
import {
  buildLlmsFullText,
  buildLlmsText,
} from "@/lib/seo/llms";
import {
  HIGH_VALUE_GUIDES,
  validateSeoGuideQualifications,
} from "@/lib/seo/routes";

const baseUrl = "https://aftertheparks.com";

const llms = buildLlmsText(baseUrl);
assert.match(llms, /^# After the Parks/m);
assert.match(llms, /Walt Disney World resort activity planner/i);
assert.match(llms, /https:\/\/aftertheparks\.com\/sitemap\.xml/);
assert.match(llms, /\/disney-world-resort-activity-calendars/);
assert.match(llms, /\/source-and-accuracy-policy/);
assert.match(
  llms,
  /Disney Springs/i,
  "llms.txt should expose the current Disney Springs transportation caveat"
);
assert.match(
  llms,
  /resort stay|dining\/experience reservation/i,
  "llms.txt should not leave AI systems guessing about Disney Springs resort access"
);

const llmsFull = buildLlmsFullText(baseUrl);
assert.match(llmsFull, /Primary product routes/i);
assert.match(llmsFull, /Priority activity explainers/i);
assert.match(llmsFull, /Current transportation caveat/i);
assert.match(llmsFull, /Do not use Disney Springs as a free resort-transfer hub/i);
assert.doesNotMatch(llmsFull, /Research-gated guide creation/i);
assert.doesNotMatch(llmsFull, /Research dossier/i);
assert.doesNotMatch(llmsFull, /Competitor gap analysis/i);
assert.doesNotMatch(llmsFull, /Anti-thin-content checks/i);
assert.doesNotMatch(llmsFull, /Would this page still help if search engines sent zero traffic/i);
assert.doesNotMatch(llmsFull, /No SEO page exists unless it is also a useful product landing page/i);
assert.doesNotMatch(llmsFull, /\/guides\//);
assert.match(llmsFull, /\/resorts/);
assert.match(llmsFull, /\/activities\?free=true|\/activities/);
assert.match(llmsFull, /\/activities\/movies-under-the-stars/);

const normalized = normalizeChangedUrls(baseUrl, [
  "/today",
  "https://aftertheparks.com/tonight",
  "https://example.com/not-ours",
  "/today",
]);
assert.deepEqual(normalized, [
  "https://aftertheparks.com/today",
  "https://aftertheparks.com/tonight",
]);

const payload = buildIndexNowPayload(baseUrl, "abc123", ["/today", "/tonight"]);
assert.deepEqual(payload, {
  host: "aftertheparks.com",
  key: "abc123",
  keyLocation: "https://aftertheparks.com/abc123.txt",
  urlList: [
    "https://aftertheparks.com/today",
    "https://aftertheparks.com/tonight",
  ],
});
assert.equal(indexNowEndpoint(), "https://api.indexnow.org/indexnow");
assert.match(
  AFTER_THE_PARKS_INDEXNOW_KEY,
  /^[a-f0-9]{32}$/,
  "After the Parks should have a stable public IndexNow key"
);
assert.equal(
  getIndexNowKey({ INDEXNOW_KEY: "" }),
  AFTER_THE_PARKS_INDEXNOW_KEY,
  "IndexNow submission should fall back to the hosted public site key"
);
const indexNowKeyPath = `public/${AFTER_THE_PARKS_INDEXNOW_KEY}.txt`;
assert.ok(existsSync(indexNowKeyPath), "IndexNow key file should be hosted from the public root");
assert.equal(
  readFileSync(indexNowKeyPath, "utf8").trim(),
  AFTER_THE_PARKS_INDEXNOW_KEY,
  "IndexNow key file should contain the key exactly"
);

const qualificationIssues = validateSeoGuideQualifications(HIGH_VALUE_GUIDES);
assert.deepEqual(
  qualificationIssues,
  [],
  `high-value guides should pass the SEO page qualification gate: ${qualificationIssues.join("; ")}`
);

console.log("SEO discovery tests passed.");
