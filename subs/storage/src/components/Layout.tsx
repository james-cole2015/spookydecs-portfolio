import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Breadcrumbs as HeroBreadcrumbs, BreadcrumbItem, Button } from '@heroui/react';
import { Typography } from './Typography';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate();
  return (
    <HeroBreadcrumbs className="mb-4" variant="solid">
      {crumbs.map((c, i) => (
        <BreadcrumbItem
          key={i}
          isCurrent={i === crumbs.length - 1}
          onPress={c.to ? () => navigate(c.to as string) : undefined}
        >
          {c.label}
        </BreadcrumbItem>
      ))}
    </HeroBreadcrumbs>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>;
}

export function PageHeader({
  title,
  icon,
  subtitle,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Typography type="h3" className="flex items-center gap-3 text-foreground">
          {icon && <span className="text-secondary" aria-hidden>{icon}</span>}
          {title}
        </Typography>
        {subtitle && <Typography type="body-sm" className="mt-1 text-default-500">{subtitle}</Typography>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Spinner color="secondary" />
      <Typography type="body-sm" className="text-default-500">{label}</Typography>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-4xl">⚠️</div>
      <Typography type="h5" className="text-foreground">Something went wrong</Typography>
      <Typography type="body-sm" className="text-default-500">{message}</Typography>
      {onRetry && (
        <Button color="primary" variant="flat" className="mt-2" onPress={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📦', title, message }: { icon?: ReactNode; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="text-4xl text-default-400">{icon}</div>
      <Typography type="h5" className="text-foreground">{title}</Typography>
      {message && <Typography type="body-sm" className="text-default-500">{message}</Typography>}
    </div>
  );
}
