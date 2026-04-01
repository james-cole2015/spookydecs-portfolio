/**
 * EpicFilter.js — stub.
 */
const EpicFilter = (() => {
  function render(epics, selected, onChange) {
    return `<select>${epics.map(e => `<option value="${e.PK}">${e.title}</option>`).join('')}</select>`;
  }
  return { render };
})();
