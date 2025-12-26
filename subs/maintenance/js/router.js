export function initRouter() {
  // Keep hash: false since your server is configured correctly
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Router initialized');
  console.log('📍 Current location:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  // Initialize main table view (persistent)
  mainTableView = new MainTableView();
  console.log('✅ MainTableView instance created');
  
  // Define routes - MOST SPECIFIC FIRST
  router
    .on('/', async () => {
      console.log('✅ Route matched: /');
      await handleMainView();
    })
    // Literal /create route - MUST come before /:itemId
    .on('/create', async (match) => {
      console.log('✅ Route matched: /create');
      console.log('   Query params:', window.location.search);
      await handleCreateView(match);
    })
    // Edit route - 3 segments
    .on('/:itemId/:recordId/edit', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId/edit', match.data);
      await handleEditView(match);
    })
    // Record detail - 2 segments
    .on('/:itemId/:recordId', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId', match.data);
      await handleRecordDetailView(match);
    })
    // Item detail - 1 segment (LAST - most generic)
    .on('/:itemId', async (match) => {
      console.log('✅ Route matched: /:itemId', match.data);
      
      // Safety guard (shouldn't be needed if routing works)
      if (match.data.itemId === 'create') {
        console.error('❌ BUG: /create matched /:itemId instead of /create route!');
        console.error('   This indicates Navigo is not matching routes in order');
        await handleCreateView(match);
        return;
      }
      
      await handleItemDetailView(match);
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND');
      console.log('   Current path:', window.location.pathname);
      console.log('   Current href:', window.location.href);
      renderNotFound();
    });
  
  // Resolve initial route
  console.log('🚀 Resolving initial route...');
  console.log('🚀 About to resolve path:', window.location.pathname);
  router.resolve();
}