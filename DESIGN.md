# OneFile Album design

The editor is a light, local photo tool. Photos and the next action should carry attention. Preserve the existing Browser Kitty green (#16624f), brand artwork, system fonts and five-stage workflow.

## Refinement direction

Keep the Browser Kitty identity and the product features; simplify the workflow as described below. Remove decorative gradients, soft shadows on nested containers and redundant icon tiles. Workflow navigation uses a thin active underline. Panels use a single border, generous internal spacing and 12 px corners. Primary actions retain solid green; optional actions remain secondary.

Use 19 px section headings, 13–14 px descriptions, 12 px supporting copy and an 11 px minimum in the editor. Keep numeric size comparisons tabular. Preserve warning/danger colors, selected states, focus, disabled states and reduced motion. Mobile tabs remain fixed with safe-area padding. Header and key mobile actions have at least 44 px height.

## Scope and validation

The editor stylesheet, workflow navigation and localized copy change. Keep image processing and export ownership intact; simplify the emitted viewer controls while preserving their capabilities. Single-file/offline constraints remain binding. Run scripts/check-repository.ps1 after rebuilding.

The initial Impeccable source scan flagged small editor text, which this refinement raises to 11 px or more. Its other findings include dynamic images without initial src, generated-viewer styling, placeholder em dashes and a heuristic hierarchy warning. Do not replace dynamic image binding or remove functional selection indicators to satisfy these heuristics.

The committed screenshots predate this refinement. Local file navigation was blocked by the browser tool policy in this session; refreshed screenshots, responsive visual QA, touch and keyboard interaction in a real browser remain to be verified.

## Guided creation workflow

The first-time user follows 1 Add → 2 Image size → 3 Photo order → 4 Album settings → 5 Save. Show one selected work area at a time; keep the compact image input available after images exist. The first thumbnail queue and reopening a saved album both lead to step 2, never step 3. Later image additions preserve the selected stage.

In step 2, explain the unchanged-quality choice and the smaller-file choice in plain language. Keep originals as the default. The primary button says Continue with originals, Optimize & continue, or Next according to the current state. Conversion must finish successfully before proceeding, without stealing the stage after a source/settings change or explicit navigation. The secondary size-check action is available only for WebP.

Do not compete with the sequence using export shortcuts in Add, the photo header or the current-album summary. Steps 3 and 4 always expose Next at desktop and mobile widths. Preserve numbered navigation for intentional revisits. Normal navigation actions focus the selected heading; automatic image preparation leaves focus on the visible file input.

Navigation state comes exclusively from the selected stage, never scroll position. Conversion, clear/Undo, image editing and generated-viewer capabilities remain intact.

## Visible imported photos

Keep a strip of real thumbnails and filenames above the selected stage, with the loaded count and a named preparation placeholder for each not-yet-ready image. The first twelve items are shown, with a remaining count for larger albums. A ready photo opens the existing image preview. This proof stays visible through steps 2–5 and is independent of Add navigation feedback. It replaces duplicate current-album/readiness bars; the drop area itself stays compact.

## Saving and viewing

Stage 5 shows filename and estimated size without nested step numbers. Save HTML and Preview album sit together; retain pending-conversion warnings and filename controls. The generated album uses a neutral charcoal palette and a flat toolbar. Play/Pause has a short desktop label. Fullscreen and More use familiar icons with accessible names, and compact screens use 44 px icon targets for all three. The More panel sits at the bottom on narrow screens. Reuse the compact popover behavior for zoom, search, image saving, settings and info. Preserve outside-click/Escape/resize dismissal and focus restoration, and keep auto-hide from concealing an open menu or dialog.
