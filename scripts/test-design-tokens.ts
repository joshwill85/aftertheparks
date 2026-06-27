import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tokensCss = fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
const globalsCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

const REQUIRED_TOKENS = [
  "--daypart-sunshine-bg",
  "--daypart-afternoon-bg",
  "--daypart-golden-hour-bg",
  "--daypart-starlight-bg",
  "--density-compact-gap",
  "--density-comfortable-gap",
  "--density-editorial-gap",
  "--motion-duration-fast",
  "--motion-duration-standard",
  "--motion-duration-story",
  "--motion-ease-standard",
  "--motion-ease-story",
  "--state-focus-ring",
  "--state-focus-offset",
  "--state-selected-bg",
  "--state-disabled-opacity",
  "--state-loading-sheen",
  "--state-error-bg",
  "--control-height-sm",
  "--control-height-md",
  "--control-height-lg",
  "--space-page-x",
  "--space-section-y",
] as const;

for (const token of REQUIRED_TOKENS) {
  if (!tokensCss.includes(`${token}:`)) {
    throw new Error(`Missing design token ${token}`);
  }
}

const REQUIRED_GLOBAL_USAGE = [
  "--daypart-sunshine-bg",
  "--daypart-afternoon-bg",
  "--daypart-golden-hour-bg",
  "--daypart-starlight-bg",
  "--motion-duration-standard",
  "--motion-ease-standard",
  "--state-focus-ring",
  "--state-focus-offset",
] as const;

for (const token of REQUIRED_GLOBAL_USAGE) {
  if (!globalsCss.includes(`var(${token}`)) {
    throw new Error(`Global styles do not consume ${token}`);
  }
}

console.log("Design token coverage passed.");
