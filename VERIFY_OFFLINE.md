# Offline verification

Verify both `dist/index.html` and `dist/index.self-extract.html` with the network disabled.

1. Open the file directly with `file://`.
2. Confirm the UI loads, the top-left album icon matches `assets/favicon.svg`, and language switching works.
3. Add at least three local JPEG/PNG/WebP images. Confirm the post-add feedback shows the count, recent thumbnails, and a clear next-step action.
4. Confirm the image list has a six-dot drag handle, a selection control, and a red delete button on each card. Confirm there are no up/down ordering buttons.
5. Select multiple images and drag one selected image by its handle. Confirm the selected set moves as a group while keeping its internal order.
6. Use bulk delete and Undo and confirm the selected images are restored.
7. Choose **Keep originals / そのまま入れる**. Confirm WebP-only size/quality controls are hidden and prepare the images.
8. Generate a viewer HTML, download/extract a current image from it, and compare the extracted bytes with the source file. They should be identical in Keep originals mode.
9. Choose **Make lighter with WebP / WebPで軽量化**. Confirm maximum long edge defaults to **Original size**. Select **Custom**, try values outside 320-16384 px, and confirm they are normalized into the allowed range.
10. Prepare images in WebP mode and confirm per-image sizes and totals update. Change WebP settings and confirm prepared results are invalidated until prepared again.
11. Confirm the generated-HTML favicon picker exposes four SVG presets. Add a custom raster/SVG image and confirm a preview appears.
12. Edit the output filename and generate the viewer HTML.
13. Open the generated viewer with the network still disabled and confirm the selected favicon appears.
14. Confirm thumbnails, previous/next, keyboard navigation, swipe when unzoomed, zoom controls, and slideshow.
15. On a touch device, pinch the main image with two fingers to zoom and then pan with one finger.
16. Enter fullscreen and confirm the thumbnail sidebar is hidden. Exit fullscreen and confirm it returns.
17. Use the viewer download button. In Keep originals mode the source extension is retained; in WebP mode the output is `.webp`.
18. In developer tools, confirm there are no external network requests and the CSP keeps `connect-src 'none'`.
