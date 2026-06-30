/**
 * IdentityMintFlow — the self-service "dungeon entrance" (#365).
 *
 * Two-step, fully-manual flow (no token handling, no auto-login):
 *   1. Generate → POST {API_ENDPOINT}/demo/session (public, unauthenticated) mints a
 *      throwaway Cognito user (DCC-themed username + random permanent password,
 *      env:demo + role:admin) and returns the plaintext creds to copy.
 *   2. Enter → a plain link to the genuine auth.spookydecs.com login (redirect to
 *      demo-admin). The visitor pastes the creds and logs in through real Cognito.
 *
 * Showcasing the real auth flow is a deliberate portfolio plus. Enter stays disabled
 * until Generate succeeds, so the visitor always has creds in hand before they go.
 *
 * Credential hygiene (show-once): the minted creds live ONLY in in-memory React state —
 * never localStorage/sessionStorage — so a page reload or re-roll clears them. Enter
 * opens auth in a NEW tab (target=_blank) so the landing tab stays put and the creds
 * remain visible to copy/paste without persisting them anywhere. A warning makes the
 * show-once behavior explicit, mirroring how AWS/GitHub surface a secret exactly once.
 */
import { useState } from 'react';
import { Button, Snippet, Tooltip } from '@heroui/react';
import { AlertTriangle, ArrowRight, Dices, Loader2 } from 'lucide-react';
import { useConfig } from '@spookydecs/ui';
import { useSeason } from '../season/SeasonProvider';
import { SEASON_COPY } from '../season/seasons';
import { ENTER_DEMO_URL, MINT_SESSION_PATH } from '../config/landingConfig';

interface MintedIdentity {
  username: string;
  display_name: string;
  password: string;
}

type MintState = 'idle' | 'minting' | 'minted' | 'error';

export function IdentityMintFlow() {
  const { API_ENDPOINT } = useConfig();
  const { season } = useSeason();
  const copy = SEASON_COPY[season];

  const [state, setState] = useState<MintState>('idle');
  const [identity, setIdentity] = useState<MintedIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setState('minting');
    setError(null);
    try {
      const res = await fetch(`${API_ENDPOINT}${MINT_SESSION_PATH}`, { method: 'POST' });
      if (res.status === 429) {
        throw new Error('Too many crawlers entering at once — wait a moment and try again.');
      }
      if (!res.ok) throw new Error(`Mint failed (${res.status})`);
      const body = await res.json();
      const data: MintedIdentity = body?.data ?? body;
      if (!data?.username || !data?.password) throw new Error('Mint returned no credentials.');
      setIdentity(data);
      setState('minted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate an identity.');
      setState('error');
    }
  }

  const minting = state === 'minting';

  return (
    <div className="sd-chip flex flex-col gap-4 rounded-xl px-5 py-5 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-foreground">Generate your crawler identity</p>
        <p className="mt-1 text-sm text-foreground/70">
          Roll a throwaway demo login — full access, wiped at the weekly floor collapse. Copy the
          credentials, then enter through the real sign-in.
        </p>
      </div>

      {/* Minted credentials */}
      {identity && (
        <div className="flex flex-col gap-2 rounded-lg bg-foreground/5 p-3">
          <p className="text-sm text-foreground">
            You are <span className="font-semibold sd-accent-text">{identity.display_name}</span>.
          </p>
          <label className="text-xs uppercase tracking-wide text-foreground/60">Username</label>
          <Snippet symbol="" variant="bordered" size="sm" className="w-full" codeString={identity.username}>
            {identity.username}
          </Snippet>
          <label className="text-xs uppercase tracking-wide text-foreground/60">Password</label>
          <Snippet symbol="" variant="bordered" size="sm" className="w-full" codeString={identity.password}>
            {identity.password}
          </Snippet>
          <p className="flex items-start gap-1.5 text-xs font-medium text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Copy these now — for security they’re shown only once. They’ll disappear if you reload
              the page or re-roll. (You can always generate a new identity.)
            </span>
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onPress={handleGenerate}
          isDisabled={minting}
          size="lg"
          variant="bordered"
          startContent={
            minting ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />
          }
          className="font-semibold"
        >
          {minting ? 'Generating…' : identity ? 'Re-roll identity' : 'Generate identity'}
        </Button>

        <Tooltip
          content={
            identity
              ? 'Opens the real sign-in in a new tab — paste your username and password.'
              : 'Generate an identity first.'
          }
          placement="bottom"
        >
          {/* span wrapper keeps the tooltip working while the link is disabled */}
          <span className="inline-flex">
            <Button
              as={identity ? 'a' : 'button'}
              href={identity ? ENTER_DEMO_URL : undefined}
              target={identity ? '_blank' : undefined}
              rel={identity ? 'noopener noreferrer' : undefined}
              isDisabled={!identity}
              size="lg"
              endContent={<ArrowRight size={18} />}
              className="sd-cta font-semibold"
            >
              {copy.cta}
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
