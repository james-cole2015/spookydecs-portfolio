(() => {
  const layerLabels = {
    browser:     'USER LAYER',
    cloudfront:  'EDGE LAYER',
    lambdaedge:  'EDGE LAYER',
    apigw:       'API LAYER',
    lambda:      'COMPUTE LAYER',
    bedrock:     'COMPUTE LAYER',
    dynamodb:    'DATA LAYER',
    s3:          'DATA LAYER',
    cognito:     'DATA LAYER',
    eventbridge: 'EVENT LAYER',
    sqs:         'EVENT LAYER',
    cicd:        'DEVOPS LAYER',
  };

  const nodes = document.querySelectorAll('.arch-node');
  const detailDefault = document.getElementById('detail-default');
  const detailContent = document.getElementById('detail-content');
  const detailLayer   = document.getElementById('detail-layer');
  const detailTitle   = document.getElementById('detail-title');
  const detailDesc    = document.getElementById('detail-desc');

  let activeNode = null;

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const id    = node.dataset.id;
      const label = node.dataset.label;
      const desc  = node.dataset.desc;

      if (activeNode && activeNode !== node) {
        activeNode.classList.remove('active');
      }
      node.classList.toggle('active');
      activeNode = node.classList.contains('active') ? node : null;

      if (activeNode) {
        detailDefault.classList.add('hidden');
        detailContent.classList.remove('hidden');
        detailLayer.textContent = layerLabels[id] || '';
        detailTitle.textContent = label;
        detailDesc.textContent  = desc;
      } else {
        detailDefault.classList.remove('hidden');
        detailContent.classList.add('hidden');
      }
    });
  });

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Nav shadow on scroll + active link highlight
  const nav = document.getElementById('nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = ['about','architecture','services','subsystems','ai','highlights','whats-next','releases']
    .map(id => document.getElementById(id)).filter(Boolean);

  window.addEventListener('scroll', () => {
    nav.classList.toggle('shadow-lg', window.scrollY > 20);
    const mid = window.scrollY + window.innerHeight / 3;
    let current = '';
    sections.forEach(s => { if (s.offsetTop <= mid) current = s.id; });
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
  }, { passive: true });

  // Mobile menu toggle
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  document.querySelectorAll('.mobile-nav-link').forEach(l => {
    l.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });

  // Releases
  const RELEASES_URL = 'https://api.github.com/repos/james-cole2015/spookydecs-portfolio/releases';

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function mdToHtml(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h5 class="release-h5">$1</h5>')
      .replace(/^## (.+)$/gm, '<h4 class="release-h4">$1</h4>')
      .replace(/^# (.+)$/gm, '<h3 class="release-h3">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-300">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="release-code">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="release-li">$1</li>')
      .replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, m => `<ul class="release-ul">${m}</ul>`)
      .replace(/\n{2,}/g, '</p><p class="release-p">')
      .replace(/^(?!<[hul])(.+)$/gm, (m) => m.trim() ? m : '')
      .trim();
  }

  function renderRelease(release, isLatest) {
    const div = document.createElement('div');
    div.className = 'release-card' + (isLatest ? ' release-card-latest' : '');
    div.innerHTML = `
      <div class="release-header">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="release-tag">${release.tag_name}</span>
          ${isLatest ? '<span class="release-badge">Latest</span>' : ''}
          ${release.prerelease ? '<span class="release-badge release-badge-pre">Pre-release</span>' : ''}
        </div>
        <span class="release-date">${formatDate(release.published_at)}</span>
      </div>
      ${release.name && release.name !== release.tag_name ? `<div class="release-name">${release.name}</div>` : ''}
      ${release.body ? `<div class="release-body">${mdToHtml(release.body.trim())}</div>` : ''}
      <a href="${release.html_url}" target="_blank" class="release-link">View on GitHub ↗</a>
    `;
    return div;
  }

  fetch(RELEASES_URL)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(releases => {
      document.getElementById('releases-loading').classList.add('hidden');
      if (!releases.length) {
        document.getElementById('releases-error').classList.remove('hidden');
        document.getElementById('releases-error').textContent = 'No releases published yet.';
        return;
      }
      const list = document.getElementById('releases-list');
      releases.forEach((release, i) => list.appendChild(renderRelease(release, i === 0)));
      list.classList.remove('hidden');
    })
    .catch(() => {
      document.getElementById('releases-loading').classList.add('hidden');
      document.getElementById('releases-error').classList.remove('hidden');
    });
})();
