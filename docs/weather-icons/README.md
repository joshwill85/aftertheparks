# After the Parks Weather Icons

Editable Figma source:

https://www.figma.com/design/OAlEDO2CaRMDGbNt8kdaLV

Production source files live in `public/weather-icons`.

The SVGs are generated from `scripts/generate-weather-icons.mjs`, with a source
manifest written to `data/weather/after-the-parks-weather-icons.json`.

Preview artifacts:

- `docs/weather-icons/contact-sheet.png`
- `docs/weather-icons/figma-source-board.png`

Regression guard:

- `scripts/test-weather-icon-distinctness.ts` rejects duplicated or overly
  similar icon geometry, monochrome placeholder icons, and missing motion-safe
  source metadata.
