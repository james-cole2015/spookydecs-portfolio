import type { LabelOrientation, LabelRotation } from './averySheet';

/** How a side label sits on the 6x4 card: as-is, or turned 90deg right/left (tall). One rotate button cycles these. */
export type LabelTurn = 'wide' | 'tall-cw' | 'tall-ccw';

const ORDER: LabelTurn[] = ['wide', 'tall-cw', 'tall-ccw'];

export const nextTurn = (t: LabelTurn): LabelTurn => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];

export const turnProps = (t: LabelTurn): { orientation: LabelOrientation; rotation: LabelRotation } => ({
  orientation: t === 'wide' ? 'wide' : 'tall',
  rotation: t === 'tall-ccw' ? 'ccw' : 'cw',
});

export const TURN_LABEL: Record<LabelTurn, string> = {
  wide: 'Wide (6×4)',
  'tall-cw': 'Tall · turned right',
  'tall-ccw': 'Tall · turned left',
};

/** A card position holding a tote's label and how that label is turned; null = blank card. */
export type Slot = { id: string; turn: LabelTurn } | null;

/** Saved form: a plain id means wide (so queues saved before per-label turns still load); turned labels carry a suffix. */
export const encodeSlot = (s: NonNullable<Slot>): string => (s.turn === 'wide' ? s.id : `${s.id}|${s.turn}`);

export function decodeSlot(raw: string): NonNullable<Slot> {
  const [id, t] = raw.split('|');
  return { id, turn: t === 'tall-cw' || t === 'tall-ccw' ? t : 'wide' };
}
