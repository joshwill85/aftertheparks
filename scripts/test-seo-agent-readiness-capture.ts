import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { AGENT_READINESS_CHECKS } from "@/lib/seo/measurement";
import * as captureModule from "@/lib/seo/agentReadinessCapture";

const capture = captureModule as Record<string, unknown>;
const captureAgentReadinessEvidenceForHtml = capture.captureAgentReadinessEvidenceForHtml as
  | undefined
  | ((input: {
      route: string;
      html: string;
      status?: number;
      checkedAt?: string;
      tool?: string;
    }) => Array<Record<string, unknown>>);
const renderAgentReadinessEvidenceJsonl = capture.renderAgentReadinessEvidenceJsonl as
  | undefined
  | ((records: Array<Record<string, unknown>>) => string);

assert.equal(
  typeof captureAgentReadinessEvidenceForHtml,
  "function",
  "captureAgentReadinessEvidenceForHtml helper should exist"
);
assert.equal(
  typeof renderAgentReadinessEvidenceJsonl,
  "function",
  "renderAgentReadinessEvidenceJsonl helper should exist"
);

if (captureAgentReadinessEvidenceForHtml && renderAgentReadinessEvidenceJsonl) {
  const validHtml = `<!doctype html>
    <html>
      <head>
        <title>Things to Do Without a Park Ticket</title>
        <link rel="canonical" href="https://aftertheparks.com/resorts?no_ticket_friendly=true" />
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Things to Do Without a Park Ticket"}</script>
      </head>
      <body>
        <nav aria-label="Breadcrumb"><a href="/resorts">Resorts</a></nav>
        <main>
          <h1>Things to Do at Disney World Without a Park Ticket</h1>
          <section>
            <h2>Current answer</h2>
            <p>Today you can plan resort activities, dining, and Disney Springs time without entering a park.</p>
            <p>Do not use Disney Springs as a free way to get to Disney resort hotels. Use a resort stay plus a dining/experience reservation when that access rule applies.</p>
          </section>
          <section>
            <h2>Source and freshness</h2>
            <p>Last verified June 27, 2026. Source and accuracy policy applies.</p>
          </section>
          <button aria-label="Open filters">Filters</button>
          <a href="/today">See activities today</a>
          <details><summary>Transportation notes</summary><p>Access rules can change.</p></details>
        </main>
      </body>
    </html>`;

  const records = captureAgentReadinessEvidenceForHtml({
    route: "/resorts?no_ticket_friendly=true",
    html: validHtml,
    status: 200,
    checkedAt: "2026-06-27T18:00:00Z",
    tool: "HTML agent-readiness capture",
  });

  assert.equal(
    records.length,
    AGENT_READINESS_CHECKS.length,
    "capture should emit one record for each agent-readiness check"
  );
  assert.ok(
    records.every((record) => record.route === "/resorts?no_ticket_friendly=true"),
    "capture should preserve the route on every record"
  );
  assert.ok(
    records.every((record) => record.checkedAt === "2026-06-27T18:00:00Z"),
    "capture should preserve the evidence timestamp on every record"
  );
  assert.ok(records.every((record) => record.passed === true), "valid HTML should pass all checks");
  assert.ok(
    records.some(
      (record) =>
        record.check === "serverRenderedPrimaryAnswer" &&
        /Disney Springs|resort stay|dining\/experience reservation/i.test(String(record.evidence))
    ),
    "Disney Springs routes should preserve the access caveat in server-rendered evidence"
  );

  const jsonl = renderAgentReadinessEvidenceJsonl(records);
  assert.equal(jsonl.split(/\n/).length, AGENT_READINESS_CHECKS.length);
  assert.match(jsonl, /"check":"accessibilityTree"/);
  assert.doesNotMatch(jsonl, /authorization|cookie|secret/i);

  const brokenRecords = captureAgentReadinessEvidenceForHtml({
    route: "/today",
    html: "<html><body><main><p>Thin page</p></main></body></html>",
    status: 200,
    checkedAt: "2026-06-27T18:05:00Z",
  });
  assert.ok(
    brokenRecords.some(
      (record) => record.check === "stableHeadings" && record.passed === false
    ),
    "capture should fail stable heading evidence when heading structure is missing"
  );
  assert.ok(
    brokenRecords.some(
      (record) => record.check === "canonicalAndStructuredDataPresent" && record.passed === false
    ),
    "capture should fail canonical/structured-data evidence when canonical or JSON-LD is missing"
  );
}

const scriptSource = readFileSync("scripts/capture-agent-readiness-evidence.ts", "utf8");
assert.match(scriptSource, /captureAgentReadinessEvidenceForHtml/);
assert.match(scriptSource, /renderAgentReadinessEvidenceJsonl/);
assert.match(scriptSource, /fetch/);

const tonightHeroSource = readFileSync("components/tonight/TonightHero.tsx", "utf8");
assert.doesNotMatch(
  tonightHeroSource,
  /<h1\b/,
  "TonightHero is nested below the page-level Hero and should not create a second H1"
);
assert.match(tonightHeroSource, /<h2\b/, "TonightHero should keep a visible section heading");

for (const file of ["app/page.tsx", "app/activities/page.tsx", "app/resorts/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /Quick answer/i, `${file} should not restore the removed quick-answer section`);
}

for (const file of ["app/page.tsx", "app/resorts/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  const freshnessComponentSource = readFileSync("components/seo/FreshnessFacts.tsx", "utf8");
  assert.match(
    source,
    /Source and freshness|FreshnessFacts/i,
    `${file} should expose a visible source/freshness section`
  );
  assert.match(
    `${source}\n${freshnessComponentSource}`,
    /Last verified|lastVerified/i,
    `${file} should expose last-verified evidence`
  );
  assert.match(
    `${source}\n${freshnessComponentSource}`,
    /source-and-accuracy-policy/,
    `${file} should link to the source and accuracy policy`
  );
}

console.log("SEO agent readiness capture tests passed.");
