import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { Printer, Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState, Typography, SeasonChip } from '@spookydecs/ui';
import { storageAPI } from '../api/storageApi';
import type { StorageUnit } from '../config/storageConfig';
import { LabelTemplate, LABEL_H_IN, LABEL_W_IN } from '../components/LabelTemplate';
import type { LabelItem } from '../lib/labelContents';

const POOL_PREFIX = 'pool:';
const SHEET_ID = 'sheet';
const SCREEN_ZOOM = 0.42;
const PER_PAGE = 2;

interface Offsets {
  x: number;
  y: number;
  gap: number;
}
// Avery 5889: two 6x4 cards stacked on Letter. Tweakable because printers drift.
const DEFAULT_OFFSETS: Offsets = { x: 1.25, y: 1.5, gap: 0 };
const OFFSETS_KEY = 'storage.labelOffsets';

function loadOffsets(): Offsets {
  try {
    const raw = localStorage.getItem(OFFSETS_KEY);
    if (raw) return { ...DEFAULT_OFFSETS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — use defaults */
  }
  return DEFAULT_OFFSETS;
}

function PoolRow({ unit, onAdd, disabled }: { unit: StorageUnit; onAdd: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: POOL_PREFIX + unit.id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg border border-default-200 p-2 ${isDragging ? 'opacity-40' : ''} ${disabled ? 'opacity-50' : ''}`}
      data-testid={`pool-${unit.id}`}
    >
      <button type="button" className="cursor-grab text-default-400" aria-label={`Drag ${unit.short_name}`} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <Typography type="body-sm" as="div" className="truncate text-foreground">{unit.short_name}</Typography>
        <Typography type="body-xs" as="div" className="truncate text-default-500">{unit.id}</Typography>
      </div>
      <SeasonChip value={String(unit.season ?? '')} label={String(unit.season ?? '—')} />
      <Button isIconOnly size="sm" variant="flat" isDisabled={disabled} aria-label={`Add ${unit.short_name}`} onPress={onAdd}>
        <Plus size={16} />
      </Button>
    </div>
  );
}

function SheetTile({ unit, contents, onRemove }: { unit: StorageUnit; contents: LabelItem[] | null; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-lg border border-default-300 bg-white shadow-sm ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-default-200 px-2 py-1 text-black">
        <button type="button" className="flex cursor-grab items-center gap-1 text-xs" aria-label={`Reorder ${unit.short_name}`} {...attributes} {...listeners}>
          <GripVertical size={14} /> {unit.short_name}
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${unit.short_name}`} data-testid={`remove-${unit.id}`}>
          <X size={14} />
        </button>
      </div>
      <div style={{ width: `${LABEL_W_IN * SCREEN_ZOOM}in`, height: `${LABEL_H_IN * SCREEN_ZOOM}in`, overflow: 'hidden' }}>
        <div style={{ zoom: SCREEN_ZOOM }}>
          <LabelTemplate unit={unit} contents={contents} />
        </div>
      </div>
    </div>
  );
}

function SheetDrop({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: SHEET_ID });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-48 rounded-xl border-2 border-dashed p-3 ${isOver ? 'border-primary bg-primary-50' : 'border-default-300'}`}
      data-testid="label-sheet"
    >
      {empty ? <Typography type="body-sm" className="text-default-500">Drag units here, or press + on a unit, to add labels.</Typography> : children}
    </div>
  );
}

export default function LabelsPage() {
  const [searchParams] = useSearchParams();
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [contentsById, setContentsById] = useState<Record<string, LabelItem[]>>({});
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Offsets>(loadOffsets);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function loadUnits() {
    setLoading(true);
    setError(null);
    try {
      const all = await storageAPI.getAll();
      setUnits(all);
      // Deep link from the list page: /storage/labels?ids=A,B
      const preset = (searchParams.get('ids') ?? '').split(',').filter(Boolean);
      setSelected(preset.filter((id) => all.some((u) => u.id === id)));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load storage units');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contents come from the unit detail endpoint (contents_details); fetch once per unit on the sheet.
  useEffect(() => {
    const missing = selected.filter((id) => !(id in contentsById));
    if (missing.length === 0) return;
    let live = true;
    missing.forEach(async (id) => {
      try {
        const unit = await storageAPI.getById(id);
        const details = ((unit?.contents_details as LabelItem[] | undefined) ?? []);
        if (live) setContentsById((prev) => ({ ...prev, [id]: details }));
      } catch {
        if (live) setContentsById((prev) => ({ ...prev, [id]: [] }));
      }
    });
    return () => {
      live = false;
    };
  }, [selected, contentsById]);

  function updateOffset(key: keyof Offsets, value: string) {
    const next = { ...offsets, [key]: Number(value) || 0 };
    setOffsets(next);
    try {
      localStorage.setItem(OFFSETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const pool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => !q || `${u.short_name} ${u.id} ${u.season}`.toLowerCase().includes(q));
  }, [units, search]);

  const sheetUnits = selected.map((id) => byId.get(id)).filter((u): u is StorageUnit => Boolean(u));
  const pages = useMemo(() => {
    const out: StorageUnit[][] = [];
    for (let i = 0; i < sheetUnits.length; i += PER_PAGE) out.push(sheetUnits.slice(i, i + PER_PAGE));
    return out;
  }, [sheetUnits]);

  const add = (id: string, at?: number) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev];
      next.splice(at ?? next.length, 0, id);
      return next;
    });

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (activeKey.startsWith(POOL_PREFIX)) {
      const id = activeKey.slice(POOL_PREFIX.length);
      const overIndex = selected.indexOf(overKey);
      add(id, overIndex >= 0 ? overIndex : undefined);
      return;
    }
    if (activeKey !== overKey && selected.includes(overKey)) {
      setSelected((prev) => arrayMove(prev, prev.indexOf(activeKey), prev.indexOf(overKey)));
    }
  }

  const activeUnit = activeId ? byId.get(activeId.replace(POOL_PREFIX, '')) : null;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes', to: '/storage' }, { label: 'Print labels' }]} />
      <PageHeader
        title="Print Labels"
        icon={<Printer size={26} />}
        actions={
          <Button color="primary" variant="shadow" startContent={<Printer size={18} />} isDisabled={sheetUnits.length === 0} onPress={() => window.print()} data-testid="print-labels">
            Print {sheetUnits.length > 0 ? `(${sheetUnits.length})` : ''}
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading storage units…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadUnits} />
      ) : units.length === 0 ? (
        <EmptyState title="No storage units" message="Create a unit first." />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
              <div className="flex flex-col gap-2">
                <Input size="sm" placeholder="Search units" value={search} onValueChange={setSearch} aria-label="Search units" />
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
                  {pool.map((u) => (
                    <PoolRow key={u.id} unit={u} disabled={selected.includes(u.id)} onAdd={() => add(u.id)} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Typography type="body-sm" className="text-default-500">
                  {sheetUnits.length} label{sheetUnits.length === 1 ? '' : 's'} · {pages.length} sheet{pages.length === 1 ? '' : 's'} · drag to reorder (2 per sheet, in order)
                </Typography>
                <SheetDrop empty={sheetUnits.length === 0}>
                  <SortableContext items={selected} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-3">
                      {sheetUnits.map((u) => (
                        <SheetTile key={u.id} unit={u} contents={contentsById[u.id] ?? null} onRemove={() => setSelected((p) => p.filter((x) => x !== u.id))} />
                      ))}
                    </div>
                  </SortableContext>
                </SheetDrop>

                <details className="rounded-lg border border-default-200 p-3">
                  <summary className="cursor-pointer text-sm text-foreground">Print alignment (inches)</summary>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {(['x', 'y', 'gap'] as const).map((k) => (
                      <Input
                        key={k}
                        size="sm"
                        type="number"
                        step="0.05"
                        className="w-28"
                        label={k === 'x' ? 'Left' : k === 'y' ? 'Top' : 'Gap'}
                        value={String(offsets[k])}
                        onValueChange={(v) => updateOffset(k, v)}
                      />
                    ))}
                  </div>
                  <Typography type="body-xs" className="mt-2 text-default-500">
                    Print at 100% scale with margins set to none. Adjust these if the card edges drift on your printer.
                  </Typography>
                </details>
              </div>
            </div>
            <DragOverlay>
              {activeUnit ? (
                <div className="rounded-lg border border-default-300 bg-content1 p-2 text-sm shadow-lg">{activeUnit.short_name}</div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Print-only: real-size pages, two cards each. Everything else is hidden by index.css @media print. */}
          <div className="print-area hidden print:block" aria-hidden>
            {pages.map((page, pi) => (
              <div key={pi} className="print-page" style={{ breakAfter: pi === pages.length - 1 ? 'auto' : 'page' }}>
                {page.map((u, ci) => (
                  <div
                    key={u.id}
                    style={{
                      position: 'absolute',
                      left: `${offsets.x}in`,
                      top: `${offsets.y + ci * (LABEL_H_IN + offsets.gap)}in`,
                    }}
                  >
                    <LabelTemplate unit={u} contents={contentsById[u.id] ?? []} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
