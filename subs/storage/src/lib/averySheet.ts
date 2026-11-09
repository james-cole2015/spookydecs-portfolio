/**
 * Avery 5889 postcard sheet geometry (#707), read from Avery's own template
 * PDFs (Avery5889RectanglePostcards_wide.pdf, vector card outlines, 72 pt/in).
 *
 * Wide layout: Letter portrait (612 x 792 pt), two 6" x 4" cards stacked.
 *   card 1: x=90pt  top=90pt        size 432 x 288 pt
 *   card 2: x=90pt  top=90+288+36   size 432 x 288 pt
 * i.e. 1.25" left/top/bottom margin, 0.5" gap. The "tall" template is the same
 * grid rotated (Letter landscape, two 4" x 6" cards side by side).
 */
export const AVERY_5889 = {
  pageW: 8.5,
  pageH: 11,
  cardW: 6,
  cardH: 4,
  left: 1.25,
  top: 1.25,
  gap: 0.5,
  perPage: 2,
} as const;
