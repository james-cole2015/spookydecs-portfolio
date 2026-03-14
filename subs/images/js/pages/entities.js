// Entities List Page — groups photos by item_id / storage_id
import { fetchImages, fetchIdeas } from '../utils/images-api.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { navigate } from '../utils/router.js';

const TYPE_ITEM = 'item';
const TYPE_STORAGE = 'storage';
const TYPE_IDEA = 'idea';

export async function renderEntitiesPage() {
  const app = document.getElementById('app');

  // Read active type filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const activeTypes = new Set(urlParams.getAll('type'));

  app.innerHTML = `
    <div class="entities-page">
      <div class="entities-header">
        <h1>Entities</h1>
        <div class="entity-filter-buttons">
          <button class="entity-filter-btn ${activeTypes.has(TYPE_ITEM) ? 'active' : ''}" data-type="${TYPE_ITEM}">Items</button>
          <button class="entity-filter-btn ${activeTypes.has(TYPE_STORAGE) ? 'active' : ''}" data-type="${TYPE_STORAGE}">Storage</button>
          <button class="entity-filter-btn ${activeTypes.has(TYPE_IDEA) ? 'active' : ''}" data-type="${TYPE_IDEA}">Ideas</button>
        </div>
      </div>
      <div id="entities-grid-container">
        <div class="loading">Loading entities...</div>
      </div>
    </div>
  `;

  app.prepend(Breadcrumb([
    { label: 'Images', path: '/images' },
    { label: 'Entities' }
  ]));

  // Wire up filter buttons
  app.querySelectorAll('.entity-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const nowActive = new Set(
        [...app.querySelectorAll('.entity-filter-btn.active')].map(b => b.dataset.type)
      );
      updateTypeFilter(nowActive);
    });
  });

  // Load photos and build entity list
  let allPhotos;
  try {
    allPhotos = await fetchImages({ limit: 500 });
  } catch {
    document.getElementById('entities-grid-container').innerHTML = `
      <div class="error-state">
        <p>Failed to load entities.</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
    return;
  }

  const { itemsMap, storageMap, ideasMap } = groupByEntity(allPhotos);

  const ideaTitles = new Map();
  if (ideasMap.size > 0) {
    try {
      const ideas = await fetchIdeas();
      ideas.forEach(idea => { if (idea.id && idea.title) ideaTitles.set(idea.id, idea.title); });
    } catch { /* fall back to IDs */ }
  }

  renderGrid(itemsMap, storageMap, ideasMap, activeTypes, ideaTitles);

  function updateTypeFilter(types) {
    const params = new URLSearchParams();
    types.forEach(t => params.append('type', t));
    const search = params.toString();
    history.pushState({}, '', search ? `?${search}` : window.location.pathname);
    renderGrid(itemsMap, storageMap, ideasMap, types, ideaTitles);
  }
}

function groupByEntity(photos) {
  const itemsMap = new Map();
  const storageMap = new Map();
  const ideasMap = new Map();

  photos.forEach(photo => {
    if (photo.item_id) addToMap(itemsMap, photo.item_id, TYPE_ITEM, photo);
    if (photo.storage_id) addToMap(storageMap, photo.storage_id, TYPE_STORAGE, photo);
    if (photo.idea_id) addToMap(ideasMap, photo.idea_id, TYPE_IDEA, photo);
  });

  return { itemsMap, storageMap, ideasMap };
}

function addToMap(map, entityId, type, photo) {
  if (!map.has(entityId)) {
    map.set(entityId, {
      id: entityId,
      type,
      photos: [],
      primaryPhoto: null,
      count: 0,
      seasons: new Set(),
      itemClass: null
    });
  }
  const entry = map.get(entityId);
  entry.photos.push(photo);
  entry.count++;
  if (photo.season) entry.seasons.add(photo.season.toLowerCase());
  if (!entry.itemClass && photo.item_class) entry.itemClass = photo.item_class;
  if (!entry.primaryPhoto && photo.is_primary) entry.primaryPhoto = photo;
  // Fallback: use first photo if no primary found yet
  if (!entry.primaryPhoto && entry.photos.length === 1) entry.primaryPhoto = photo;
}

function renderGrid(itemsMap, storageMap, ideasMap, activeTypes, ideaTitles = new Map()) {
  const container = document.getElementById('entities-grid-container');

  // Determine which maps to show (size 0 = no filter = show all)
  const showItems = activeTypes.size === 0 || activeTypes.has(TYPE_ITEM);
  const showStorage = activeTypes.size === 0 || activeTypes.has(TYPE_STORAGE);
  const showIdeas = activeTypes.size === 0 || activeTypes.has(TYPE_IDEA);

  const entities = [];
  if (showItems) entities.push(...itemsMap.values());
  if (showStorage) entities.push(...storageMap.values());
  if (showIdeas) entities.push(...ideasMap.values());

  // Sort by entity ID
  entities.sort((a, b) => a.id.localeCompare(b.id));

  if (entities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No entities found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="results-count">${entities.length} entit${entities.length === 1 ? 'y' : 'ies'}</div>
    <div class="entities-grid"></div>
  `;

  const grid = container.querySelector('.entities-grid');
  entities.forEach(entity => {
    grid.appendChild(createEntityCard(entity, ideaTitles));
  });
}

function createEntityCard(entity, ideaTitles = new Map()) {
  const card = document.createElement('div');
  card.className = 'entity-card';

  const thumb = entity.primaryPhoto?.thumb_cloudfront_url || entity.primaryPhoto?.cloudfront_url;
  const photoImg = thumb
    ? `<img src="${thumb}" alt="${entity.id}" loading="lazy" />`
    : `<div class="entity-card-no-photo">No Photo</div>`;

  const seasonBadges = [...entity.seasons]
    .map(s => `<span class="season-badge season-${s}">${s}</span>`)
    .join('');

  const classBadge = entity.itemClass
    ? `<span class="entity-class-badge">${entity.itemClass}</span>`
    : '';

  const typeLabel = entity.type === TYPE_STORAGE ? 'Storage' : entity.type === TYPE_IDEA ? 'Idea' : 'Item';
  const displayName = entity.type === TYPE_IDEA
    ? (ideaTitles.get(entity.id) || entity.id)
    : entity.id;

  card.innerHTML = `
    <div class="entity-card-photo">${photoImg}</div>
    <div class="entity-card-body">
      <div class="entity-card-id">${displayName}</div>
      <div class="entity-card-meta">
        <span class="entity-type-label">${typeLabel}</span>
        ${classBadge}
      </div>
      <div class="entity-card-count">${entity.count} photo${entity.count === 1 ? '' : 's'}</div>
      <div class="entity-card-seasons">${seasonBadges}</div>
    </div>
  `;

  card.addEventListener('click', () => {
    navigate(`/images/entities/${entity.id}?type=${entity.type}`);
  });

  return card;
}
