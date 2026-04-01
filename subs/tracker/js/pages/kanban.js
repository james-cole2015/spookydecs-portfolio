/**
 * kanban.js
 * Kanban board page — stub.
 */

const KanbanPage = (() => {
  function render() {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                  font-family:var(--font-mono,monospace);color:var(--text-3,#55555f);font-size:13px;">
        Kanban — coming soon
      </div>`;
  }
  return { render };
})();
