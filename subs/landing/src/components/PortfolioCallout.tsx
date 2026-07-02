/**
 * PortfolioCallout — "for technical reviewers" deep-dive section linking out to
 * the public portfolio / architecture showcase (GitHub Pages). The demo lets you
 * click around the app; the portfolio page explains how it's built.
 */
import { Button, Card, CardBody } from '@heroui/react';
import { ArrowUpRight, Check } from 'lucide-react';
import { PORTFOLIO_HIGHLIGHTS, PORTFOLIO_URL } from '../config/landingConfig';

export function PortfolioCallout() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <Card className="border border-default-200 bg-content1">
        <CardBody className="gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-1 text-sm font-medium uppercase tracking-wide sd-accent-text">
              Under the hood
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              How it’s built — the architecture deep-dive
            </h2>
            <p className="mt-2 text-sm text-default-600">
              The demo lets you click around the app. The portfolio page walks through the system
              design — an interactive architecture diagram, the AWS services, the auth model, and the
              agentic AI — built and run by one engineer.
            </p>
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {PORTFOLIO_HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-default-600">
                  <Check size={15} className="mt-0.5 shrink-0 sd-accent-text" aria-hidden="true" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0">
            <Button
              as="a"
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer"
              size="lg"
              endContent={<ArrowUpRight size={18} />}
              className="sd-cta font-semibold"
            >
              View the portfolio
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
