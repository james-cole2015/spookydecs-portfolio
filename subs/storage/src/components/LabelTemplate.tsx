import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { StorageUnit } from '../config/storageConfig';
import { AVERY_5889, type LabelOrientation, type LabelRotation } from '../lib/averySheet';
import { capGroups, groupContents, type LabelItem } from '../lib/labelContents';

/** Card size in inches, from the Avery 5889 template (lib/averySheet.ts). */
export const LABEL_W_IN = AVERY_5889.cardW;
export const LABEL_H_IN = AVERY_5889.cardH;
const MAX_GROUPS = 12;
const PRINT_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
  orientation = 'wide',
  rotation = 'cw',
}: {
  unit: StorageUnit;
  contents: LabelItem[] | null;
  /** Inches pulled in from every card edge so nothing prints over the perforation. */
  inset?: number;
  /** Wide = 6x4 as-is; Tall = the 4x6 layout rotated onto the same 6x4 card, so it reads tall once stuck on the tote (#709). */
  orientation?: LabelOrientation;
  /** Which way Tall is turned: cw puts the label's top at the card's right edge. */
  rotation?: LabelRotation;
}) {
  const qr = useQr(unitUrl(unit.id));
  const season = String(unit.season ?? ''); // drives the color band only
  // Prefer the live contents list; fall back to the unit's own count while it loads.
  const itemCount = contents ? contents.length : typeof unit.contents_count === 'number' ? unit.contents_count : null;
  // Printed date lets you spot a stale label; the QR always resolves to live data.
  const printed = PRINT_DATE.format(new Date());
  const { shown, hidden } = capGroups(groupContents(contents ?? []), MAX_GROUPS);

  const counts = [itemCount === null ? null : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, unit.location ? String(unit.location) : null]
    .filter(Boolean)
    .join(' · ');

  if (orientation === 'tall') {
    const tallGroups = capGroups(groupContents(contents ?? []), 16);
    // The stock is only ever 6x4. Lay the label out 4x6, then turn it 90deg inside the 6x4 card.
    const turn = rotation === 'cw' ? 'translateX(6in) rotate(90deg)' : 'translateY(4in) rotate(-90deg)';
    return (
      <div
        className="label-card relative overflow-hidden bg-white text-black"
        style={{ width: `${LABEL_W_IN}in`, height: `${LABEL_H_IN}in` }}
        data-testid={`label-${unit.id}`}
        data-orientation="tall"
      >
       <div className="absolute left-0 top-0 bg-white" style={{ width: '4in', height: '6in', padding: `${inset}in`, transformOrigin: 'top left', transform: turn }}>
        <div className="flex h-full w-full overflow-hidden">
          <div className={`label-band w-[0.4in] shrink-0 ${SEASON_BAND[season] ?? 'bg-slate-500'}`} />
          <div className="flex min-w-0 flex-1 flex-col py-[0.1in] pl-[0.18in] pr-[0.1in]">
            {/* Fixed header grid, same idea as wide: name / ID / count / divider sit at fixed heights. */}
            <div className="flex h-[1.35in] shrink-0 items-start">
              <div className="line-clamp-3 break-words text-[24pt] font-extrabold leading-[1.1]">{unit.short_name}</div>
            </div>
            <div className="h-[0.28in] shrink-0 font-mono text-[12pt] leading-[0.28in]">{unit.id}</div>
            <div className="h-[0.24in] shrink-0 truncate text-[11pt] leading-[0.24in] text-neutral-700">{counts}</div>
            <div className="mt-[0.06in] shrink-0 border-t-2 border-black" />
            <div className="mt-[0.1in] min-h-0 flex-1 overflow-hidden text-[14pt] leading-snug">
              {contents === null ? (
                <span className="text-neutral-500">Loading contents…</span>
              ) : tallGroups.shown.length === 0 ? (
                <span className="text-neutral-500">Empty</span>
              ) : (
                <ul>
                  {tallGroups.shown.map((gr) => (
                    <li key={gr.label} className="truncate">
                      {gr.label}
                      {gr.count > 1 && <span className="font-bold"> ×{gr.count}</span>}
                    </li>
                  ))}
                  {tallGroups.hidden > 0 && <li>+{tallGroups.hidden} more</li>}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center pt-[0.1in]">
              {qr && <img src={qr} alt={`QR for ${unit.id}`} className="h-[1.4in] w-[1.4in]" />}
              <div className="mt-1 text-[8pt] text-neutral-600">Printed {printed}</div>
            </div>
          </div>
        </div>
       </div>
      </div>
    );
  }

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
          <div className="h-[0.24in] shrink-0 truncate text-[11pt] leading-[0.24in] text-neutral-700">
            {counts}
          </div>
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
        <div className="mt-1 text-[8pt] text-neutral-600">Printed {printed}</div>
      </div>
      </div>
    </div>
  );
}
