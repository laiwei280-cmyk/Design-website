(() => {
  'use strict';
  const mounted = new WeakMap();

  function mount(root) {
    if (!root || mounted.has(root)) return;
    const poster = root.querySelector('img');
    const source = root.dataset.crewPrototype;
    if (!poster || !source) return;
    root.classList.add('crew-composition');
    const windows = [];
    for (const [mode, title] of [['expanded','船员档案展开视图，可点击姓名收起或展开'],['compact','船员档案表格视图，可点击姓名展开或收起']]) {
      const slot = document.createElement('div');
      slot.className = 'crew-screen crew-screen-' + mode;
      const frame = document.createElement('iframe');
      const url = new URL(source, document.baseURI);
      url.searchParams.set('embed', '1');
      url.searchParams.set('view', mode);
      frame.src = url.href;
      frame.title = title;
      frame.width = '1440';
      frame.height = '800';
      frame.loading = 'lazy';
      frame.setAttribute('scrolling', 'no');
      slot.append(frame);
      root.append(slot);
      windows.push({slot,mode});
    }
    const mask = new Image();
    mask.className = 'crew-front-mask';
    mask.src = poster.currentSrc || poster.src;
    mask.alt = '';
    mask.setAttribute('aria-hidden','true');
    mask.draggable = false;
    root.append(mask);
    const refreshMask = () => { mask.src = poster.currentSrc || poster.src; };
    const resize = () => {
      if (root.classList.contains('preview-artwork')) {
        const parent = root.parentElement;
        const width = Math.min(parent.clientWidth, parent.clientHeight * 16 / 9);
        if (width > 0) root.style.width = width + 'px';
      }
      for (const {slot,mode} of windows) root.style.setProperty('--crew-' + mode + '-scale',String(slot.getBoundingClientRect().width / 1440));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    if (root.classList.contains('preview-artwork') && root.parentElement) observer.observe(root.parentElement);
    poster.addEventListener('load',refreshMask);
    mounted.set(root,() => {observer.disconnect();poster.removeEventListener('load',refreshMask);root.querySelectorAll('.crew-screen,.crew-front-mask').forEach(n=>n.remove());});
    resize();
  }
  function unmount(root) { mounted.get(root)?.(); mounted.delete(root); }
  window.CrewPortfolio = {mount,unmount};
  document.querySelectorAll('.crew-composition[data-crew-prototype]').forEach(mount);
})();
