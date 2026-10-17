/**
 * Sentinel fixture for the workbench suite (#623). The workbench sub is read-only: it summarises
 * ideas and maintenance records, so every sentinel is an item,
 * idea or maintenance record carrying SENTINEL_MARKER (marker+sweep; ids are server-generated). Cascade deleting the
 * item removes its maintenance records.
 */
import { createSentinelItem as makeItem, createSentinelIdea as makeIdea, sweepItemsAndIdeas } from '../../../_e2e/shared/entities.mjs';
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
export { findSentinelItems, findSentinelIdeas } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E WORKBENCH SENTINEL - safe to delete';

export const createSentinelItem = (api, label) => makeItem(api, SENTINEL_MARKER, label);
export const createSentinelIdea = (api, label) => makeIdea(api, SENTINEL_MARKER, label);
export const sweepSentinels = (api) => sweepItemsAndIdeas(api, SENTINEL_MARKER);
