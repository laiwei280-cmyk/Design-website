(() => {
  'use strict';
  const canvas = document.getElementById('canvas');
  const overview = document.getElementById('overview');
  const tracking = document.getElementById('tracking');
  const back = document.getElementById('return');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  // Decode every bitmap, including the two initially hidden activity states.
  const assetsReady = Promise.all([...document.images].map(img => img.decode()));
  const names = ['CNC101030，南京至东京，停靠中','CNC101034，南京至釜山，待启航','CNC101040，南京至东京，已到达','CNC101051，南京至迪拜，停靠中','CNC101046，南京至越南，停靠中','CNC101042，南京至新加坡，待启航','船舶卡片7','船舶卡片8','船舶卡片9'];
  names.forEach((name,i) => {
    const target = document.createElement(i === 0 ? 'button' : 'div');
    target.className = 'card' + (i === 0 ? ' hotspot' : ' static');
    target.style.left = (16 + (i % 3) * 400) + 'px';
    target.style.top = (206 + Math.floor(i / 3) * 240) + 'px';
    target.dataset.card = String(i + 1);
    target.setAttribute('aria-label',name + (i === 0 ? '，查看航线跟踪' : ''));
    if (i === 0) target.addEventListener('click',() => { location.hash = 'tracking'; });
    document.getElementById('cards').appendChild(target);
  });
  function fit() {
    const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 800);
    canvas.style.transform = `scale(${scale})`;
    canvas.style.left = `${(window.innerWidth - 1440 * scale) / 2}px`;
    canvas.style.top = `${(window.innerHeight - 800 * scale) / 2}px`;
  }
  function selectTab(name,focus=false) {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById('activity-' + tab.dataset.tab).hidden = !selected;
      document.getElementById('panel-' + tab.dataset.tab).hidden = !selected;
      if (selected && focus) tab.focus({preventScroll:true});
    });
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',() => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown',event => {
      let next;
      if(event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if(event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if(event.key === 'Home') next = 0;
      if(event.key === 'End') next = tabs.length - 1;
      if(next !== undefined) { event.preventDefault(); selectTab(tabs[next].dataset.tab,true); }
    });
  });
  let initial = true;
  let activeScreen = overview;
  let navigationVersion = 0;
  let activeAnimation = null;
  let pendingRequestId = null;
  const painted = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  async function render(requestId = null) {
    const version = ++navigationVersion;
    const route = location.hash === '#tracking' || (window.parent !== window && location.hash !== '#overview');
    try { await assetsReady; } catch(error) { console.error('Prototype image failed to decode',error); return; }
    if(version !== navigationVersion) return;
    selectTab('order');
    const screen = route ? tracking : overview;
    const previous = activeScreen;
    activeAnimation?.cancel();
    activeAnimation = null;
    screen.hidden = false;
    screen.style.zIndex = '2';
    screen.inert = false;
    previous.inert = previous !== screen;
    activeScreen = screen;
    const settle = () => {
      if(version !== navigationVersion) return;
      [overview,tracking].forEach(page => {
        page.hidden = page !== activeScreen;
        page.inert = page !== activeScreen;
        page.style.zIndex = '';
      });
      activeAnimation = null;
    };
    if(!initial && screen !== previous && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Fade the decoded incoming screen OVER the still-opaque outgoing screen.
      previous.hidden = false;
      previous.style.zIndex = '1';
      activeAnimation = screen.animate([{opacity:0},{opacity:1}],{duration:160,easing:'ease-out'});
      activeAnimation.finished.then(settle,() => {});
    } else settle();
    if(!initial && window.parent === window) (route ? back : document.querySelector('button.card')).focus({preventScroll:true});
    initial = false;
    document.title = route ? '航线跟踪 · 盛航股份' : '船舶管理平台 · 盛航股份';
    await painted();
    if(version !== navigationVersion) return;
    canvas.dataset.ready = 'true';
    if(window.parent !== window) {
      window.parent.postMessage({type:'shenghang:screen',screen:route ? 'tracking' : 'overview'},'*');
      window.parent.postMessage({type:'shenghang:ready',screen:route ? 'tracking' : 'overview',requestId},'*');
    }
  }
  back.addEventListener('click',() => {
    // Preserve the painted tracking frame while the parent fades back to the artwork.
    if(window.parent !== window) window.parent.postMessage({type:'shenghang:screen',screen:'overview'},'*');
    else location.hash = 'overview';
  });
  window.addEventListener('hashchange',() => {
    const requestId = pendingRequestId;
    pendingRequestId = null;
    render(requestId);
  });
  window.addEventListener('resize',fit);
  window.addEventListener('message',event => {
    if(event.source !== window.parent) return;
    if(event.data?.type === 'shenghang:navigate' && event.data.screen === 'tracking') {
      if(location.hash === '#tracking') render(event.data.requestId);
      else { pendingRequestId = event.data.requestId; location.hash = 'tracking'; }
    }
  });
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape' && window.parent !== window) window.parent.postMessage({type:'shenghang:screen',screen:'overview'},'*');
  });
  fit(); render();
})();
