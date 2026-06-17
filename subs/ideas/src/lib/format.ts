// Small framework-agnostic helpers ported from the vanilla idea-detail-utils.js.

/** Format an ISO date (date-only or datetime) as "Mon D, YYYY". */
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Format a duration in minutes as "Xh Ym" / "Ym". */
export function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Extract a YouTube video ID from a URL, or return null. */
export function getYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0];
    } else if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1].split('?')[0];
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1].split('?')[0];
      else id = u.searchParams.get('v');
    }
    return id && /^[\w-]{5,15}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** The hero image URL for an idea: first image → YouTube thumb → null (placeholder). */
export function heroImageUrl(images: string[] | undefined, link?: string): string | null {
  if (images && images.length) return images[0];
  const yt = getYoutubeId(link);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
}

/** Normalize a materials list (strings or {name,done}) to {name,done} objects. */
export function normalizeMaterials(
  materials?: Array<{ name: string; done?: boolean } | string>,
): Array<{ name: string; done: boolean }> {
  return (materials || []).map((m) =>
    typeof m === 'string' ? { name: m, done: false } : { name: m.name, done: !!m.done },
  );
}
