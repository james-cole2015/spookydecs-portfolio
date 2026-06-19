import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { MapPin } from 'lucide-react';
import { LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  createDeployment,
  checkDeploymentExists,
  listDeployments,
} from '../api/deploymentsApi';
import {
  DEPLOYMENT_CONFIG,
  validateDeploymentForm,
  generateDeploymentId,
} from '../config/deploymentsConfig';

export default function BuilderPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [checking, setChecking] = useState(true);

  const currentYear = new Date().getFullYear();
  const [season, setSeason] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // On mount, redirect to the active deployment's zones dashboard if one exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await listDeployments();
        if (response?.success && response.data) {
          const active = response.data.filter((d: any) => d.status !== 'archived');
          if (active.length > 0 && !cancelled) {
            navigate(`/deployments/builder/${active[0].deployment_id}/zones`);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking deployments:', error);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit() {
    const validation = validateDeploymentForm({ season, year });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Block if ANY active deployment exists (not just same season/year).
      const allDeployments = await listDeployments();
      if (allDeployments?.success && allDeployments.data) {
        const active = allDeployments.data.filter((d: any) => d.status !== 'archived');
        if (active.length > 0) {
          const a = active[0];
          toast.showError(
            `You have an active ${a.season} ${a.year} deployment. Please archive it before creating a new one.`,
          );
          setSubmitting(false);
          return;
        }
      }

      const exists = await checkDeploymentExists(season, year);
      if (exists) {
        const deploymentId = generateDeploymentId(season, year);
        toast.showError(`A deployment already exists for ${season} ${year} (${deploymentId})`);
        setSubmitting(false);
        return;
      }

      const payload = {
        season,
        year: parseInt(year, 10),
        zones: DEPLOYMENT_CONFIG.ZONES,
        notes: notes || '',
      };
      const response = await createDeployment(payload);
      if (response?.success) {
        toast.showSuccess('Deployment created successfully!');
        const deploymentId = response.data.metadata.deployment_id;
        setTimeout(() => navigate(`/deployments/builder/${deploymentId}/zones`), 600);
      } else {
        toast.showError('Failed to create deployment');
        setSubmitting(false);
      }
    } catch (error: any) {
      console.error('Error creating deployment:', error);
      toast.showError(error?.message || 'Failed to create deployment');
      setSubmitting(false);
    }
  }

  if (checking) return <LoadingState label="Checking for active deployments…" />;

  return (
    <>
      <PageHeader
        title="Create New Deployment"
        subtitle="Set up a new seasonal deployment to start tracking items and zones."
        actions={
          <Button variant="flat" onPress={() => navigate('/deployments')}>
            ← Back to Deployments
          </Button>
        }
      />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Season"
                isRequired
                selectedKeys={season ? [season] : []}
                onSelectionChange={(keys) => setSeason(Array.from(keys)[0] as string)}
                isInvalid={!!errors.season}
                errorMessage={errors.season}
              >
                {DEPLOYMENT_CONFIG.SEASONS.map((s) => (
                  <SelectItem key={s.value}>{s.label}</SelectItem>
                ))}
              </Select>

              <Input
                type="number"
                label="Year"
                isRequired
                value={year}
                onValueChange={setYear}
                min={DEPLOYMENT_CONFIG.MIN_YEAR}
                max={DEPLOYMENT_CONFIG.MAX_YEAR}
                description={`Valid range: ${DEPLOYMENT_CONFIG.MIN_YEAR} - ${DEPLOYMENT_CONFIG.MAX_YEAR}`}
                isInvalid={!!errors.year}
                errorMessage={errors.year}
              />
            </div>

            <Textarea
              label="Notes"
              placeholder="Add any notes about this deployment..."
              value={notes}
              onValueChange={setNotes}
              minRows={3}
            />
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader className="flex-col items-start">
            <h2 className="text-lg font-semibold">Zones</h2>
            <p className="text-sm text-default-500">
              Three predefined zones will be created for this deployment.
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DEPLOYMENT_CONFIG.ZONES.map((zone) => (
                <div
                  key={zone.zone_code}
                  className="flex items-start gap-3 rounded-medium border border-default-200 p-3"
                >
                  <MapPin className="mt-1 shrink-0 text-secondary" size={20} />
                  <div>
                    <h3 className="font-medium text-foreground">{zone.zone_name}</h3>
                    <p className="text-xs text-default-500">{zone.zone_code}</p>
                    <p className="text-xs text-default-400">{zone.receptacle_id}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button color="primary" isLoading={submitting} onPress={handleSubmit}>
            Create Deployment
          </Button>
        </div>
      </div>
    </>
  );
}
