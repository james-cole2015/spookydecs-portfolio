/**
 * IssueCard.js
 * Shared issue card component — used by kanban and timeline views.
 * Stub until those views are built.
 */

const IssueCard = (() => {
  function render(issue) {
    return `<div class="issue-card">${issue.title}</div>`;
  }
  return { render };
})();
