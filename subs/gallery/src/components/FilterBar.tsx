/**
 * FilterBar — active-filter chips + a filter popover (ports
 * js/components/FilterTags.js + FilterPopover.js into one HeroUI component).
 *
 * Drives season/year/tags through useSearchParams (the page owns the URL). Tag
 * semantics are unchanged: a comma-separated list, any-match (OR) on the backend.
 *
 * Design-system note (#429): gallery deliberately keeps this LOCAL bar rather than
 * adopting the shared @spookydecs/ui FilterBar — its popover + tag-chip management
 * is a different interaction model (a sanctioned design.md §8 exception). Inner
 * controls still track the shared look: size="sm" + variant="bordered" selects/
 * inputs, and a secondary "Clear" affordance.
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Chip,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
} from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';
import {
  GALLERY_CONFIG,
  getSeasonEmoji,
  getSeasonLabel,
  yearOptions,
  type GalleryFilters,
} from '../config/galleryConfig';

export function readFilters(params: URLSearchParams): GalleryFilters {
  return {
    season: params.get('season') || null,
    year: params.get('year') || null,
    tags: params.get('tags') || null,
  };
}

function tagsToArray(tags: string | null): string[] {
  return tags ? tags.split(',').filter(Boolean) : [];
}

interface Props {
  filters: GalleryFilters;
  onChange: (next: GalleryFilters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  const activeTags = tagsToArray(filters.tags);
  const hasFilters = Boolean(filters.season || filters.year || activeTags.length);

  // Popover-local draft state (committed on Apply).
  const [open, setOpen] = useState(false);
  const [season, setSeason] = useState(filters.season ?? '');
  const [year, setYear] = useState(filters.year ?? '');
  const [tags, setTags] = useState<string[]>(activeTags);
  const [tagInput, setTagInput] = useState('');

  // Re-seed the draft from props whenever the popover (re)opens.
  useEffect(() => {
    if (open) {
      setSeason(filters.season ?? '');
      setYear(filters.year ?? '');
      setTags(tagsToArray(filters.tags));
      setTagInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput('');
  }

  function apply() {
    onChange({
      season: season || null,
      year: year || null,
      tags: tags.length ? tags.join(',') : null,
    });
    setOpen(false);
  }

  function clearDraft() {
    setSeason('');
    setYear('');
    setTags([]);
    setTagInput('');
    onChange({ season: null, year: null, tags: null });
    setOpen(false);
  }

  function removeFilter(patch: Partial<GalleryFilters>) {
    onChange({ ...filters, ...patch });
  }

  function removeTag(tag: string) {
    const remaining = activeTags.filter((t) => t !== tag);
    onChange({ ...filters, tags: remaining.length ? remaining.join(',') : null });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {/* Active filter chips */}
      {filters.season && (
        <Chip variant="flat" color="primary" onClose={() => removeFilter({ season: null })}>
          {getSeasonEmoji(filters.season)} {getSeasonLabel(filters.season)}
        </Chip>
      )}
      {filters.year && (
        <Chip variant="flat" color="primary" onClose={() => removeFilter({ year: null })}>
          📅 {filters.year}
        </Chip>
      )}
      {activeTags.map((tag) => (
        <Chip key={tag} variant="flat" onClose={() => removeTag(tag)}>
          🏷️ {tag}
        </Chip>
      ))}
      {hasFilters && (
        <Button size="sm" variant="light" onPress={clearDraft}>
          Browse all
        </Button>
      )}

      <div className="ml-auto">
        <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end">
          <PopoverTrigger>
            <Button
              size="sm"
              variant="bordered"
              startContent={<SlidersHorizontal size={16} />}
              color={hasFilters ? 'primary' : 'default'}
            >
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 gap-3 p-4">
            <h3 className="self-start text-base font-semibold text-foreground">Filter Displays</h3>

            <Select
              label="Season"
              size="sm"
              variant="bordered"
              selectedKeys={season ? new Set([season]) : new Set()}
              onSelectionChange={(keys) => setSeason(((keys as Set<string>).values().next().value as string) ?? '')}
            >
              <SelectItem key="halloween" textValue="Halloween">🎃 Halloween</SelectItem>
              <SelectItem key="christmas" textValue="Christmas">🎄 Christmas</SelectItem>
              <SelectItem key="shared" textValue="Shared">🌟 Shared</SelectItem>
            </Select>

            <Select
              label="Year"
              size="sm"
              variant="bordered"
              selectedKeys={year ? new Set([year]) : new Set()}
              onSelectionChange={(keys) => setYear(((keys as Set<string>).values().next().value as string) ?? '')}
            >
              {yearOptions().map((y) => (
                <SelectItem key={y}>{y}</SelectItem>
              ))}
            </Select>

            <Input
              label="Tags"
              size="sm"
              variant="bordered"
              placeholder="Type a tag + Enter"
              value={tagInput}
              onValueChange={setTagInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    size="sm"
                    color="primary"
                    onClose={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            )}

            <div className="flex w-full gap-2">
              <Button size="sm" variant="flat" color="secondary" className="flex-1" onPress={clearDraft}>
                Clear
              </Button>
              <Button size="sm" color="primary" className="flex-1" onPress={apply}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
