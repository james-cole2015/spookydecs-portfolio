import { useMemo } from 'react';
import QRCode from 'qrcode';
import type { StorageUnit } from '../config/storageConfig';
import { AVERY_5889, type LabelOrientation, type LabelRotation } from '../lib/averySheet';
import { capGroups, groupContents, supplyGroups, type LabelItem } from '../lib/labelContents';

/** Card size in inches, from the Avery 5889 template (lib/averySheet.ts). */
export const LABEL_W_IN = AVERY_5889.cardW;
export const LABEL_H_IN = AVERY_5889.cardH;
const MAX_GROUPS = 12;
/** Contents cells that fit on the tall label (4x6 layout): 6 rows of 14pt (one spare row of breathing room) between the divider and the QR, in 2 columns. */
const TALL_LINES = 12;
const PRINT_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const SEASON_BAND: Record<string, string> = {
  Halloween: 'bg-orange-500',
  Christmas: 'bg-green-600',
  Shared: 'bg-slate-500',
};

export function unitUrl(id: string): string {
  return `${window.location.origin}/storage/${encodeURIComponent(id)}`;
}

/**
 * QR as inline SVG, built synchronously from the QR module matrix. The print area is a hidden
 * duplicate of the sheet, and an async data-URL <img> in it can still be undecoded when the print
 * dialog opens, so later labels printed without a QR (#751). SVG needs no load/decode step.
 * Error correction M survives scuffs; no quiet-zone margin so the card controls it.
 */
function QrCode({ text, className, alt }: { text: string; className?: string; alt: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const n = modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: n, path: d };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={alt} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <path d={path} fill="currentColor" />
    </svg>
  );
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
  const qrText = unitUrl(unit.id);
  const season = String(unit.season ?? ''); // drives the color band only
  // Supply totes carry a supplies list, not packed items (#708).
  const isSupply = Boolean(unit.is_supply_tote);
  const allGroups = isSupply ? supplyGroups(unit.supplies) : groupContents(contents ?? []);
  // Prefer the live contents list; fall back to the unit's own count while it loads.
  const itemCount = isSupply
    ? allGroups.length
    : contents
      ? contents.length
      : typeof unit.contents_count === 'number'
        ? unit.contents_count
        : null;
  // Printed date lets you spot a stale label; the QR always resolves to live data.
  const printed = PRINT_DATE.format(new Date());
  const { shown, hidden } = capGroups(allGroups, MAX_GROUPS);

  const counts = [itemCount === null ? null : `${itemCount} ${isSupply ? (itemCount === 1 ? 'supply' : 'supplies') : itemCount === 1 ? 'item' : 'items'}`, unit.location ? String(unit.location) : null]
    .filter(Boolean)
    .join(' · ');

  if (orientation === 'tall') {
    // The tall list is two columns of fixed-height rows and only TALL_LINES cells fit above the QR; a longer list used
    // to be clipped silently, hiding the "+N more" line. Reserve the last row for it when the list overflows (#751).
    const tallGroups = allGroups.length <= TALL_LINES ? { shown: allGroups, hidden: 0 } : capGroups(allGroups, TALL_LINES - 1);
    // The stock is only ever 6x4. Lay the label out 4x6, then turn it 90deg inside the 6x4 card.
    // Rotate about the box centre and centre that box on the card, so the 4x6 layout box overhangs the card
    // by 1in each side instead of 2in off the bottom. A box hanging below the card crossed the page edge on
    // the lower card and the print engine pushed its bottom (QR + printed date) onto a page that never prints (#751).
    const turn = rotation === 'cw' ? 'rotate(90deg)' : 'rotate(-90deg)';
    return (
      <div
        className="label-card relative overflow-hidden bg-white text-black"
        style={{ width: `${LABEL_W_IN}in`, height: `${LABEL_H_IN}in` }}
        data-testid={`label-${unit.id}`}
        data-orientation="tall"
      >
       <div className="absolute bg-white" style={{ left: '1in', top: '-1in', width: '4in', height: '6in', padding: `${inset}in`, transformOrigin: 'center', transform: turn }}>
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
              {!isSupply && contents === null ? (
                <span className="text-neutral-500">Loading contents…</span>
              ) : tallGroups.shown.length === 0 ? (
                <span className="text-neutral-500">Empty</span>
              ) : (
                <ul className="columns-2 gap-4">
                  {tallGroups.shown.map((gr) => (
                    <li key={gr.label} className="break-inside-avoid truncate">
                      {gr.label}
                      {gr.qty ? <span className="font-bold"> ×{gr.qty}</span> : gr.count > 1 && <span className="font-bold"> ×{gr.count}</span>}
                    </li>
                  ))}
                  {tallGroups.hidden > 0 && <li className="break-inside-avoid">+{tallGroups.hidden} more</li>}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center pt-[0.1in]">
              <QrCode text={qrText} alt={`QR for ${unit.id}`} className="h-[1.4in] w-[1.4in]" />
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
            {!isSupply && contents === null ? (
              <span className="text-neutral-500">Loading contents…</span>
            ) : shown.length === 0 ? (
              <span className="text-neutral-500">Empty</span>
            ) : (
              <ul className="columns-2 gap-4">
                {shown.map((g) => (
                  <li key={g.label} className="break-inside-avoid truncate">
                    {g.label}
                    {g.qty ? <span className="font-bold"> ×{g.qty}</span> : g.count > 1 && <span className="font-bold"> ×{g.count}</span>}
                  </li>
                ))}
                {hidden > 0 && <li className="break-inside-avoid">+{hidden} more</li>}
              </ul>
            )}
          </div>
        </div>
      <div className="flex w-[1.7in] shrink-0 flex-col items-center justify-center pr-[0.2in]">
        <QrCode text={qrText} alt={`QR for ${unit.id}`} className="h-[1.5in] w-[1.5in]" />
        <div className="mt-1 text-[8pt] text-neutral-600">Printed {printed}</div>
      </div>
      </div>
    </div>
  );
}
