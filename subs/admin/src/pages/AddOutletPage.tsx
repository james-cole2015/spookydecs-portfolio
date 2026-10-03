/**
 * Add Outlet — a dedicated, guided form for registering a new power receptacle
 * in a deployment zone (#582). Outlets are a rare, physical install (a few over
 * the project's life), so they get this focused form rather than the generic
 * items-create wizard with its full vendor/photo/storage fields. The three real
 * inputs are zone, name, and port count; the item is created as a Receptacle
 * tagged with its zone so deployment creation self-registers it.
 */
import { useState } from 'react';
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
import { PageHeader, useToast } from '@spookydecs/ui';
import { createOutlet } from '../api/adminApi';
import { DEPLOYMENT_ZONES } from '../config/adminConfig';

export default function AddOutletPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [zoneCode, setZoneCode] = useState('');
  const [name, setName] = useState('');
  const [ports, setPorts] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  const portsNum = parseInt(ports, 10);
  const portsValid = !isNaN(portsNum) && portsNum > 0;
  const canSubmit = !!zoneCode && name.trim().length > 0 && portsValid;

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
    </div>
  );
}
