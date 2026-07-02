/**
 * Landing — composes the four v1 content sections (per #364):
 *   hero (with agentic trio) · identity-gen placeholder · enter-demo CTA · gallery preview.
 * The CTA lives inside the Hero; the seasonal motif overlay sits behind everything.
 */
import { LandingHeader } from '../components/LandingHeader';
import { Hero } from '../components/Hero';
import { GalleryPreview } from '../components/GalleryPreview';
import { PortfolioCallout } from '../components/PortfolioCallout';

export default function Landing() {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <LandingHeader />
        <main>
          <Hero />
          <GalleryPreview />
          <PortfolioCallout />
        </main>
        <footer className="border-t border-default-200 py-6 text-center text-xs text-default-400">
          SpookyDecs — a serverless portfolio project on AWS. This is the live demo environment.
        </footer>
      </div>
    </div>
  );
}
