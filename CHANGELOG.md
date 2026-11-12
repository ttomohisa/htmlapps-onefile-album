# Changelog

## 1.1.0

- Release temporary image URLs when a damaged album fails to import. Preserve the viewer image when the browser restores the page from its back-forward cache.

- Add a toolbar zoom slider and a blurred-photo background option. Keep all settings reachable by scrolling and close settings on a backdrop click.

- Resize the thumbnail panel by drag or keyboard, label both switch states, and organize Help around creating and opening an album.

- Use a quiet inset focus indicator for the image picker. Give exported albums a neutral charcoal toolbar, a mobile action sheet, and pointer-centered Ctrl + wheel zoom.

- Keep clickable imported-photo thumbnails and filenames visible through steps 2–5, with loading placeholders and a loaded count.
- Simplify stage 5 to filename, size and adjacent save/preview actions, removing nested step numbering and duplicate readiness bars.
- Replace the generated viewer’s eight icon-only toolbar buttons with labeled Play/Pause, Fullscreen and More controls; group secondary actions in an accessible dismissible popover.

- Remove competing export shortcuts before the finish step and use clearer image-quality and album-icon labels. Wait for successful WebP conversion before advancing, and reject stale continuation after input/settings changes.

- Guide first-time users through all five stages: first image loading and album reopening lead to step 2, image-size choices have explicit next actions, and steps 3/4 have visible desktop and mobile continuations. Keep the compact add-image strip and preserve the chosen stage on later additions.
- Apply the requested Japanese heading/lead and add workflow, localization, keyboard focus and queue regressions across all release variants.

- Refine the album editor with flatter surfaces, quieter workflow navigation, clearer typography, and larger mobile actions. Preserve the generated viewer and all editing/export behavior.

- Move build information to the end of Help while preserving existing smartphone visibility.
- Keep the Help header and close button visible while scrolling expanded build information.
- Clarify Japanese and English help by removing internal layout, implementation, and audit commentary while preserving usage guidance and cautions.

## 1.0.4 - 2026-10-10

- Restore usable keyboard focus after saving comments/chapters, removing an image, or clearing an album, preferring the current visible mobile tab for fallback on short screens without changing panels or taking focus from a newer dialog/control.
- Cover loaded-editor action focus, cancellation, unavailable targets, and unchanged five-second Undo data behavior with production-handler regressions.

- Keep the background page in place while Help is open, preserving its existing internal scrolling and close behavior.
- Add Help-only modal scroll contracts across the source and generated HTML variants.

## 1.0.3 - 2026-10-09

- Normalize brand icon backgrounds to #16624f with exact 25% corner radii across SVG assets, header icons, and embedded favicons, preserving existing artwork.
- Add focused brand representation regression checks.

## Unreleased

- Standardize header target-language labels to EN / JA with localized accessible names and tooltips, and synchronize the visible version badge with v1.0.2.

- Add search-aware Home / End navigation to the generated viewer, with editable-field, dialog, composition, and modifier guards and localized help.
- Prevent cancelled touch/pointer gestures from navigating images; reset pinch and remaining-pointer baselines for safe continued interaction.
- Run generated-viewer navigation regressions against source, readable, tracked-root, and restored self-extract variants. Existing saved albums require re-export to receive viewer changes.

- Give HTML export and final preview an owned, immutable image/order/options snapshot and reject stale async completions after editing or source replacement.
- Keep editing available during generation; cancel the outdated request with a localized message and clear obsolete final previews.
- Prevent duplicate starts during confirmation, preserve failure/success status, and clean up preview/download URLs on failure or close.
- Add byte-exact PNG export/import and lifecycle regressions across source and both generated variants; default builds synchronize the tracked root HTML.

## 1.0.1 - 2026-08-25

### Release polish

- Bump the application release to v1.0.1 and refresh Japanese / English release screenshots and README content.
- Align the standalone build metadata with the actual runtime: v1.0.1 ships on the browser-native WebP fallback path without an inactive bundled dependency declaration.

### Generated viewer info panel
- Refined mobile workflow: side-by-side processing choices, bottom next-step actions, cleaner size estimate, and Browser Kitty production links in exported albums.

- Replace the persistent generated-album credit bar with an `i` information button in the viewer toolbar, styled consistently with the other viewer controls.
- Put the Browser Kitty (OneFile Album) editor link, re-edit instructions, offline/privacy note, sharing guidance, and HTML creation time in the information panel.
- Hide dedicated zoom +/- buttons on narrow mobile screens to keep the viewer toolbar from becoming crowded; pinch and double-tap zoom remain available.

### Workflow guidance and generated-album credit

- Add a visible Browser Kitty (OneFile Album) edit credit/link to every generated album so recipients can find the editor.
- Warn before browser back, reload, or tab close while an album is being edited in memory.
- Make “Next: Reduce file size” the primary post-add action and rename the direct export shortcut to “Quick create”.
- Add a clear next-step action from optimization to order / chapters / comments.
- Turn the original-image export hint into a direct link back to step 2.
- Simplify the export stage into file name, size check, then a single finish/save area; hide the unusable preview while WebP optimization is pending.

### Thumbnail / optimization synchronization

- Serialize repeated image additions so thumbnail generation never overlaps across batches.
- Keep WebP optimization disabled while thumbnails are still being prepared.
- If optimization is invoked through a fast tap or programmatic path, wait for the thumbnail queue to finish before starting full-image conversion.
- Prevent image addition while a full-image conversion or export is already running.
- Show “Preparing thumbnails” in the added-images feedback until the queue is fully complete.

### Mobile conversion hardening

- Prefer `OffscreenCanvas.convertToBlob()` for native WebP encoding when available, with regular Canvas as a fallback.
- On memory-constrained/mobile devices, start at up to 4 MP and progressively retry at 3 / 2 / 1.5 / 1 / 0.75 / 0.5 / 0.25 MP.
- Retry the smallest pixel budgets after yielding longer so Android Chrome can release image resources.
- Increase the pause between full-image conversions on memory-constrained devices.
- If every safe WebP attempt is exhausted, preserve only that image as its original bytes instead of failing the whole album.
- Surface the per-image fallback as “元画像で保持 / Kept original” and keep HTML export available.

### Mobile image conversion stability

- Decode thumbnails at thumbnail resolution when dimensions can be read from the image header.
- Removed the high-memory `canvas.toDataURL()` fallback after WebP `toBlob()` failures.
- On memory-constrained/mobile devices, start WebP conversion at up to 6 MP and retry at 4 MP, 3 MP, then 2 MP.
- Explicitly release `ImageBitmap`/Canvas resources and yield between attempts and images.
- Avoid falling back to a full-resolution `<img>` decode when a resized decode was requested.

## 1.0.0 - 2026-08-24

First stable release of OneFile Album.

- Create one self-contained offline HTML album from multiple JPEG / PNG / WebP images.
- Keep original image bytes or optionally optimize images to WebP with resize and quality controls.
- Five-step workflow: Add images, Reduce file size, Order/chapters/comments, Album settings, Create HTML.
- Drag ordering, multi-select group movement, automatic filename / EXIF-date sorting, chapters, comments, and chapter collapse.
- Re-open a saved OneFile Album HTML and restore images, chapters, comments, and album settings for continued editing.
- Final viewer preview before creating the HTML file.
- Generated viewer with thumbnails, previous / next, keyboard and swipe navigation, pinch zoom / pan, fullscreen, slideshow, image extraction, and configurable viewer settings.
- Search generated albums by file name, chapter title, and comment.
- Configurable generated-album favicon using embedded SVG presets or a custom image.
- Generated-size estimation with practical large-file guidance and confirmation for very large outputs.
- Japanese / English UI and completely local processing with no runtime network requests.
