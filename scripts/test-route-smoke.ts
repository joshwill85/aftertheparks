import assert from "node:assert/strict";

const baseUrl = process.env.ROUTE_SMOKE_BASE_URL ?? "http://localhost:3000";

const expectedOkRoutes = [
  "/",
  "/activities",
  "/activities?free=true",
  "/activities?category=campfire",
  "/activities?category=poolside",
  "/activities?category=arcade",
  "/activities/campfire",
  "/activities/sorcerers-campfire",
  "/activities/tasteful-artistry-at-disneys-wilderness-lodge",
  "/today",
  "/tonight",
  "/weather",
  "/resorts",
  "/resorts/polynesian-village-resort",
  "/calendar",
  "/plan",
  "/search?q=campfire",
  "/search?q=rainy%20day",
] as const;

async function main() {
  for (const route of expectedOkRoutes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(
      response.status,
      200,
      `${route} should return 200 from ${baseUrl}, got ${response.status}`
    );
  }

  const legacyTonight = await fetch(`${baseUrl}/activities/tonight`, {
    method: "HEAD",
    redirect: "manual",
  });
  assert.equal(
    legacyTonight.status,
    308,
    `/activities/tonight should permanently redirect to /tonight, got ${legacyTonight.status}`
  );
  assert.equal(
    legacyTonight.headers.get("location"),
    "/tonight",
    "/activities/tonight should redirect to /tonight"
  );

  console.log("Route smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
