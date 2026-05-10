/**
 * router.js
 * Navigo router setup.
 *
 * Routes:
 *   /tracker                         → landing hub
 *   /tracker/priority                → issues card grid
 *   /tracker/epics                   → epics list
 *   /tracker/epics/:slug             → epic detail
 *   /tracker/epics/:slug/:issue      → issue detail
 *   /tracker/new-issue               → create new issue
 */

const Router = (() => {
  let router;

  function init() {
    router = new Navigo('/tracker', { hash: false });

    router
      .on('/', () => {
        LandingPage.render();
      })

      .on('/priority', () => {
        PriorityListPage.render();
      })

      .on('/new-issue', () => {
        CreateIssuePage.render();
      })

      .on('/epics', () => {
        EpicsListPage.render();
      })

      // Epic detail: /tracker/epics/:slug
      .on('/epics/:slug', ({ data }) => {
        EpicDetailPage.render({ slug: data.slug });
      })

      // Issue detail: /tracker/epics/:slug/:issue
      .on('/epics/:slug/:issue', ({ data }) => {
        IssueDetailPage.render({ epic: data.slug, issue: data.issue });
      })

      .notFound(() => {
        router.navigate('/');
      });

    router.resolve();
  }

  function navigate(path) {
    router.navigate(path);
  }

  return { init, navigate };
})();
