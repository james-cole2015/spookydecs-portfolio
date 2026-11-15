import { getDeployment, getDeploymentGraph, getHistoricalDeployment } from '../api/deploymentsApi';
import { DEPLOYMENT_CONFIG } from '../config/deploymentsConfig';
import type { GraphInput } from './graphDerivation';

export type RenderMode = 'live' | 'snapshot' | 'best-effort';

export interface LoadedGraph {
  mode: RenderMode;
  input: GraphInput;
  /** Deployment status — authoring is only offered while the deployment is still being set up. */
  status?: string;
  season?: string;
  year?: number | string;
}

export const EDITABLE_STATUSES = ['pre-deployment', 'active_setup'];

// Archives from before the historical handler grew a `graph` key have no zone records to
// read, so a placeholder root id is synthesized here.
export function zonesRecord(): GraphInput['zones'] {
  const record: GraphInput['zones'] = {};
  DEPLOYMENT_CONFIG.ZONES.forEach((z) => {
    record[z.zone_code] = { ...z, receptacle_ids: [`ROOT-${z.zone_code}`] };
  });
  return record;
}

/**
 * @param preferSnapshot completed deployments keep their frozen `graph_snapshot` on the record;
 *   the Items & Photos list (#689) reads it so teardown's item-status rewrites don't empty the list.
 */
export async function loadGraph(deploymentId: string, opts: { preferSnapshot?: boolean } = {}): Promise<LoadedGraph> {
  const depRes = await getDeployment(deploymentId);
  // getDeployment always wraps the record as { metadata }; read status/season from there.
  const meta = depRes?.data?.metadata ?? depRes?.data;
  const status = meta?.status;
  const season = meta?.season;
  const year = meta?.year;

  if (opts.preferSnapshot && status !== 'archived' && !EDITABLE_STATUSES.includes(status) && meta?.graph_snapshot) {
    return { mode: 'snapshot', input: meta.graph_snapshot as GraphInput, status, season, year };
  }

  if (status === 'archived') {
    const histRes = await getHistoricalDeployment(deploymentId);
    const graph = histRes?.data?.graph;
    if (graph?.snapshot) return { mode: 'snapshot', input: graph.snapshot, status, season, year };
    if (graph?.live) return { mode: 'best-effort', input: graph.live, status, season, year };
    // No graph key at all (very old archive, pre-#466 historical handler) — treat as empty.
    return { mode: 'best-effort', input: { zones: zonesRecord(), items: {}, connections: [], placements: [] }, status, season, year };
  }

  const graphRes = await getDeploymentGraph(deploymentId);
  return { mode: 'live', input: graphRes.data as GraphInput, status, season, year };
}
