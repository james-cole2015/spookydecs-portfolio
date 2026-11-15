import { describe, it, expect } from 'vitest';
import { nextTurn, turnProps, encodeSlot, decodeSlot } from '../../src/lib/labelTurn';

describe('labelTurn', () => {
  it('cycles wide -> tall right -> tall left -> wide', () => {
    expect(nextTurn('wide')).toBe('tall-cw');
    expect(nextTurn('tall-cw')).toBe('tall-ccw');
    expect(nextTurn('tall-ccw')).toBe('wide');
  });

  it('maps a turn to label orientation and rotation', () => {
    expect(turnProps('wide').orientation).toBe('wide');
    expect(turnProps('tall-cw')).toEqual({ orientation: 'tall', rotation: 'cw' });
    expect(turnProps('tall-ccw')).toEqual({ orientation: 'tall', rotation: 'ccw' });
  });

  it('round-trips slots, and reads a plain id (an older saved queue) as wide', () => {
    for (const turn of ['wide', 'tall-cw', 'tall-ccw'] as const) {
      expect(decodeSlot(encodeSlot({ id: 'STOR-TOTE-HAL-007', turn }))).toEqual({ id: 'STOR-TOTE-HAL-007', turn });
    }
    expect(encodeSlot({ id: 'A', turn: 'wide' })).toBe('A');
    expect(decodeSlot('A')).toEqual({ id: 'A', turn: 'wide' });
    expect(decodeSlot('A|bogus')).toEqual({ id: 'A', turn: 'wide' });
  });
});
