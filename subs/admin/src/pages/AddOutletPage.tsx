/**
 * Add Outlet — a dedicated, guided form for registering a new power receptacle
 * in a deployment zone (#582). Outlets are a rare, physical install (a few over
 * the project's life), so they get this focused form rather than the generic
 * items-create wizard with its full vendor/photo/storage fields. The three real
 * inputs are zone, name, and port count; the item is created as a Receptacle
 * tagged with its zone so deployment creation self-registers it.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';
import { ArrowLeft, Plug } from 'lucide-react';
import { ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import { createOutlet, listOutlets, type Outlet } from '../api/adminApi';
import { DEPLOYMENT_ZONES } from '../config/adminConfig';

export default function AddOutletPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [zoneCode, setZoneCode] = useState('');
  const [name, setName] = useState('');
  const [ports, setPorts] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  const [outlets, setOutlets] = useState<Outlet[] | null>(null);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [outletsError, setOutletsError] = useState<string | null>(null);

  const portsNum = parseInt(ports, 10);
  const portsValid = !isNaN(portsNum) && portsNum > 0;
  const canSubmit = !!zoneCode && name.trim().length > 0 && portsValid;

  async function loadOutlets() {
    setLoadingOutlets(true);
    setOutletsError(null);
    try {
      const result = await listOutlets();
      setOutlets(result || []);
    } catch (err) {
      setOutletsError(err instanceof Error ? err.message : 'Failed to load existing outlets');
    } finally {
      setLoadingOutlets(false);
    }
  }

  useEffect(() => {
    loadOutlets();
  }, []);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createOutlet({
        zoneCode,
        shortName: name.trim(),
        femaleEnds: portsNum,
      });
      if (created) {
        toast.showSuccess(`Outlet ${created.id} registered in ${zoneCode}.`);
        setZoneCode('');
        setName('');
        setPorts('2');
        loadOutlets();
      }
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to register outlet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Outlet"
        subtitle="Register a new power receptacle in a deployment zone. Once added, it's automatically included in that zone the next time a deployment is created — no code change or redeploy needed."
        actions={
          <Button variant="light" startContent={<ArrowLeft size={16} />} onPress={() => navigate('/')}>
            Back to Dashboard
          </Button>
        }
      />

      <div className="mx-auto max-w-xl">
        <Card shadow="md" className="bg-content1">
          <CardBody className="gap-5">
            <Select
              label="Zone"
              placeholder="Select a deployment zone"
              selectedKeys={zoneCode ? [zoneCode] : []}
              onSelectionChange={(keys) => setZoneCode((Array.from(keys)[0] as string) || '')}
              isRequired
            >
              {DEPLOYMENT_ZONES.map((zone) => (
                <SelectItem key={zone.code}>{`${zone.name} (${zone.code})`}</SelectItem>
              ))}
            </Select>

            <Input
              label="Name"
              placeholder="e.g. Front Porch GFCI"
              value={name}
              onValueChange={setName}
              isRequired
              description="A short, human-readable label for this outlet."
            />

            <Input
              type="number"
              label="Port count"
              placeholder="2"
              value={ports}
              onValueChange={setPorts}
              min={1}
              isRequired
              isInvalid={ports !== '' && !portsValid}
              errorMessage={ports !== '' && !portsValid ? 'Port count must be a positive number.' : undefined}
              description="Number of usable outlets (female ends) on this receptacle."
              startContent={<Plug size={16} className="text-default-400" />}
            />
          </CardBody>
          <CardFooter>
            <Button color="secondary" onPress={submit} isLoading={submitting} isDisabled={!canSubmit}>
              Register Outlet
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mx-auto max-w-xl mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Existing Outlets</h2>
        {loadingOutlets ? (
          <LoadingState label="Loading existing outlets…" />
        ) : outletsError ? (
          <ErrorState message={outletsError} onRetry={loadOutlets} />
        ) : (
          <div className="flex flex-col gap-4">
            {DEPLOYMENT_ZONES.map((zone) => {
              const zoneOutlets = (outlets || []).filter((o) => o.zone_code === zone.code);
              return (
                <Card key={zone.code} shadow="sm" className="bg-content1">
                  <CardBody className="gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {zone.name} ({zone.code})
                    </span>
                    {zoneOutlets.length === 0 ? (
                      <span className="text-sm text-default-500">No outlets registered in this zone.</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {zoneOutlets.map((o) => (
                          <li
                            key={o.id}
                            className="flex items-center justify-between rounded-md bg-content2 px-3 py-2 text-sm"
                          >
                            <span>{o.short_name}</span>
                            <span className="text-default-500">
                              {o.female_ends ?? '?'} port{o.female_ends === 1 ? '' : 's'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
