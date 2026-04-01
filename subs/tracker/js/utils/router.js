/**
 * router.js
 * Navigo router setup.
 *
 * Routes:
 *   /tracker                         → landing hub (4 cards)
 *   /tracker/priority                → priority list
 *   /tracker/epics                   → epics list
 *   /tracker/epics/:slug             → epic detail
 *   /tracker/epics/:slug/:issue      → issue detail
 *   /tracker/new-issue               → create new issue
 *   /tracker/timeline                → timeline (active epics)
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

      .on('/timeline', () => {
        TimelinePage.render();
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
