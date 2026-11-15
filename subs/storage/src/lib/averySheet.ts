/**
 * Avery 5889 postcard sheet geometry (#707), read from Avery's own template
 * PDFs (Avery5889RectanglePostcards_wide.pdf, vector card outlines, 72 pt/in).
 *
 * Wide layout: Letter portrait (612 x 792 pt), two 6" x 4" cards stacked.
 *   card 1: x=90pt  top=90pt        size 432 x 288 pt
 *   card 2: x=90pt  top=90+288+36   size 432 x 288 pt
 * i.e. 1.25" left/top/bottom margin, 0.5" gap. Avery also publishes a "tall" template (landscape,
 * 4x6 cards); we do not have that stock, so Tall labels (#709) are rotated onto this wide grid.
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

/**
 * Label orientation (#709). The 5889 stock is only the wide (portrait Letter, 6x4 cards) template, so
 * Tall is not a different sheet: it is the 4x6 layout rotated 90deg onto the same 6x4 card, so the
 * label reads tall once the card is stuck on the tote. `rotation` picks which way it is turned.
 */
export type LabelOrientation = 'wide' | 'tall';
export type LabelRotation = 'cw' | 'ccw';
