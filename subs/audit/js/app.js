async function init() {
    try {
        await window.SpookyConfig.get();
    } catch (err) {
        console.warn('SpookyConfig not available:', err);
    }
    initRouter();
}

init();
