# Membership ID card — specification

Live preview with sample data: `/id-card-design`. Two styles; administrators choose which one is
issued (Admin → Settings → ID card design).

| | Heritage (default) | Signature |
|---|---|---|
| Identity | KAFMAF's existing logo (from the previous card) | Provisional text mark (not a logo) unless a logo is uploaded |
| Colours | Green #006F03 (deep-green gradient), yellow #FFF112, red #CD383A, white | Charcoal #16181D, dark red #9E1B22, gold #B08D4A, warm white (editable) |
| Front | Dark green field with guilloche security lines, framed portrait, yellow accents, tricolour edge | Warm-white body, charcoal header, red angled band |
| Back | Light background, QR inside green viewfinder corners, tricolour edge | Light background, framed QR |

## Format

- ID-1: **85.60 × 53.98 mm**, landscape. Template canvas **856 × 540 CSS px** (1 px = 0.1 mm).
- Safe area: text kept ≥ 3.2 mm from the edges; colour fields bleed to the edge.
- Export: html-to-image renders each side at pixel ratio 3.5 (2996 × 1890 px, ≈ 890 dpi), then jsPDF
  places them in:
  - **Card PDF:** 2 pages at exactly 85.60 × 53.98 mm (page 1 front, page 2 back).
  - **A4 sheet:** both sides at actual size with crop marks, for printing at 100 % scale.
  - PNG front / back.
- Generated in the browser on demand from the approved database record; PDFs are not stored.

## Typography

| Element | Font | Size on canvas | Printed |
|---|---|---|---|
| Name | Barlow Condensed 700, uppercase, auto-fit to 2 lines | 32–52 px | 3.2–5.2 mm |
| Membership number | JetBrains Mono 600 | 25–28 px | 2.5–2.8 mm |
| Dates | Barlow Condensed 700 | 33–34 px | 3.3 mm |
| Labels | Inter 700, tracked uppercase | 11–13 px | ≥ 1.1 mm |
| Body text (back) | Inter | 15.5–17 px | 1.6 mm |

## Dynamic fields (all from `members`)

`full_name` · `membership_number` · `disciplines` · `issue_date` · `expiry_date` (DD/MM/YYYY,
expiry = last valid day) · photo (`photo_path`, private storage) · QR = `VITE_PUBLIC_SITE_URL/verify/<verification_token>` ·
`card_version`. Card-back text comes from settings: validity statement, contact line (only if
published), optional signature area.

## Photograph

4:5 portrait, cropped on upload to 600 × 750 px JPEG (metadata stripped). Heritage 18.2 × 22.8 mm,
Signature 20 × 25 mm.

## QR code

Error correction M; encodes the exact verification URL (64-hex-character token, 244 random bits).
Printed module size > 0.4 mm. `tests/unit/qr.test.ts` decodes a generated code back to the URL.

## Not on the card (deliberately)

Government coat of arms, registration numbers, invented seals, stamps or signatures, religious text,
phone numbers of members, "rank" fields.

## Printing notes

- Print at 100 % scale. For PVC card printers, use the 2-page card PDF.
- Heritage front is full-bleed dark green; if a print shop requires bleed, ask for 2 mm bleed and the
  artwork can be extended.
- Replace the 112 px logo with the original artwork before mass printing.
