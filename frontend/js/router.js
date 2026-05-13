/**
 * Router — 视图切换
 */
import { state } from './shared/state.js';

const views = ['chat', 'interview', 'history'];

export function switchView(viewName) {
  if (!views.includes(viewName)) return;
  state.currentView = viewName;

  document.querySelectorAll('.view-container').forEach(el => {
    el.style.display = 'none';
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) target.style.display = '';

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  window.dispatchEvent(new CustomEvent('viewchanged', {
    detail: { view: viewName }
  }));
}

export function getCurrentView() {
  return state.currentView;
}
