import { Ghost, TreePine, Box } from 'lucide-react';
import type { StorageUnit } from '../config/storageConfig';
import { AVERY_8167 } from '../lib/averySheet';
import { SEASON_BAND } from './LabelTemplate';

export const LID_W_IN = AVERY_8167.labelW;
export const LID_H_IN = AVERY_8167.labelH;

const SEASON_CODE: Record<string, string> = { Halloween: 'HAL', Christmas: 'CHR', Shared: 'SHD' };
const SEASON_ICON: Record<string, typeof Ghost> = { Halloween: Ghost, Christmas: TreePine, Shared: Box };

/** `STOR-TOTE-HAL-007` -> `7`. Returns null when the id has no trailing number. */
export function toteNumber(id: string): string | null {
  const m = /-(\d+)$/.exec(id);
  return m ? String(Number(m[1])) : null;
}

/**
 * One 1.75x0.5in tote-lid label (#716). Stack-ID at a glance: season block (color + icon + code, so it still reads on
 * a B&W printer) and a large tote number with the short name beneath. No QR or contents: the 6x4 side label has those.
 */
export function LidLabelTemplate({ unit, inset = 0 }: { unit: StorageUnit; inset?: number }) {
  const season = String(unit.season ?? '');
  const Icon = SEASON_ICON[season] ?? Box;
  const num = toteNumber(unit.id);
  return (
    <div
      className="label-card relative overflow-hidden bg-white text-black"
      style={{ width: `${LID_W_IN}in`, height: `${LID_H_IN}in`, padding: `${inset}in` }}
      data-testid={`label-${unit.id}`}
      data-kind="lid"
    >
      <div className="flex h-full w-full overflow-hidden rounded-[0.04in] border-[1.5pt] border-black">
        <div className={`label-band flex w-[0.5in] shrink-0 flex-col items-center justify-center text-white ${SEASON_BAND[season] ?? 'bg-slate-500'}`}>
          <Icon className="h-[0.2in] w-[0.2in]" strokeWidth={2.5} />
          <div className="text-[7pt] font-extrabold leading-none tracking-wide">{SEASON_CODE[season] ?? '---'}</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-[0.07in]">
          {num ? (
            <>
              <div className="text-[22pt] font-extrabold leading-[0.95]">#{num}</div>
              <div className="truncate text-[7pt] font-semibold leading-tight">{unit.short_name}</div>
            </>
          ) : (
            <div className="line-clamp-2 text-[11pt] font-extrabold leading-tight">{unit.short_name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
