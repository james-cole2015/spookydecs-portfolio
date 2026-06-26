/**
 * App — single public landing page. No router: every path renders the landing,
 * and CloudFront's 403/404 → /index.html rule keeps deep links / refreshes on the
 * SPA. The page is anonymous — no auth bundle, no env gate.
 */
import Landing from './pages/Landing';

export default function App() {
  return <Landing />;
}
