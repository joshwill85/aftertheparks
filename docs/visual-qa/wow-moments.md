# Phase 6 Wow Moment QA Inventory

These production hooks translate the PRD's advanced Figma/Codex motion concepts into first-pass CSS/SVG/React affordances. Each one must stay useful, lightweight, responsive, and polished under `prefers-reduced-motion`.

| ID | Route | Surface | Production Hook | Figma Handoff | Reduced Motion | Acceptance Focus |
| --- | --- | --- | --- | --- | --- | --- |
| living_resort_diorama_hero | / | Home hero | Layered shimmer, lantern bloom, and grain sit over the hero image without covering headline or Quick Finder. | Prototype daypart modes, shader fills, and Motion timing before any shader upgrade. | Static atmosphere layers with no shimmer loop. | First viewport remains clear and image-led across mobile, tablet, and desktop. |
| starlight_firefly_route_map | /tonight | Nightfall Timeline | Decorative SVG path glows behind the timeline stops and reinforces the dinner-to-starlight route. | Tune route stroke, selected stop, conflict, and confidence states in Figma Motion. | Static luminous route with no dash animation. | Path never blocks links; mobile becomes a vertical guide. |
| filter_alchemy_board | /activities | Browse filters | Active URL filters become tokens around a compact result-count board with blocked-state copy. | Use variables for token states, result modes, and no-results suggestions. | Tokens are still and labels stay readable. | Long labels wrap safely and result count matches the URL state. |
| folded_map_daybook_transition | global save action | Save button | Direct save action folds the stamp like a tiny paper map before My Plan preview appears. | Prototype fold depth, stamp landing, and daybook tuck with 3D transforms. | Static stamp and normal saved state. | Save is instant, local to the button, and never delays plan state. |
| calendar_time_weather_aurora | /calendar | Calendar density bands | Existing daypart bars gain soft aurora gradients and selected-day story continuity. | Prototype daypart density modes as shader fills and Figma variables. | Bands stay static with preserved contrast. | Day cells keep useful aria labels and remain legible on mobile. |
