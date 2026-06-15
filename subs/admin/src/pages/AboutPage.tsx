/**
 * About — system overview page. Ported from pages/about.js. Static content; the
 * "Technical Stack" badges are updated to the React/HeroUI reality (the vanilla
 * page still listed "Vanilla JavaScript" + "Navigo Router").
 */
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { PageHeader, Typography } from '@spookydecs/ui';

const IRIS_CAPABILITIES = [
  'Answer questions about your inventory and deployments',
  'Aggregate data across multiple subdomains',
  'Provide spending analysis and cost insights',
  'Help locate items and track their status',
  'Suggest maintenance priorities and planning timelines',
];

const FEATURES = [
  { title: '📦 Items Management', body: 'Track decorations, lights, and accessories with detailed metadata, photos, and repair status.' },
  { title: '🗄️ Storage Organization', body: 'Manage totes, bins, and storage locations with visual inventory and packing workflows.' },
  { title: '🎯 Deployment Tracking', body: 'Plan and track seasonal deployments with historical records and configuration notes.' },
  { title: '💰 Finance Management', body: 'Track costs, receipts, and spending patterns across seasons and item categories.' },
  { title: '🔧 Maintenance Records', body: 'Schedule repairs, track maintenance history, and manage inspection workflows.' },
  { title: '📸 Photo Documentation', body: 'Visual catalog with image management and deployment reference photos.' },
];

const TECH_STACK = [
  'React',
  'TypeScript',
  'Vite',
  'HeroUI',
  'AWS S3 + CloudFront',
  'Lambda Functions',
  'Claude AI API',
];

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card shadow="sm" className="mb-4 bg-content1">
      <CardHeader>
        <Typography type="h5" className="flex items-center gap-2 text-foreground">
          <span aria-hidden>{icon}</span>
          {title}
        </Typography>
      </CardHeader>
      <CardBody className="gap-3 text-default-600">{children}</CardBody>
    </Card>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="About SpookyDecs"
        subtitle="A comprehensive holiday decoration management platform powered by AI."
      />

      <Section icon="🎃" title="What is SpookyDecs?">
        <p>
          SpookyDecs is an operational management platform designed to handle the complete lifecycle
          of large-scale holiday decoration deployments. From inventory tracking to storage
          organization, cost management to maintenance scheduling, SpookyDecs provides the tools
          needed to manage complex seasonal operations.
        </p>
        <p>
          Built with operational intelligence in mind, the platform integrates across multiple
          subdomains to provide a unified view of your decoration ecosystem while maintaining the
          flexibility to drill into specific areas when needed.
        </p>
      </Section>

      <Section icon="💬" title="Meet Iris">
        <p>
          Iris is your AI-powered assistant, designed to provide read-only insights and operational
          intelligence across the entire SpookyDecs ecosystem. Iris can:
        </p>
        <ul className="list-inside list-disc space-y-1">
          {IRIS_CAPABILITIES.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>
        <p>
          All Iris responses include clear assumptions and direct links back to authoritative data
          sources, ensuring you can always verify and explore further in the relevant subdomain.
        </p>
      </Section>

      <Section icon="🗺️" title="Platform Features">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-large bg-content2 p-4">
              <div className="mb-1 font-semibold text-foreground">{f.title}</div>
              <div className="text-small text-default-500">{f.body}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon="⚙️" title="Technical Stack">
        <p>
          SpookyDecs is built as a modern, modular web application with a focus on performance and
          maintainability:
        </p>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((tech) => (
            <Chip key={tech} variant="flat" color="secondary">
              {tech}
            </Chip>
          ))}
        </div>
      </Section>

      <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
        <Typography type="h5" className="text-foreground">
          Ready to explore?
        </Typography>
        <Button color="secondary" onPress={() => navigate('/admin')}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
