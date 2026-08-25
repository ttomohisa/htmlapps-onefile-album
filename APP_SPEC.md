# OneFile Album — Application Specification

## 1. Purpose

OneFile Album turns multiple local JPEG / PNG / WebP images into one self-contained offline HTML album. The generated file contains both image payloads and a responsive viewer and can be opened directly without a server or network connection.

The application supports two full-image strategies: preserve source image bytes, or re-encode images as WebP to reduce the generated HTML size.

## 2. Product principles

- Local-first and offline-first.
- One generated HTML is the portable deliverable.
- No runtime network access.
- The shortest successful journey is **Add images → Create HTML**; optimization and organization remain optional.
- Keep the export goal visible after images are added.
- Prefer direct-manipulation editing: selection + drag rather than up/down ordering buttons.
- Avoid decoding every full image at once.
- A generated OneFile Album can be loaded back into the editor and revised.

## 3. Main workflow

Desktop exposes five numbered stages. Mobile exposes the same five stages as fixed bottom tabs:

1. **Add images** — selecting images creates thumbnails and makes original bytes immediately exportable. Users may also open a saved OneFile Album HTML for re-editing. After images are ready, the primary continuation is **Next: Reduce file size**, with **Quick create** as the secondary shortcut.
2. **Reduce file size (optional)** — expose WebP optimization as an independent step with BEFORE (original images) → AFTER (images in HTML) size comparison, followed by a clear **Next: Order, chapters & comments** action.
3. **Order, chapters & comments (optional)** — automatic sorting, manual drag ordering, chapter dividers, chapter collapse, and comments.
4. **Album settings (optional)** — album title, generated-viewer display options, and favicon.
5. **Create HTML** — present a simple three-part finish flow: output filename, estimated size, then save. Final viewer preview is secondary and hidden while a pending WebP conversion makes it invalid. If WebP optimization is selected but pending, offer **Optimize & create HTML** as the primary action and clearly label the original-image fallback.

After at least one image exists, a compact current-album summary shows image count and estimated output size and offers direct navigation to optimization or export.

## 4. Functional requirements

### Input and re-editing

- Accept multiple JPEG, PNG, and WebP files.
- Work from `file://` with runtime network disabled.
- Generate a small WebP thumbnail for every source image.
- Serialize thumbnail preparation across repeated file selections; full-image WebP optimization must not start until the thumbnail queue has settled.
- Newly added images are immediately exportable using original bytes after thumbnail preparation finishes.
- Allow a generated OneFile Album HTML to be loaded back into the editor.
- Re-edit import restores embedded images, chapters, comments, album title, viewer options, favicon, and editor settings when present.
- Support the stable v1.0.0 generated-album format.

### Image storage and optimization

- **Keep originals** uses source bytes as the full image payload with no full-image Canvas re-encoding.
- Preserve JPEG / PNG / WebP MIME type and extension for viewer extraction in Keep originals mode.
- **WebP optimization** uses browser-native decoding / Canvas APIs with fallback decoding and safer scaled retries where needed.
- Original size is the default maximum-long-edge option.
- Presets: original, 3840, 2560, 1920, 1280 px.
- Custom maximum long edge accepts integers from 320 through 16384 px and is clamped to that range.
- WebP quality range: 45–95, default 82.
- Preserve aspect ratio when resizing.
- Process full images sequentially and release decoded resources after each item.
- Never overlap thumbnail decoding with full-image WebP conversion; optimization waits for all queued thumbnail work before decoding full images.
- Selecting WebP or changing its settings marks optimization as pending while preserving the ability to export originals after explicit confirmation.

### Ordering, chapters, and comments

- Sort automatically by file name ascending / descending or EXIF capture time ascending / descending.
- Images without readable capture time stay at the end of their applicable group.
- Manual drag sorting can start from the card surface except interactive controls.
- Desktop uses immediate pointer drag; touch uses short long-press activation.
- Mobile single-column sorting uses horizontal insertion markers and Y-position hit testing.
- Edge-auto-scroll while dragging near the viewport top or bottom.
- Multi-selection uses an explicit selection control; selected items can move as one group while preserving relative order.
- Single-image and bulk delete controls use destructive styling; bulk removal requires confirmation.
- Removing all images requires confirmation.
- Card display size is selectable as Small / Medium / Large without changing output image data.
- Support chapter dividers and per-image comments.
- Chapter boundaries remain stable when images cross chapter boundaries; moving a chapter's first image transfers the chapter marker to the next remaining image.
- Dropping an image before the first image of the first chapter makes it part of that first chapter and does not create an extra chapter.
- Chapters can be collapsed / expanded in the editing grid and display the number of contained images.

### Album settings and export

- Editable album title and output filename.
- Output filename is sanitized and always receives `.html`.
- Generated favicon selection from four embedded SVG presets or a custom image normalized to 64×64 PNG.
- Show source bytes, full-image output bytes, reduction / delta, and estimated HTML size.
- Estimate includes Base64 overhead, thumbnails, HTML/CSS/JS, and favicon data.
- For estimates above 250 MB, require confirmation and recommend splitting.
- Provide a final viewer preview using the same generated viewer markup/data as the actual export.

### Generated viewer
- Keep provenance/help information behind a standard **info (i) toolbar button** instead of a persistent credit bar. The info panel links to Browser Kitty (OneFile Album), explains how to re-edit a saved album, notes offline behavior and sharing, and shows the HTML creation time.
- On narrow mobile screens, hide dedicated zoom +/- toolbar buttons because pinch/double-tap remain available, reducing top-bar clutter.

- One-file offline operation with restrictive CSP and `connect-src 'none'`.
- Responsive thumbnail navigation.
- Previous / next buttons and keyboard left/right navigation.
- Touch swipe navigation while not zoomed.
- Zoom buttons, double-click zoom, two-pointer pinch zoom, and one-pointer pan when zoomed.
- Fullscreen hides thumbnail navigation and can auto-hide the top control bar until pointer/touch activity.
- Download / extract the currently displayed full image using the embedded MIME type and extension.
- Keep-originals extraction must be byte-identical to the source full image.
- Slideshow with configurable 2 / 3 / 5 / 8 / 10 second interval and optional looping.
- Viewer settings for file-name visibility, chapter visibility, comment visibility, initial fit / actual-size view, image background, thumbnail size, slideshow UI auto-hide, and fullscreen control-bar auto-hide.
- Viewer preferences use best-effort local browser storage when available.
- Search across file names, chapter titles, and comments.
- While search is active, thumbnail results and previous / next / slideshow navigation are limited to matching images.
- Create full-image Blob URLs lazily only around the current item and revoke stale URLs.

## 5. Data, privacy, and metadata

- Selected files remain in browser memory and are never uploaded by the application.
- Source image bytes are not persisted to localStorage or IndexedDB.
- UI preferences may be stored locally.
- Generated viewer performs no external network request.
- Keep originals preserves source bytes and therefore metadata already present in those bytes.
- WebP optimization re-encodes full images and does not promise preservation of source EXIF / GPS metadata.

## 6. Large-file and memory strategy

- No universal browser HTML-size limit is presented as a guarantee.
- Base64 embedding increases binary image payload text size by roughly one third.
- Product guidance: under 50 MB light; 50–120 MB normal; 120–250 MB caution on phones; above 250 MB split recommended.
- Grid / thumbnail browsing uses low-resolution thumbnails.
- Full image payloads are turned into Blob URLs only around the current image.
- WebP processing runs sequentially and releases temporary bitmap / Canvas resources.

## 7. UX and accessibility

- Mobile-first from 320 px upward.
- Desktop uses a visible five-step journey navigation.
- At widths up to 680 px, mobile uses fixed bottom tabs: Add, Optimize, Organize, Album, Export.
- Only the active mobile workflow panel is displayed.
- After adding files, visibly acknowledge success and point to the fast path and optional next steps.
- Controls have visible labels or accessible names and keyboard focus is visible.
- Selection state is visually obvious and screen-reader accessible.
- Destructive controls are red and use confirmation for bulk / clear actions.
- Motion respects `prefers-reduced-motion`.
- Progress / status uses live regions where appropriate.
- When at least one image is loaded or processing is active, browser back / reload / tab close triggers the browser's native unsaved-work confirmation because the editing session is memory-only.

## 8. Browser target

Current stable desktop and mobile Chromium, Firefox, and Safari. Direct `file://` opening is required. WebP encoding capability is required only for WebP optimization.

## 9. Non-goals

- Cloud albums, accounts, upload / sharing links, or server-side processing.
- HEIC / HEIF decoding in v1.0.1.
- Image retouching, cropping, or annotations.
- Guaranteed animation preservation when WebP optimization is selected.
- Very large archival collections that are better represented by multiple output albums.

## 10. Acceptance criteria

- No third-party runtime dependency is required.
- `dist/index.html` and `dist/index.self-extract.html` are standalone artifacts.
- Generated release HTML contains no unresolved build placeholder or external runtime resource.
- Runtime CSP includes `connect-src 'none'`.
- Supported images can be added, thumbnailled, organized, previewed, and exported without network access.
- Keep originals preserves full-image bytes; WebP mode produces valid WebP payloads.
- Multi-selected cards can move together; mobile drag uses horizontal insertion markers.
- Saved OneFile Album HTML can be loaded back into the editor.
- Chapters can be collapsed in the editor.
- Generated viewer supports search across file names, chapter titles, and comments.
- Final preview uses the generated viewer before export.
- Generated viewer supports previous / next, keyboard navigation, swipe, pinch zoom / pan, fullscreen, slideshow, settings, and image extraction.
- Japanese and English layouts fit at 360 px width.
