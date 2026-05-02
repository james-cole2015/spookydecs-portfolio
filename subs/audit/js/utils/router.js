let _router = null;

function initRouter() {
    _router = new Navigo('/', { hash: false });
    _router
        .on('/audit', () => renderRecordListPage())
        .notFound(() => _router.navigate('/audit'))
        .resolve();
}

function navigateTo(path) {
    if (_router) _router.navigate(path);
}
