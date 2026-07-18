/**
 * ImageDetail — typed HeroUI port of js/components/ImageDetail.js +
 * image-detail-helpers.js (#336). The heaviest component in the sub: view + edit
 * modes, tag pills, Claude-Vision suggest-tags, entity reference links, gallery
 * metadata, category-driven dynamic fields, and form collection.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { ConfirmDialog, useToast } from '@spookydecs/ui';
import { IMAGES_CONFIG, validateCategory, type CategoryConfig, type Photo } from '../config/imagesConfig';
import { deleteImage, suggestTags, updateImage, type MatchedItem } from '../api/imagesApi';

/** Derive the category key from a photo's references + photo_type (verbatim port). */
function deriveCategory(photo: Photo): string {
  if (photo.category && IMAGES_CONFIG.CATEGORIES[photo.category]) return photo.category;
  const photoType = photo.photo_type;

  if (photo.record_id) return 'maintenance';
  if (photo.item_ids && photo.item_ids.length > 0) {
    if (photoType === 'catalog') return 'item_catalog';
    if (photoType === 'repair' || photoType === 'inspection' || photoType === 'maintenance')
      return 'maintenance';
    if (photoType === 'deployment') return 'deployments';
  }
  if (photo.storage_id) return 'storage';
  if (photo.deployment_id) return 'deployments';
  if (photo.idea_id) {
    if (photoType === 'build') return 'builds';
    if (photoType === 'inspiration') return 'ideas';
    return 'ideas';
  }
  if (photoType === 'receipt') return 'receipts';
  if (photoType === 'gallery') return 'gallery';
  return 'misc';
}

function ReadonlyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-tiny font-semibold uppercase tracking-wide text-default-400">{label}</span>
      <div className="text-small text-foreground">{children}</div>
    </div>
  );
}

interface ImageDetailProps {
  photo: Photo;
  editMode: boolean;
  financeUrl?: string;
  maintUrl?: string;
  from?: string;
}

export function ImageDetail({ photo, editMode, financeUrl = '', maintUrl = '', from = '' }: ImageDetailProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const fromSuffix = from ? `?from=${from}` : '';
  const viewPath = `/images/${photo.photo_id}${fromSuffix}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <a href={photo.cloudfront_url} target="_blank" rel="noopener noreferrer">
          <img
            src={photo.cloudfront_url}
            alt={photo.caption || 'Image'}
            className="w-full rounded-large object-contain"
          />
        </a>
      </div>
      {editMode ? (
        <EditForm photo={photo} viewPath={viewPath} fromSuffix={fromSuffix} />
      ) : (
        <ViewPanel
          photo={photo}
          financeUrl={financeUrl}
          maintUrl={maintUrl}
          fromSuffix={fromSuffix}
          onDeleted={() => navigate('/images/list')}
          onEdit={() => navigate(`/images/${photo.photo_id}/edit${fromSuffix}`)}
          toastError={(m) => toast.showError(m)}
          toastSuccess={(m) => toast.showSuccess(m)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// View mode
// --------------------------------------------------------------------------

function ViewPanel({
  photo,
  financeUrl,
  maintUrl,
  onDeleted,
  onEdit,
  toastError,
  toastSuccess,
  navigate,
}: {
  photo: Photo;
  financeUrl: string;
  maintUrl: string;
  fromSuffix: string;
  onDeleted: () => void;
  onEdit: () => void;
  toastError: (m: string) => void;
  toastSuccess: (m: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const category = deriveCategory(photo);
  const categoryConfig = IMAGES_CONFIG.CATEGORIES[category] || { label: 'Unknown', photoType: '', requiredFields: [] };
  const galleryData = photo.gallery_data || {};

  const entityLink = (id: string, type: string, label?: string) => (
    <button
      key={`${type}-${id}`}
      className="text-secondary underline-offset-2 hover:underline"
      onClick={() => navigate(`/images/entities/${id}?type=${type}`)}
    >
      {label || id}
    </button>
  );

  const costId = (photo.cost_ids || [])[0];
  const firstItemId = (photo.item_ids || [])[0] || '';

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteImage(photo.photo_id);
      toastSuccess('Image deleted successfully');
      onDeleted();
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to delete image');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">Image Details</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" as="a" href={photo.cloudfront_url} target="_blank">
              View Full Size
            </Button>
            <Button size="sm" color="primary" onPress={onEdit}>
              Edit
            </Button>
            <Button size="sm" color="danger" variant="flat" onPress={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        </div>

        <ReadonlyRow label="Photo ID">
          <span className="font-mono">{photo.photo_id}</span>
        </ReadonlyRow>
        <ReadonlyRow label="Category">{categoryConfig.label}</ReadonlyRow>
        <ReadonlyRow label="Season">{photo.season}</ReadonlyRow>
        <ReadonlyRow label="Year">{photo.year || 'N/A'}</ReadonlyRow>
        <ReadonlyRow label="Caption">{photo.caption || 'No caption'}</ReadonlyRow>

        {category.startsWith('gallery') && (
          <>
            <ReadonlyRow label="Display Name">{galleryData.display_name || 'Untitled'}</ReadonlyRow>
            <ReadonlyRow label="Location">{galleryData.location || '—'}</ReadonlyRow>
          </>
        )}

        <ReadonlyRow label="Tags">
          {(photo.tags || []).length ? (
            <div className="flex flex-wrap gap-1">
              {(photo.tags || []).map((t) => (
                <Chip key={t} size="sm" variant="flat">
                  {t}
                </Chip>
              ))}
            </div>
          ) : (
            'No tags'
          )}
        </ReadonlyRow>

        {/* Entity references */}
        {(photo.item_ids || []).length > 0 && (
          <ReadonlyRow label="Item IDs">
            <div className="flex flex-wrap gap-2">
              {(photo.item_ids || []).map((id) => entityLink(id, 'item'))}
            </div>
          </ReadonlyRow>
        )}
        {category === 'maintenance' && photo.record_id && maintUrl && (
          <ReadonlyRow label="Repair Record">
            <a
              className="text-secondary hover:underline"
              href={`${maintUrl}/${firstItemId}/${photo.record_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {photo.record_id}
            </a>
          </ReadonlyRow>
        )}
        {photo.storage_id && (
          <ReadonlyRow label="Storage ID">{entityLink(photo.storage_id, 'storage')}</ReadonlyRow>
        )}
        {costId && (
          <ReadonlyRow label="Cost Record">
            <a
              className="text-secondary hover:underline"
              href={`${financeUrl}/costs/${costId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {costId}
            </a>
          </ReadonlyRow>
        )}
        {photo.idea_id && <ReadonlyRow label="Idea">{entityLink(photo.idea_id, 'idea')}</ReadonlyRow>}

        <ReadonlyRow label="Visibility">
          {(photo.is_public ? 'Public' : 'Private') +
            ' • ' +
            (photo.is_visible ? 'Visible' : 'Hidden') +
            ' • ' +
            (photo.is_primary ? 'Primary' : 'Secondary')}
        </ReadonlyRow>
        {photo.upload_date && (
          <ReadonlyRow label="Upload Date">{new Date(photo.upload_date).toLocaleString()}</ReadonlyRow>
        )}
        {photo.s3_key && (
          <ReadonlyRow label="S3 Path">
            <span className="font-mono text-tiny">{photo.s3_key}</span>
          </ReadonlyRow>
        )}
      </CardBody>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete image?"
        body="Are you sure you want to delete this image? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}

// --------------------------------------------------------------------------
// Edit mode
// --------------------------------------------------------------------------

function EditForm({ photo, viewPath, fromSuffix }: { photo: Photo; viewPath: string; fromSuffix: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const galleryData = photo.gallery_data || {};

  const [category, setCategory] = useState(deriveCategory(photo));
  const [season, setSeason] = useState(photo.season || 'shared');
  const [year, setYear] = useState(String(photo.year || new Date().getFullYear()));
  const [caption, setCaption] = useState(photo.caption || '');
  const [displayName, setDisplayName] = useState(galleryData.display_name || '');
  const [displayNameTouched, setDisplayNameTouched] = useState(!!galleryData.display_name);
  const [location, setLocation] = useState(galleryData.location || '');
  const [tags, setTags] = useState<string[]>((photo.tags || []).filter(Boolean));
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(!!photo.is_public);
  const [isVisible, setIsVisible] = useState(!!photo.is_visible);
  const [isPrimary, setIsPrimary] = useState(!!photo.is_primary);
  const [saving, setSaving] = useState(false);

  // Dynamic per-category fields (driven by requiredFields; currently empty for
  // all categories but ported for forward-compat).
  const categoryConfig: CategoryConfig =
    IMAGES_CONFIG.CATEGORIES[category] || { label: 'Unknown', photoType: '', requiredFields: [] };

  // Suggest-tags (gallery only) state.
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);

  const isGallery = category.startsWith('gallery');

  function addTag(value: string) {
    const v = value.trim().replace(/,$/, '').trim().toLowerCase();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
  }

  // Auto-fill display name from location + year unless the user edited it.
  function autoFillDisplayName(nextLocation: string, nextYear: string) {
    if (displayNameTouched) return;
    setDisplayName([nextLocation, nextYear].filter(Boolean).join(' '));
  }

  async function onSuggest() {
    setSuggesting(true);
    try {
      const result = await suggestTags(photo.photo_id);
      const suggested = (result?.suggested_tags || []).filter((t) => t && !tags.includes(t));
      setSuggestedTags(suggested);
      setMatchedItems(result?.matched_items || []);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to suggest tags');
    } finally {
      setSuggesting(false);
    }
  }

  function acceptSuggested(tag: string) {
    addTag(tag);
    setSuggestedTags((s) => s.filter((t) => t !== tag));
  }

  function acceptMatched(item: MatchedItem) {
    if (!tags.includes(item.item_id)) setTags((t) => [...t, item.item_id]);
    setMatchedItems((m) => m.filter((i) => i.item_id !== item.item_id));
  }

  function addAllMatched() {
    setTags((t) => {
      const next = [...t];
      matchedItems.forEach((i) => {
        if (!next.includes(i.item_id)) next.push(i.item_id);
      });
      return next;
    });
    setMatchedItems([]);
  }

  async function onSave() {
    const updates: Record<string, unknown> = {
      category,
      season,
      year: parseInt(year, 10),
      caption,
      tags,
      is_public: isPublic,
      is_visible: isVisible,
      is_primary: isPrimary,
    };
    if (isGallery) {
      updates.gallery_data = {
        ...galleryData,
        display_name: displayName,
        location,
      };
    }

    const validation = validateCategory(category, updates);
    if (!validation.valid) {
      toast.showError(validation.errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      await updateImage(photo.photo_id, updates);
      toast.showSuccess('Image updated successfully');
      navigate(viewPath);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to update image');
    } finally {
      setSaving(false);
    }
  }

  const highMatches = matchedItems.filter((i) => i.confidence === 'high');
  const lowMatches = matchedItems.filter((i) => i.confidence !== 'high');

  const renderMatchGroup = (label: string, items: MatchedItem[]) =>
    items.length === 0 ? null : (
      <div className="flex flex-col gap-1">
        <span className="text-tiny font-semibold uppercase text-default-400">{label}</span>
        {items.map((item) => (
          <div
            key={item.item_id}
            className="flex items-center justify-between gap-2 rounded-medium bg-content2 px-2 py-1"
          >
            <span className="text-small text-foreground">{item.short_name || item.item_id}</span>
            <div className="flex items-center gap-2">
              {item.similarity != null && (
                <span className="text-tiny text-default-500">
                  {Math.round(item.similarity * 100)}% match
                </span>
              )}
              <Button size="sm" color="primary" onPress={() => acceptMatched(item)}>
                Add
              </Button>
              <Button
                size="sm"
                isIconOnly
                variant="light"
                onPress={() => setMatchedItems((m) => m.filter((x) => x.item_id !== item.item_id))}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-foreground">Edit Image</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => navigate(viewPath)}>
              Cancel
            </Button>
            <Button size="sm" color="primary" isLoading={saving} onPress={onSave}>
              Save Changes
            </Button>
          </div>
        </div>

        <Input label="Photo ID" value={photo.photo_id} isReadOnly />

        <Select
          label="Category"
          isRequired
          selectedKeys={[category]}
          onChange={(e) => setCategory(e.target.value)}
        >
          {Object.entries(IMAGES_CONFIG.CATEGORIES).map(([key, config]) => (
            <SelectItem key={key}>{config.label}</SelectItem>
          ))}
        </Select>
        {categoryConfig.requiredFields.length > 0 && (
          <p className="text-tiny text-warning">Required: {categoryConfig.requiredFields.join(', ')}</p>
        )}

        <Select label="Season" isRequired selectedKeys={[season]} onChange={(e) => setSeason(e.target.value)}>
          {IMAGES_CONFIG.SEASONS.map((s) => (
            <SelectItem key={s.value}>{s.label}</SelectItem>
          ))}
        </Select>

        <Input
          label="Year"
          type="number"
          isRequired
          min={2020}
          max={2030}
          value={year}
          onValueChange={(v) => {
            setYear(v);
            autoFillDisplayName(location, v);
          }}
        />

        <Textarea label="Caption" minRows={3} value={caption} onValueChange={setCaption} />

        {isGallery && (
          <>
            <Input
              label="Display Name"
              placeholder="e.g. Front Yard 2025"
              value={displayName}
              onValueChange={(v) => {
                setDisplayName(v);
                setDisplayNameTouched(true);
              }}
            />
            <Select
              label="Location"
              selectedKeys={location ? [location] : []}
              onChange={(e) => {
                setLocation(e.target.value);
                autoFillDisplayName(e.target.value, year);
              }}
            >
              <SelectItem key="Front Yard">Front Yard</SelectItem>
              <SelectItem key="Side Yard">Side Yard</SelectItem>
              <SelectItem key="Back Yard">Back Yard</SelectItem>
            </Select>
          </>
        )}

        {/* Tag pills */}
        <div className="flex flex-col gap-2">
          <span className="text-tiny font-semibold uppercase tracking-wide text-default-400">Tags</span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Chip key={tag} variant="flat" onClose={() => setTags((t) => t.filter((x) => x !== tag))}>
                  {tag}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              size="sm"
              placeholder="Add tag, then press , or Enter"
              value={tagInput}
              onValueChange={setTagInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                }
              }}
            />
            {isGallery && (
              <Button size="sm" variant="flat" isLoading={suggesting} onPress={onSuggest}>
                Suggest Tags
              </Button>
            )}
          </div>

          {suggestedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-tiny text-default-500">Suggested:</span>
              {suggestedTags.map((tag) => (
                <Chip
                  key={tag}
                  variant="bordered"
                  color="secondary"
                  className="cursor-pointer"
                  onClick={() => acceptSuggested(tag)}
                  onClose={() => setSuggestedTags((s) => s.filter((t) => t !== tag))}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          )}

          {matchedItems.length > 0 && (
            <div className="flex flex-col gap-2 rounded-medium border border-default-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-tiny font-semibold uppercase text-default-400">AI Matched Items</span>
                <Button size="sm" variant="flat" onPress={addAllMatched}>
                  Add All
                </Button>
              </div>
              {renderMatchGroup('High Confidence', highMatches)}
              {renderMatchGroup('Low Confidence', lowMatches)}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Checkbox isSelected={isPublic} onValueChange={setIsPublic}>
            Public
          </Checkbox>
          <Checkbox isSelected={isVisible} onValueChange={setIsVisible}>
            Visible
          </Checkbox>
          <Checkbox isSelected={isPrimary} onValueChange={setIsPrimary}>
            Primary Photo
          </Checkbox>
        </div>
      </CardBody>
    </Card>
  );
}
