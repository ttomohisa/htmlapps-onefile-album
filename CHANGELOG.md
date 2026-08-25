# Changelog

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
