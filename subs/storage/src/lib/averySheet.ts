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
 * Avery 8167 return-address sheet geometry (#716), read from Avery's template PDF:
 * Letter portrait, 4 across x 20 down, 1.75" x 0.5" labels, 80 per sheet. Rows touch (pitchY == labelH),
 * so a vertically misaligned print clips text rather than spilling onto a neighbour: keep a safe inset.
 */
export const AVERY_8167 = {
  pageW: 8.5,
  pageH: 11,
  labelW: 1.75,
  labelH: 0.5,
  cols: 4,
  rows: 20,
  left: 0.3,
  top: 0.5,
  pitchX: 2.0625,
  pitchY: 0.5,
  perPage: 80,
} as const;

/** Which physical stock a print job targets: 6x4 side cards (5889) or 1.75x0.5 lid labels (8167). */
export type LabelKind = 'side' | 'lid';

/**
 * Label orientation (#709). The 5889 stock is only the wide (portrait Letter, 6x4 cards) template, so
 * Tall is not a different sheet: it is the 4x6 layout rotated 90deg onto the same 6x4 card, so the
 * label reads tall once the card is stuck on the tote. `rotation` picks which way it is turned.
 */
export type LabelOrientation = 'wide' | 'tall';
export type LabelRotation = 'cw' | 'ccw';
