/**
 * landing.js
 * Tracker landing hub — 4 navigation cards.
 */

const LandingPage = (() => {

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="landing-page">
        <div class="landing-header">
          <h1 class="landing-title">Tracker</h1>
          <p class="landing-subtitle">Issue and epic management</p>
        </div>
        <div class="landing-cards">
          ${buildCard({
            href:    '/priority',
            icon:    '↕',
            title:   'Priority View',
            desc:    'All issues ranked by priority. Drag to reorder.',
          })}
          ${buildCard({
            href:    '/epics',
            icon:    '◈',
            title:   'Epics',
            desc:    'Browse and manage epics with progress tracking.',
          })}
          ${buildCard({
            href:    '/timeline',
            icon:    '→',
            title:   'Timeline',
            desc:    'Active epics at a glance.',
          })}
          ${buildCard({
            href:    '/new-issue',
            icon:    '+',
            title:   'Create Issue',
            desc:    'Log a new issue and assign it to an epic.',
          })}
        </div>
      </div>
    `;

    app.querySelectorAll('.landing-card').forEach(card => {
      card.addEventListener('click', e => {
        e.preventDefault();
        Router.navigate(card.dataset.href);
      });
    });
  }

  function buildCard({ href, icon, title, desc }) {
    return `
      <a class="landing-card" data-href="${href}" href="/tracker${href}">
        <span class="landing-card-icon">${icon}</span>
        <div class="landing-card-title">${title}</div>
        <div class="landing-card-desc">${desc}</div>
      </a>
    `;
  }

  return { render };
})();
