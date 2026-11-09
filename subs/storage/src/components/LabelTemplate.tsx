import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { StorageUnit } from '../config/storageConfig';
import { AVERY_5889 } from '../lib/averySheet';
import { capGroups, groupContents, type LabelItem } from '../lib/labelContents';

/** Card size in inches, from the Avery 5889 template (lib/averySheet.ts). */
export const LABEL_W_IN = AVERY_5889.cardW;
export const LABEL_H_IN = AVERY_5889.cardH;
const MAX_GROUPS = 12;

const SEASON_BAND: Record<string, string> = {
  Halloween: 'bg-orange-500',
  Christmas: 'bg-green-600',
  Shared: 'bg-slate-500',
};

export function unitUrl(id: string): string {
  return `${window.location.origin}/storage/${encodeURIComponent(id)}`;
}

function useQr(text: string): string {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    // Error correction M survives scuffs; margin 0 so the card controls the quiet zone.
    QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 0, width: 360 })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(''));
    return () => {
      live = false;
    };
  }, [text]);
  return src;
}

/** One 6x4 tote label. Pure presentation: unit + contents in, card out. */
export function LabelTemplate({
  unit,
  contents,
  inset = 0,
}: {
  unit: StorageUnit;
  contents: LabelItem[] | null;
  /** Inches pulled in from every card edge so nothing prints over the perforation. */
  inset?: number;
}) {
  const qr = useQr(unitUrl(unit.id));
  const season = String(unit.season ?? ''); // drives the color band only
  const { shown, hidden } = capGroups(groupContents(contents ?? []), MAX_GROUPS);

  return (
    <div
      className="label-card relative bg-white text-black"
      style={{ width: `${LABEL_W_IN}in`, height: `${LABEL_H_IN}in`, padding: `${inset}in` }}
      data-testid={`label-${unit.id}`}
    >
      <div className="flex h-full w-full overflow-hidden">
        <div className={`label-band w-[0.45in] shrink-0 ${SEASON_BAND[season] ?? 'bg-slate-500'}`} />
        <div className="flex min-w-0 flex-1 flex-col py-[0.1in] pl-[0.2in] pr-[0.1in]">
          {/* Fixed header grid: every card puts name, ID and contents at the same height,
              so a row of totes reads as one aligned set regardless of title length. */}
          <div className="flex h-[0.95in] shrink-0 items-start">
            <div className="line-clamp-2 text-[26pt] font-extrabold leading-[1.1]">{unit.short_name}</div>
          </div>
          <div className="h-[0.28in] shrink-0 font-mono text-[12pt] leading-[0.28in]">{unit.id}</div>
          <div className="mt-[0.06in] shrink-0 border-t-2 border-black" />
          <div className="mt-[0.1in] min-h-0 flex-1 overflow-hidden text-[14pt] leading-snug">
            {contents === null ? (
              <span className="text-neutral-500">Loading contents…</span>
            ) : shown.length === 0 ? (
              <span className="text-neutral-500">Empty</span>
            ) : (
              <ul className="columns-2 gap-4">
                {shown.map((g) => (
                  <li key={g.label} className="break-inside-avoid truncate">
                    {g.label}
                    {g.count > 1 && <span className="font-bold"> ×{g.count}</span>}
                  </li>
                ))}
                {hidden > 0 && <li className="break-inside-avoid">+{hidden} more</li>}
              </ul>
            )}
          </div>
        </div>
      <div className="flex w-[1.7in] shrink-0 flex-col items-center justify-center pr-[0.2in]">
        {qr && <img src={qr} alt={`QR for ${unit.id}`} className="h-[1.5in] w-[1.5in]" />}
      </div>
      </div>
    </div>
  );
}
