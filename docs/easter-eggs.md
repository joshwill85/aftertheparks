# Easter Egg Register — After the Parks

**Status:** Pending legal/trademark review before public launch.

**Guardrails:** No Hidden Mickey references, mouse-ear geometry, character silhouettes, Disney fonts, or official map styles. Field-note serials (71, 82, 89, 98) require explicit approval.

| ID | Trigger | Component | Notes |
|----|---------|-----------|-------|
| E1 | Save activity to plan | `components/magic/SaveStamp.tsx` | Orange-blossom wax seal animation |
| E2 | Evening/late daypart 20+ min | `components/magic/Fireflies.tsx` | Canvas firefly particles in footer |
| E3 | Pull-to-refresh on Today | `components/magic/PalmRefresh.tsx` | Palm frond SVG wipe |
| E4 | Tap homepage hero 7× | `components/magic/LagoonHeroEasterEgg.tsx` | Reveals serial `71` briefly; console lore |
| E5 | Plan has 3+ items | `components/atlas/PlanPageClient.tsx` | Share button lantern glow |
| E6 | Search query contains "starlight" | `components/magic/StarlightSearchEffect.tsx` | Extra stars in header |
| E7 | 404 page | `components/magic/FoldedMap404.tsx` | Folded-map illustration; generic coordinates |
| E8 | Verification badge hover | `components/atlas/FreshnessBadge.tsx` | "Porch light's on" tooltip |
| E9 | First visit | `components/magic/FirstVisitWelcome.tsx` | localStorage welcome toast |
| E10 | Polynesian resort detail | Reserved — ambient wave on user gesture | Not yet implemented; off by default |

**Feature flag:** `NEXT_PUBLIC_EASTER_EGGS=true` enables interactive eggs.

**Review checklist:**
- [ ] Trademark counsel approves "After the Parks" and all egg copy
- [ ] Serial numbers 71/82/89/98 cleared or removed
- [ ] No Disney IP in visuals, audio, or text
- [ ] Reduced-motion path verified for all animations
