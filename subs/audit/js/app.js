async function init() {
    try {
        await window.SpookyConfig.get();
    } catch (err) {
        console.warn('SpookyConfig not available:', err);
    }
    if (!window.SpookyAuth.enforceEnvAccess()) return;
    initRouter();
}

init();
