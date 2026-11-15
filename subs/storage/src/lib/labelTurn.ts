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
