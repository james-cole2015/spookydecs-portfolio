/**
 * milestones.js
 * Static milestone (epic) data — source of truth for all 25 milestones.
 * Derived from app_docs/milestone_names.json.
 *
 * Exports window.MilestoneData with:
 *   toSlug(name)      — canonical slug function (e.g. "Crystal Lake" → "crystal-lake")
 *   getAll()          — returns the full MILESTONES array
 *   getBySlug(slug)   — find a milestone by its slug, or null
 */

window.MilestoneData = (() => {

  // Note: "Macy's" → "macy-s" (apostrophe stripped by the regex below)
  function toSlug(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const MILESTONES = [
    { name: 'MVP 1',          status: 'completed'   },
    { name: 'Overlook',       status: 'in_progress' },
    { name: 'Crystal Lake',   status: 'planned'     },
    { name: 'Haddonfield',    status: 'planning'    },
    { name: 'Nostromo',       status: 'not_planned' },
    { name: 'Bates',          status: 'not_planned' },
    { name: 'Elm Street',     status: 'not_planned' },
    { name: 'Dakota',         status: 'not_planned' },
    { name: 'Erebus',         status: 'not_planned' },
    { name: 'Bodega Bay',     status: 'not_planned' },
    { name: 'Paxin',          status: 'not_planned' },
    { name: 'Castle Rock',    status: 'not_planned' },
    { name: 'Woodsboro',      status: 'not_planned' },
    { name: 'Nakatomi',       status: 'not_planned' },
    { name: 'Winnetka',       status: 'not_planned' },
    { name: 'Rockefeller',    status: 'not_planned' },
    { name: 'Klaus',          status: 'not_planned' },
    { name: 'Whoville',       status: 'not_planned' },
    { name: 'Bedford Falls',  status: 'not_planned' },
    { name: 'Hohman',         status: 'not_planned' },
    { name: 'Cratchit',       status: 'not_planned' },
    { name: 'Graceland',      status: 'not_planned' },
    { name: "Macy's",         status: 'not_planned' },
    { name: 'Christmastown',  status: 'not_planned' },
    { name: 'The Express',    status: 'not_planned' },
  ];

  function getAll() {
    return MILESTONES;
  }

  function getBySlug(slug) {
    return MILESTONES.find(m => toSlug(m.name) === slug) || null;
  }

  return { MILESTONES, toSlug, getAll, getBySlug };
})();
