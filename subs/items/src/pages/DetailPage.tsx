// Item detail page — 1:1 port of item-detail.js (#332)
// Sections: Header → Quick Nav → Overview → Storage → Deployment →
//           Finance → Maintenance → Photos → Related Links
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Card, CardBody, CardHeader, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from '@heroui/react';
import {
  Breadcrumbs, PhotoGallery, useToast, useAuth, Typography,
} from '@spookydecs/ui';
import { fetchItemById, cascadePreview, cascadeDelete } from '../api/itemsApi';
import { getMaintenanceRecords, getMaintenancePageUrl } from '../api/maintenanceApi';
import {
  type Item, type MaintenanceRecord, type CascadePreview,
  type GenerationHistoryEntry,
} from '../api/types';
import { getClassIcon, getSeasonIcon, getStatusColor } from '../config/itemsConfig';
import { MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { usePhotoUpload } from '@spookydecs/ui';

interface RelatedUrls {
  storage: string;
  finance: string;
  maintenance: string;
  images: string;
  ideas: string;
}

function formatRecordDate(record: MaintenanceRecord): string {
  const raw = record.date_performed || record.date_scheduled || record.created_at;
  if (!raw) return 'No date';
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();
  const photoUpload = usePhotoUpload();

  const [item, setItem]               = useState<Item | null>(null);
  const [maintenance, setMaint]       = useState<MaintenanceRecord[]>([]);
  const [maintUrl, setMaintUrl]       = useState<string | null>(null);
  const [relatedUrls, setRelatedUrls] = useState<RelatedUrls>({ storage: '', finance: '', maintenance: '', images: '', ideas: '' });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [cascade, setCascade]         = useState<CascadePreview | null>(null);
  const [showCascade, setShowCascade] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const canWrite = hasMinRole('builder');
  const canAdmin = hasMinRole('admin');

  async function loadItem() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [fetched, maintRecords, mUrl] = await Promise.all([
        fetchItemById(id, true),
        getMaintenanceRecords(id, 100).catch(() => []),
        getMaintenancePageUrl(id).catch(() => null),
      ]);
      setItem(fetched);
      setMaint(maintRecords);
      setMaintUrl(mUrl);

      // Load cross-sub URLs from config
      try {
        const config = await (window as any).SpookyConfig.get() as any;
        setRelatedUrls({
          storage:     config.STR_ADM_URL      || '',
          finance:     config.FINANCE_URL       || '',
          maintenance: config.MAINT_URL         || '',
          images:      config.IMAGES_URL        || '',
          ideas:       config.IDEAS_URL         || '',
        });
      } catch { /* config not critical */ }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load item.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItem(); }, [id]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) return <div className="p-8 text-center text-foreground-500">Loading…</div>;
  if (error || !item) return (
    <div className="p-8 text-center">
      <p className="text-danger mb-4">{error ?? 'Item not found.'}</p>
      <Button onPress={() => navigate('/items')}>Back to Items</Button>
    </div>
  );

  // ── Derived maintenance state ──────────────────────────────────────────────
  const inProgressRecords = maintenance.filter(
    r => r.status === 'in_progress'
  );
  const completedRecords = maintenance
    .filter(r => r.status === 'completed')
    .sort((a, b) => {
      const da = new Date(a.date_performed || a.created_at || '').getTime();
      const db = new Date(b.date_performed || b.created_at || '').getTime();
      return db - da;
    })
    .slice(0, 5);

  const activeRepairs = maintenance.filter(
    r => r.record_type === 'repair' && r.status !== 'completed' && r.status !== 'cancelled'
  );
  const repairData   = item.maintenance?.repair_data ?? {};
  const blockerRecord = repairData.operational_blocker_record_id
    ? maintenance.find(r => r.id === repairData.operational_blocker_record_id) ?? null
    : null;
  const featuredRepair   = blockerRecord ?? activeRepairs[0] ?? null;
  const remainingRepairs = activeRepairs.length - (featuredRepair ? 1 : 0);

  const activeInspections = maintenance.filter(
    r => r.record_type === 'inspection' && r.status !== 'completed' && r.status !== 'cancelled'
  );
  const featuredInspection   = activeInspections[0] ?? null;
  const remainingInspections = activeInspections.length - (featuredInspection ? 1 : 0);

  const activeRecurring = maintenance.filter(
    r => r.record_type === 'maintenance' && r.status !== 'completed' && r.status !== 'cancelled'
  );
  const featuredRecurring   = activeRecurring[0] ?? null;
  const remainingRecurring  = activeRecurring.length - (featuredRecurring ? 1 : 0);

  const now = Date.now();
  const upcomingMaintenance: GenerationHistoryEntry[] = (item.maintenance?.generation_history ?? [])
    .filter(e => new Date(e.due_date).getTime() > now)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 2);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const storage  = item.storage_data   ?? {};
  const vendor   = item.vendor_metadata ?? {};
  const deploy   = item.deployment_data ?? {};
  const inspData = item.maintenance?.inspection_data ?? {};
  const maintData = item.maintenance?.maintenance_data ?? {};
  const toteId   = storage.tote_id;

  async function handleUploadPhoto() {
    const uploaded = await photoUpload.open({
      context: 'item',
      entityId: item!.id,
      season: item!.season?.toLowerCase() ?? 'shared',
    });
    if (uploaded.length > 0) {
      toast.showSuccess(`${uploaded.length} photo(s) uploaded.`);
      loadItem();
    }
  }

  async function openCascade() {
    try {
      const preview = await cascadePreview(item!.id);
      setCascade(preview);
      setShowCascade(true);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to load cascade preview.');
    }
  }

  async function executeCascade() {
    setDeleting(true);
    try {
      await cascadeDelete(item!.id);
      toast.showSuccess('Item deleted.');
      navigate('/items');
    } catch (e: any) {
      toast.showError(e?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
      setShowCascade(false);
    }
  }

  const hasCost  = vendor.cost  && String(vendor.cost)  !== '0';
  const hasValue = vendor.value && String(vendor.value) !== '0';

  const relatedLinks = [
    {
      key: 'storage',
      label: 'Storage',
      descriptor: 'Totes, locations & packing status',
      href: toteId && relatedUrls.storage ? `${relatedUrls.storage}/storage/${toteId}` : null,
      disabled: !toteId,
      tooltip: !toteId ? 'No Tote Assigned' : null,
    },
    {
      key: 'finance',
      label: 'Finance',
      descriptor: 'Cost, value & vendor records',
      href: relatedUrls.finance ? `${relatedUrls.finance}/${item.id}` : null,
      disabled: !relatedUrls.finance,
      tooltip: null,
    },
    {
      key: 'maintenance',
      label: 'Maintenance',
      descriptor: 'Service history & schedules',
      href: maintUrl ?? null,
      disabled: !maintUrl,
      tooltip: null,
    },
    {
      key: 'photos',
      label: 'Photos',
      descriptor: 'Primary & secondary images',
      href: relatedUrls.images ? `${relatedUrls.images}/images/entities/${item.id}` : null,
      disabled: !relatedUrls.images,
      tooltip: null,
    },
    {
      key: 'idea',
      label: 'Origin Idea',
      descriptor: 'The idea this item was built from',
      href: item.source_idea_id && relatedUrls.ideas ? `${relatedUrls.ideas}/workbench/${item.source_idea_id}` : null,
      disabled: !item.source_idea_id,
      tooltip: !item.source_idea_id ? 'Not built from an idea' : null,
    },
  ];

  const NAV_LINKS = [
    { id: 'overview',      label: 'Overview' },
    { id: 'storage',       label: 'Storage' },
    { id: 'deployment',    label: 'Deployment' },
    { id: 'finance',       label: 'Finance' },
    { id: 'maintenance',   label: 'Maintenance' },
    { id: 'photos',        label: 'Photos' },
    { id: 'related-links', label: 'Related Links' },
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <Breadcrumbs crumbs={[{ label: 'Items', to: '/' }, { label: 'All Items', to: '/items' }, { label: item.short_name }]} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 mb-6">
        {item.images?.cloudfront_url ? (
          <img
            src={item.images.cloudfront_url}
            alt={item.short_name}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-default-100 flex items-center justify-center text-4xl flex-shrink-0">
            {getClassIcon(item.class)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Typography type="h4" className="text-foreground">{item.short_name}</Typography>
              <Typography type="body-xs" className="text-foreground-400 mt-0.5">{item.id}</Typography>
              <Typography type="body-sm" className="text-foreground-500 mt-1">
                {item.class_type} · {getSeasonIcon(item.season)} {item.season}
              </Typography>
            </div>
            {(canWrite || canAdmin) && (
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly variant="flat" size="sm"><MoreVertical size={16} /></Button>
                </DropdownTrigger>
                <DropdownMenu>
                  {canWrite ? (
                    <DropdownItem key="edit" startContent={<Pencil size={14} />} onPress={() => navigate(`/${item.id}/edit`)}>
                      Edit Item
                    </DropdownItem>
                  ) : null}
                  {canWrite ? (
                    <DropdownItem key="upload" startContent={<ExternalLink size={14} />} onPress={handleUploadPhoto}>
                      Upload Photo
                    </DropdownItem>
                  ) : null}
                  {canAdmin ? (
                    <DropdownItem key="delete" startContent={<Trash2 size={14} />} color="danger" className="text-danger" onPress={openCascade}>
                      Delete (Cascade)
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-2">
            {deploy.deployed && <Chip size="sm" color="primary">Deployed</Chip>}
            <Chip size="sm" style={{ backgroundColor: getStatusColor(item.status), color: 'white' }}>
              {item.status}
            </Chip>
            {repairData.needs_repair && <Chip size="sm" color="warning">Needs Repair</Chip>}
            {item.operational_status === false && <Chip size="sm" color="danger">Non-Operational</Chip>}
            {inProgressRecords.length > 0 && (
              <button
                className="text-xs text-primary underline"
                onClick={() => scrollTo('maintenance')}
              >
                {inProgressRecords.length} record{inProgressRecords.length !== 1 ? 's' : ''} in progress →
              </button>
            )}
          </div>

          {item.date_acquired && (
            <p className="text-xs text-foreground-400 mt-1">Acquired: {item.date_acquired}</p>
          )}
        </div>
      </div>

      {/* ── Quick Nav ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-sm border-b border-default-100 pb-3">
        <span className="text-foreground-400">Jump to:</span>
        {NAV_LINKS.map(l => (
          <button
            key={l.id}
            className="text-primary hover:underline"
            onClick={() => scrollTo(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────────── */}
      <section id="overview" className="mb-4">
        <SectionCard title="Overview">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {item.height_length && <Field label="Dimensions" value={`${item.height_length} ft`} />}
            {item.stakes        && <Field label="Stakes"     value={String(item.stakes)} />}
            {item.tethers       && <Field label="Tethers"    value={String(item.tethers)} />}
            {item.color         && <Field label="Color"      value={item.color} />}
            {item.bulb_type     && <Field label="Bulb Type"  value={item.bulb_type} />}
            {item.length        && <Field label="Length"     value={`${item.length} ft`} />}
            {item.male_ends     && <Field label="Male Ends"  value={String(item.male_ends)} />}
            {item.female_ends   && <Field label="Female Ends" value={String(item.female_ends)} />}
            {item.watts         && <Field label="Watts"      value={item.watts} />}
            {item.amps          && <Field label="Amps"       value={item.amps} />}
            <Field label="Power Required" value={item.power_inlet ? 'Yes' : 'No'} />
          </div>
          {item.general_notes && (
            <div className="mt-3 pt-3 border-t border-default-100">
              <Typography type="body-xs" className="text-foreground-400 mb-1">Notes</Typography>
              <Typography type="body-sm">{item.general_notes}</Typography>
            </div>
          )}
        </SectionCard>
      </section>

      {/* ── Storage ────────────────────────────────────────────────────────── */}
      <section id="storage" className="mb-4">
        <SectionCard title="Storage">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {/* Packing display driven off canonical status (#280) — Packed = in a tote */}
            <Field label="Status"   value={item.status === 'Packed' ? 'Packed' : 'Not Packed'} />
            {toteId           && <Field label="Tote"     value={toteId} />}
            {storage.location && <Field label="Location" value={storage.location} />}
          </div>
        </SectionCard>
      </section>

      {/* ── Deployment ─────────────────────────────────────────────────────── */}
      <section id="deployment" className="mb-4">
        <SectionCard title="Deployment">
          <p className="text-xs text-foreground-400 font-medium mb-2">Current Status</p>
          {deploy.deployed ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
              {deploy.last_deployment_id && <Field label="Deployment ID" value={String(deploy.last_deployment_id)} />}
              {deploy.last_deployed_at   && (
                <Field label="Deployed" value={new Date(String(deploy.last_deployed_at)).toLocaleString()} />
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground-400 mb-3">Not currently deployed</p>
          )}
          {(deploy.previous_deployments as string[] | undefined)?.length ? (
            <>
              <p className="text-xs text-foreground-400 font-medium mb-2">Previous Deployments</p>
              <div className="flex flex-col gap-1">
                {(deploy.previous_deployments as string[]).map(d => (
                  <p key={d} className="text-sm font-mono text-foreground-600">{d}</p>
                ))}
              </div>
            </>
          ) : null}
        </SectionCard>
      </section>

      {/* ── Finance ────────────────────────────────────────────────────────── */}
      <section id="finance" className="mb-4">
        <SectionCard title="Finance">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Field label="Cost"         value={hasCost  ? `$${vendor.cost}`  : '—'} />
            <Field label="Current Value" value={hasValue ? `$${vendor.value}` : '—'} />
            <Field label="Manufacturer" value={String(vendor.manufacturer || '—')} />
            <Field label="Vendor"       value={String(vendor.vendor_store  || '—')} />
          </div>
        </SectionCard>
      </section>

      {/* ── Maintenance ────────────────────────────────────────────────────── */}
      <section id="maintenance" className="mb-4">
        <SectionCard
          title="Maintenance"
          action={maintUrl ? (
            <Button size="sm" variant="flat" endContent={<ExternalLink size={12} />}
              onPress={() => window.open(maintUrl, '_blank')}>
              View All
            </Button>
          ) : undefined}
        >
          {/* Repair Records */}
          <Subsection title="Repair Records">
            <div className="flex gap-2 mb-2">
              {item.operational_status !== false
                ? <Chip size="sm" color="success" variant="flat">Operational</Chip>
                : <Chip size="sm" color="danger"  variant="flat">Non-Operational</Chip>}
              {repairData.needs_repair && <Chip size="sm" color="warning" variant="flat">Needs Repair</Chip>}
            </div>
            {featuredRepair ? (
              <>
                <MaintenanceItem record={featuredRepair} />
                {remainingRepairs > 0 && maintUrl && (
                  <a href={maintUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">
                    See {remainingRepairs} more {remainingRepairs === 1 ? 'record' : 'records'} →
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-foreground-400">No active repair records</p>
            )}
          </Subsection>

          {/* Inspection Records */}
          <Subsection title="Inspection Records">
            {inspData.next_inspection_date && (
              <Field label="Next Inspection" value={new Date(inspData.next_inspection_date).toLocaleDateString()} />
            )}
            {inspData.last_synced_at && (
              <Field label="Last Synced" value={new Date(inspData.last_synced_at).toLocaleDateString()} />
            )}
            {inspData.applied_templates?.length ? (
              <div className="flex gap-1 flex-wrap mt-1 mb-2">
                {inspData.applied_templates.map(t => (
                  <Chip key={t} size="sm" variant="flat">{t}</Chip>
                ))}
              </div>
            ) : null}
            {featuredInspection ? (
              <>
                <MaintenanceItem record={featuredInspection} />
                {remainingInspections > 0 && maintUrl && (
                  <a href={maintUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">
                    See {remainingInspections} more {remainingInspections === 1 ? 'record' : 'records'} →
                  </a>
                )}
              </>
            ) : null}
            {!inspData.next_inspection_date && !inspData.last_synced_at && !inspData.applied_templates?.length && !featuredInspection && (
              <p className="text-sm text-foreground-400">No inspection data</p>
            )}
          </Subsection>

          {/* Recurring Maintenance */}
          <Subsection title="Recurring Maintenance">
            {maintData.next_maintenance_date && (
              <Field label="Next Due" value={new Date(maintData.next_maintenance_date).toLocaleDateString()} />
            )}
            {maintData.last_synced_at && (
              <Field label="Last Synced" value={new Date(maintData.last_synced_at).toLocaleDateString()} />
            )}
            {maintData.applied_templates?.length ? (
              <div className="flex gap-1 flex-wrap mt-1 mb-2">
                {maintData.applied_templates.map(t => (
                  <Chip key={t} size="sm" variant="flat">{t}</Chip>
                ))}
              </div>
            ) : null}
            {upcomingMaintenance.map(e => (
              <div key={e.record_id} className="rounded-lg border border-default-200 p-3 mb-2 text-sm">
                <p className="font-medium">Due: {new Date(e.due_date).toLocaleDateString()}</p>
                <p className="text-foreground-400 text-xs">Template: {e.template_id}</p>
                <p className="text-foreground-400 text-xs">Record: {e.record_id}</p>
              </div>
            ))}
            {featuredRecurring ? (
              <>
                <MaintenanceItem record={featuredRecurring} />
                {remainingRecurring > 0 && maintUrl && (
                  <a href={maintUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">
                    See {remainingRecurring} more {remainingRecurring === 1 ? 'record' : 'records'} →
                  </a>
                )}
              </>
            ) : null}
            {!maintData.next_maintenance_date && !maintData.last_synced_at && !maintData.applied_templates?.length && upcomingMaintenance.length === 0 && !featuredRecurring && (
              <p className="text-sm text-foreground-400">No recurring maintenance scheduled</p>
            )}
          </Subsection>

          {/* Recently Completed */}
          {completedRecords.length > 0 && (
            <Subsection title="Recently Completed">
              {completedRecords.map(r => <MaintenanceItem key={r.id} record={r} />)}
            </Subsection>
          )}
        </SectionCard>
      </section>

      {/* ── Photos ─────────────────────────────────────────────────────────── */}
      <section id="photos" className="mb-4">
        <SectionCard
          title="Photos"
          action={canWrite ? (
            <Button size="sm" variant="flat" onPress={handleUploadPhoto}>+ Upload</Button>
          ) : undefined}
        >
          <PhotoGallery
            context="item"
            entityId={item.id}
            season={item.season?.toLowerCase() ?? 'shared'}
            enableUpload={canWrite}
          />
        </SectionCard>
      </section>

      {/* ── Related Links ──────────────────────────────────────────────────── */}
      <section id="related-links" className="mb-4">
        <SectionCard title="Related Links">
          <div className="flex flex-col divide-y divide-default-100">
            {relatedLinks.map(link => (
              link.disabled ? (
                <div key={link.key} className="flex items-center justify-between py-3 opacity-40">
                  <div>
                    <Typography type="body-sm" className="font-medium">{link.label}</Typography>
                    <Typography type="body-xs" className="text-foreground-400">{link.tooltip ?? link.descriptor}</Typography>
                  </div>
                  <ExternalLink size={14} className="text-foreground-300" />
                </div>
              ) : (
                <a
                  key={link.key}
                  href={link.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 hover:text-primary transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-foreground-400">{link.descriptor}</p>
                  </div>
                  <ExternalLink size={14} />
                </a>
              )
            ))}
          </div>
        </SectionCard>
      </section>

      {/* ── Cascade delete modal ───────────────────────────────────────────── */}
      <Modal isOpen={showCascade} onClose={() => setShowCascade(false)}>
        <ModalContent>
          <ModalHeader>Delete Item — Cascade Preview</ModalHeader>
          <ModalBody>
            <p className="mb-3">Deleting <strong>{item.short_name}</strong> will also remove:</p>
            {cascade && (
              <ul className="list-disc ml-5 text-sm">
                {cascade.maintenance_count != null && <li>{cascade.maintenance_count} maintenance record(s)</li>}
                {cascade.cost_count        != null && <li>{cascade.cost_count} cost record(s)</li>}
                {cascade.photo_count       != null && <li>{cascade.photo_count} photo(s)</li>}
              </ul>
            )}
            <p className="mt-3 text-danger text-sm font-medium">This cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setShowCascade(false)} isDisabled={deleting}>Cancel</Button>
            <Button color="danger" onPress={executeCascade} isLoading={deleting}>Delete Everything</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── FAB edit ──────────────────────────────────────────────────────── */}
      {canWrite && (
        <div className="fixed bottom-6 right-6">
          <Button color="primary" size="lg" isIconOnly radius="full"
            onPress={() => navigate(`/${item.id}/edit`)} className="shadow-lg">
            <Pencil size={20} />
          </Button>
        </div>
      )}

      {/* ── Back to top ───────────────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-6 ${canWrite ? 'right-20' : 'right-6'} w-10 h-10 rounded-full bg-default-200 hover:bg-default-300 flex items-center justify-center shadow-lg transition-colors`}
          aria-label="Back to top"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M12 5L5 12M12 5L19 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionCard({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <Typography type="h5" className="text-foreground">{title}</Typography>
        {action}
      </CardHeader>
      <CardBody className="pt-0">{children}</CardBody>
    </Card>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs text-foreground-400 font-medium uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-foreground-500 min-w-[130px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function MaintenanceItem({ record }: { record: MaintenanceRecord }) {
  return (
    <div className="rounded-lg border border-default-200 p-3 mb-2 text-sm">
      <div className="flex justify-between text-xs text-foreground-400 mb-1">
        <span>{formatRecordDate(record)}</span>
        {record.record_type && <span className="capitalize">{record.record_type}</span>}
      </div>
      {record.title       && <p className="font-medium">{record.title}</p>}
      {record.description && <p className="text-foreground-500 text-xs mt-1">{record.description}</p>}
    </div>
  );
}
