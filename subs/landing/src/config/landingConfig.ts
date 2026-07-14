/**
 * Landing-page configuration — single source of truth for the externally-facing
 * constants the page links to. Kept deliberately small and declarative.
 */

/**
 * Where a logged-in demo visitor lands — the admin console. This is the
 * post-login destination, passed as the `redirect` to the real auth flow.
 */
export const DEMO_ADMIN_URL = 'https://demo-admin.spookydecs.com';

/**
 * Primary "Enter the demo" destination (#365): the genuine Cognito login at
 * auth.spookydecs.com, which redirects to demo-admin after sign-in. The visitor
 * mints a throwaway identity in-page (Generate), then pastes those creds here.
 * Showcasing the real auth is a deliberate portfolio plus, not friction.
 */
export const ENTER_DEMO_URL = `https://auth.spookydecs.com/?redirect=${encodeURIComponent(DEMO_ADMIN_URL)}`;

/**
 * Path appended to `API_ENDPOINT` (from SpookyConfig) for the ephemeral demo-user
 * mint. Public, unauthenticated, demo-stage only. Rate-limited (interim throttle;
 * #368 owns real abuse controls).
 */
export const MINT_SESSION_PATH = '/demo/session';

/** Public gallery, linked from the preview strip. */
export const DEMO_GALLERY_URL = 'https://gallery.spookydecs.com';

/** Public portfolio / architecture showcase (GitHub Pages — Portfolio/docs/). */
export const PORTFOLIO_URL = 'https://james-cole2015.github.io/spookydecs-portfolio/';

/** What a technical reviewer finds on the portfolio page — drives the deep-dive section. */
export const PORTFOLIO_HIGHLIGHTS = [
  'Interactive system-architecture diagram',
  'Serverless AWS design (Lambda, DynamoDB, API Gateway, CloudFront)',
  'Auth: Cognito + Lambda@Edge, RBAC, per-env isolation',
  'Bedrock agentic AI: Iris, Igor, Inspector Gadget',
  'Event-driven cross-sub sync (EventBridge + SQS)',
];

/** The three agentic systems — the headline portfolio signal in the hero. */
export interface AgenticSystem {
  name: string;
  emoji: string;
  /** One-line "what it is" — Bedrock/agentic framing, legible at a glance. */
  blurb: string;
  /** Where to read more (a live sub or showcase), opened in a new tab. */
  href: string;
}

export const AGENTIC_SYSTEMS: AgenticSystem[] = [
  {
    name: 'Iris',
    emoji: '🤖',
    blurb: 'Bedrock/Claude agentic assistant — a tool-use loop in the admin console that resolves storage IDs, packs items, and writes maintenance records.',
    href: 'https://demo-admin.spookydecs.com',
  },
  {
    name: 'Igor',
    emoji: '🧪',
    blurb: 'Multi-agent Bedrock fan-out that enriches submitted ideas — the Ideas Agent that researches, costs, and tags a build.',
    href: 'https://demo-ideas.spookydecs.com',
  },
  {
    name: 'Inspector Gadget',
    emoji: '🔍',
    blurb: 'Agentic rule-resolution pipeline: evaluators detect violations, an agentic loop annotates them, a deterministic executor resolves them.',
    href: 'https://demo-inspector.spookydecs.com',
  },
];

/** Static gallery preview tiles (v1 — live gallery-API fetch deferred). */
export interface GalleryTile {
  label: string;
  emoji: string;
  /** A CSS gradient used as the tile background (asset-free v1). */
  gradient: string;
}

export const GALLERY_TILES: GalleryTile[] = [
  { label: 'Haunted yard', emoji: '🎃', gradient: 'linear-gradient(135deg,#ff7518,#8b5cf6)' },
  { label: 'Light show', emoji: '🎄', gradient: 'linear-gradient(135deg,#16a34a,#dc2626)' },
  { label: 'Workshop builds', emoji: '🛠️', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)' },
  { label: 'Community displays', emoji: '🌟', gradient: 'linear-gradient(135deg,#f59e0b,#ec4899)' },
];

/** AWS/architecture one-liners for the hero tech blurb. */
export const TECH_HIGHLIGHTS = [
  'Serverless on AWS',
  'Lambda · DynamoDB · API Gateway',
  'CloudFront + S3 per-subdomain',
  'Cognito + Lambda@Edge auth',
  'Bedrock agentic AI',
  'EventBridge cross-sub sync',
];
