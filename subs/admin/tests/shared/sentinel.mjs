/**
 * Sentinel fixture for the admin suite (#623). The admin sub owns no data of its own: it edits items (search text),
 * creates Receptacle items (Add Outlet) and attaches photos to other subs' records, so every sentinel is an item,
 * idea or maintenance record carrying SENTINEL_MARKER (marker+sweep; ids are server-generated). Cascade deleting the
 * item removes its maintenance records.
 */
import { createSentinelItem as makeItem, createSentinelIdea as makeIdea, sweepItemsAndIdeas } from '../../../_e2e/shared/entities.mjs';
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
export { findSentinelItems, findSentinelIdeas } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E ADMIN SENTINEL - safe to delete';

export const createSentinelItem = (api, label) => makeItem(api, SENTINEL_MARKER, label);
export const createSentinelIdea = (api, label) => makeIdea(api, SENTINEL_MARKER, label);
export const sweepSentinels = (api) => sweepItemsAndIdeas(api, SENTINEL_MARKER);
