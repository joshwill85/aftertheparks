# Price Source Trust

Disney resort recreation PDFs are the primary source for dated resort-calendar activity pricing. Disney official recreation detail pages and menus are primary for evergreen offerings and menu-priced optional supplies. Magical Resort Guide and editorial reports are secondary enrichment only.

## Source Authority

Disney guest-facing PDFs, official recreation pages, resort pages, and menus are primary sources. The Disney recreation finder/index API is discovery-only for public price labels. Magical Resort Guide is secondary enrichment only and cannot override a Disney-free activity.

## Public Price Rules

- `($)` next to a Disney PDF activity title means `Paid`.
- A missing `($)` marker on a PDF that includes the fee legend means `Free`, unless the activity body says fees apply.
- A free activity with optional paid items remains `Free`; optional items are shown separately.
- Disney official detail pages can set `Free` or `Paid` when their text says complimentary, purchase, price, booking, rental, or rate language.
- Disney finder/index `eec-price` facets are not public price evidence for resort recreation pricing.
- Magical Resort Guide can enrich exact amounts only after the Disney activity is matched and already source-backed.
- Third-party sources cannot turn a Disney-free activity into a paid activity.

## Campfire Examples

- Standard resort campfire: `Free` when Disney says marshmallows are complimentary or the title lacks `($)` under a fee legend.
- Standard resort optional kit: Mickey S'mores Kit may show as `Usually around $7 plus tax` only with reviewed secondary evidence or Disney confirmation.
- Fort Wilderness / Chip 'n' Dale's Campfire Sing-A-Long: `Free`; optional Fort S'Mores Kit can show `$9.99` when sourced from the Disney Chuck Wagon menu.
- Movie Under the Stars: `Free`.

## Paid Examples

- Arts & Crafts ($): `Paid`.
- Arcade ($): `Paid`.
- Rental, reservation, booking, or rate language from a Disney detail page: `Paid` when source-backed.

## Non-Authoritative Source

The Disney recreation finder/index API may include broad `eec-price` facets such as high dollar ranges. Those facets are used only for discovery/debugging and must not set public activity price state or amounts.
