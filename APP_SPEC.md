# OneFile Album — Application Specification

## 1. Purpose

OneFile Album turns multiple local JPEG / PNG / WebP images into one self-contained offline HTML album. The generated file contains both image payloads and a responsive viewer and can be opened directly without a server or network connection.

The application supports two full-image strategies: preserve source image bytes, or re-encode images as WebP to reduce the generated HTML size.

## 2. Product principles

- Local-first and offline-first.
- One generated HTML is the portable deliverable.
- No runtime network access.
- The default journey is **Add images → Choose image size → Check photo order → Album settings → Create HTML**. Image conversion and editing remain optional; keeping defaults still follows the visible sequence.
- Keep the export goal visible after images are added.
- Prefer direct-manipulation editing: selection + drag rather than up/down ordering buttons.
- Avoid decoding every full image at once.
- A generated OneFile Album can be loaded back into the editor and revised.

## 3. Main workflow

Desktop and mobile expose one selected work area at a time. Desktop uses five journey buttons; mobile uses fixed bottom tabs. The add-image area remains available above the selected work area:

1. **Add images** — selecting images creates thumbnails and makes original bytes immediately exportable. Users may also open a saved OneFile Album HTML for re-editing. After the first thumbnail queue settles successfully, open step 2 (Reduce file size) if the user is still on Add. Do not redirect later additions or override a stage the user deliberately selected during preparation. Shrink the drop zone to a compact 48 px minimum input, hide its illustration/helper text/format chips, and collapse the introduction. Keep a short translated Add images label and the ability to drop or select more files. Add feedback continues to step 2. Do not place export shortcuts in Add, the photo header or the current-album summary. The default path visits all five stages; conversion and edits stay optional.
2. **Reduce file size (optional)** — expose WebP optimization as an independent step with BEFORE (original images) → AFTER (images in HTML) size comparison, followed by a primary action reflecting the selected mode: **Continue with originals** or **Optimize & continue**. Originals continue immediately if ready. Pending WebP conversion runs before proceeding; failure, replaced input, changed settings or a deliberately selected different stage must not redirect. A secondary **Optimize and check size** action lets users inspect the size comparison before continuing.
3. **Order, chapters & comments (optional)** — automatic sorting, manual drag ordering, chapter dividers, chapter collapse, and comments.
4. **Album settings (optional)** — album title, generated-viewer display options, and favicon.
5. **Create HTML** — present the output filename and estimated size, followed by adjacent **Save HTML** and **Preview album** actions. Do not nest numbered 1/2/3 steps inside stage 5. Final viewer preview is secondary and hidden while a pending WebP conversion makes it invalid. If WebP optimization is selected but pending, offer **Optimize & create HTML** as the primary action and clearly label the original-image fallback.

After at least one image exists, a persistent imported-photo strip shows the loaded count, filenames and up to twelve real thumbnails above the current work area. Keep it visible in steps 2–5; preparing images have named placeholders and cannot open a missing preview. Each ready thumbnail opens the image preview. Show a remaining count for larger albums. Avoid duplicate current-album and export-ready summary bars. Stage actions move keyboard focus into the selected work area; tab navigation keeps focus on the visible tab. Clearing/removing all images restores the full drop zone and introductory copy without removing Undo.

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
- Export and final preview capture their own image order, Blob references, metadata, options, and sanitized filename before asynchronous work or confirmation.
- Editing remains available during generation. An image, ordering, chapter/comment, title, filename, language, processing setting, or favicon change cancels the outdated request; new images or a replacement album also cancel it. Do not download, open a stale preview, or show success for that request.
- Export/preview share one busy owner, including confirmation dialogs. A cancelled or failed owner releases only its own state, and cannot finish or unlock a newer request.
- Reading a replacement album blocks new export/preview and optimization attempts until it settles. A newer replacement or source-generation change rejects the older import; an old import cannot release a newer import’s pending state.
- Closing a final preview, editing its album, replacing the source, or leaving the page clears its iframe and revokes its Blob URL. Failure leaves a visible message and allows retry.

### Generated viewer
- Keep provenance/help information under **More → About this album** instead of a persistent credit bar or a separate always-visible info button. The info panel links to Browser Kitty (OneFile Album), explains how to re-edit a saved album, notes offline behavior and sharing, and shows the HTML creation time.
- Keep three toolbar controls with accessible names: **Play/Pause**, **Fullscreen/Exit fullscreen**, and **More**. Put zoom out/in, search, save current image, settings and album info in the More popover on all screen sizes. Preserve pinch/double-tap and keyboard zoom.
- The More popover closes on outside click, focus leaving it, Escape and resize. Escape restores focus to More. Search and dialogs receive focus appropriately; auto-hide must not conceal open controls. Suppress album navigation shortcuts while the menu is open. Playback labels and pressed state track actual playback. Use a neutral charcoal toolbar with flat controls, and present More at the bottom on narrow screens with 48 px action rows and safe-area padding.

- One-file offline operation with restrictive CSP and `connect-src 'none'`.
- Responsive thumbnail navigation.
- Previous / next buttons and keyboard left/right navigation. Unmodified Home / End jumps to the first / last image in the current search results (or whole album without a search).
- Home / End ignores editable controls/contenteditable, open settings/info dialogs, composition, modifiers, and already-handled events. No results is a no-op; a singleton or already-selected boundary preserves zoom/pan. Actual moves use the normal viewer update path and retain the running slideshow.
- Viewer keyboard help is available in Japanese and English in the info panel. Previously exported albums keep their embedded viewer until re-imported and exported again.
- Touch swipe navigation while not zoomed. A cancelled pointer cleans up gesture state without changing images, resets pinch geometry, and re-bases a remaining pointer; a completed swipe retains its existing behavior.
- On wider screens, a focusable divider resizes the thumbnail panel by drag or arrow keys. Keep the preferred width per album and limit it to half of the available width. On narrow screens the thumbnails stay below the photo. The settings switches show explicit On/Off text and expose their state to assistive technology. Settings scroll to the last item and close on a backdrop click. The background can use a blurred copy of the current photo.
- Zoom buttons, double-click zoom, two-pointer pinch zoom, and one-pointer pan when zoomed. The toolbar slider controls zoom and reflects other zoom actions. Ctrl + wheel over the image stage zooms around the pointer. Plain wheel scroll remains available.
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

- Header language switching shows the target language as `EN` in Japanese and `JA` in English, with localized aria-label/title (`英語に切り替え` / `Switch to Japanese`). The visible `vX.Y.Z` badge matches `app.config.json`; privacy remains `完全ローカル処理` / `Fully local processing`.

- Mobile-first from 320 px upward.
- Desktop uses a visible five-step journey navigation.
- At widths up to 680 px, mobile uses fixed bottom tabs: Add, Optimize, Organize, Album, Export.
- Only the active mobile workflow panel is displayed.
- After adding files, visibly acknowledge success and point to the fast path and optional next steps.
- Controls have visible labels or accessible names and keyboard focus is visible.
- Saving a comment or an edited chapter restores focus to the corresponding rebuilt action when visible. Per-image removal tries the next surviving image action, then a preceding one. Clear and unavailable item actions prefer the currently selected visible mobile tab, then a visible image file input; this does not change workflow panels. Normal native focus may scroll the destination into view.
- Focus repair runs only for the initiating action, skips hidden/disconnected/disabled/inert targets, and preserves a newer modal or usable focus owner. Native dialog cancellation and Escape behavior remain unchanged; per-image removal and Clear retain their existing five-second Undo data behavior.
- Selection state is visually obvious and screen-reader accessible.
- Destructive controls are red and use confirmation for bulk / clear actions.
- Motion respects `prefers-reduced-motion`.
- Progress / status uses live regions where appropriate.
- When at least one image is loaded or processing is active, browser back / reload / tab close triggers the browser's native unsaved-work confirmation because the editing session is memory-only.

## 8. Browser target

Current stable desktop and mobile Chromium, Firefox, and Safari. Direct `file://` opening is required. WebP encoding capability is required only for WebP optimization.

## 9. Non-goals

- Cloud albums, accounts, upload / sharing links, or server-side processing.
- HEIC / HEIF decoding in v1.0.3.
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

## Brand icon consistency

- Brand backgrounds use #16624f with corner radii equal to exactly 25% of each background axis. Preserve foreground artwork, placement, and existing canvas padding across SVG assets, app headers, and embedded favicons.

### Help scrolling

Opening modal Help locks background page scrolling. Its existing scrollable body, close controls and focus restoration remain available; closing Help restores normal page scrolling.

## Build information placement

Keep existing build metadata at the very end of How to use & Notes, not the main page. Preserve the existing smartphone footer breakpoint and any existing mobile build hiding. Native disclosure keyboard activation must not dismiss Help.

## Editor visual refinement

- Preserve the green Browser Kitty identity and light-only editor. Use quiet dividers and spacing instead of decorative gradients, overlapping card shadows, and icon tiles.
- Editor text has an 11 px minimum across desktop, tablet and smartphone breakpoints; primary descriptions use 12–14 px.
- The image drop area shows visible keyboard focus. Header actions and mobile continuation, re-edit and selection actions have a minimum 44 px height.
- Preserve all five workflow stages, source and export ownership, translations, reduced-motion support and generated viewer behavior.

### Requested Japanese copy

- Heading: 画像を1つの持ち運べるHTMLアルバムに
- Lead: 複数画像をビューアごと1つの自己完結HTMLにまとめます

### Guided first use

- First image loading and saved-album reopening both lead to step 2; never automatically skip it. Later image additions preserve the selected stage.
- Step 3 continues to album settings, and step 4 continues to export, with visible forward actions at desktop and mobile widths. Mobile tabs show the same 1–5 numbering.
- Keep one primary forward action per stage. Explain image-size choices and album icons in familiar language; advanced format details stay in Help.

### Loaded-photo reassurance and saving

- The loaded-photo strip is independent of step-1 continuation feedback; never hide it when moving automatically to step 2. Keep the input compact.
- In step 5, describe the final action as Save HTML and group the preview next to it. Keep pending-WebP and large-file warnings and filename editing intact.
