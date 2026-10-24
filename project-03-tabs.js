(() => {
  const tablist = document.querySelector('.project-section-nav[role="tablist"]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const stages = new Map(tabs.map(tab => [tab.dataset.projectStage, document.getElementById(tab.getAttribute('aria-controls'))]));
  const stageFromHash = () => {
    if (location.hash === '#project-exploration') return 'exploration';
    if (location.hash === '#project-standards' || location.hash.startsWith('#spec-')) return 'standards';
    if (location.hash === '#main') return tabs.find(tab => tab.getAttribute('aria-selected') === 'true')?.dataset.projectStage || 'research';
    return 'research';
  };

  function selectStage(name, { updateUrl = false, scroll = false } = {}) {
    const chosen = tabs.find(tab => tab.dataset.projectStage === name);
    if (!chosen) return;
    for (const tab of tabs) {
      const selected = tab === chosen;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      stages.get(tab.dataset.projectStage).hidden = !selected;
    }
    if (updateUrl) history.pushState(null, '', '#' + chosen.getAttribute('aria-controls'));
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    if (name === 'standards' && typeof updateSpecNav === 'function') requestAnimationFrame(updateSpecNav);
  }

  for (const tab of tabs) tab.addEventListener('click', () => selectStage(tab.dataset.projectStage, { updateUrl: true, scroll: true }));
  tablist.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    selectStage(tabs[next].dataset.projectStage, { updateUrl: true, scroll: true });
  });
  const isStageEntry = () => ['', '#project-research', '#project-exploration', '#project-standards'].includes(location.hash);
  function syncLocation() {
    selectStage(stageFromHash(), { scroll: isStageEntry() });
  }
  function restoreStageTop() {
    // Native fragment navigation runs during loading, after the first tab selection.
    // Reset only stage entries; links into individual specification chapters keep their position.
    if (isStageEntry()) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  window.addEventListener('hashchange', syncLocation);
  window.addEventListener('popstate', syncLocation);
  window.addEventListener('pageshow', restoreStageTop);
  if (document.readyState === 'complete') restoreStageTop();
  else window.addEventListener('load', restoreStageTop, { once: true });
  syncLocation();
})();

// Keep artwork previews on the current page, with a second click to dismiss.
(() => {
  const links = [...document.querySelectorAll('.project-research-artwork > a')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const preview = document.createElement('dialog');
  preview.className = 'project-artwork-preview';
  preview.setAttribute('aria-labelledby', 'project-artwork-preview-title');
  preview.innerHTML = '<div class="project-artwork-preview-toolbar"><h2 id="project-artwork-preview-title">高清预览 · 再次点击退出</h2><button type="button" aria-label="关闭高清预览" autofocus>×</button></div><div class="project-artwork-preview-stage"><img alt=""></div>';
  document.body.append(preview);
  const image = preview.querySelector('img');
  const title = preview.querySelector('h2');
  const root = document.documentElement;
  let opener;
  let position = { x: 0, y: 0 };

  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      position = { x: window.scrollX, y: window.scrollY };
      const source = link.querySelector('img');
      image.src = link.href;
      image.alt = source.alt;
      title.textContent = (link.closest('#project-research') ? '调研' : '探索') + ' · 高清预览 · 再次点击退出';
      root.style.setProperty('--project-preview-gutter', Math.max(0, window.innerWidth - root.clientWidth) + 'px');
      root.classList.add('project-artwork-preview-open');
      preview.showModal();
    });
  }
  preview.addEventListener('click', () => preview.close());
  preview.addEventListener('close', () => {
    root.classList.remove('project-artwork-preview-open');
    root.style.removeProperty('--project-preview-gutter');
    image.removeAttribute('src');
    image.alt = '';
    window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });
})();
