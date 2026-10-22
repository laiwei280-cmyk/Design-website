(() => {
  'use strict';
  const mounted = new WeakMap();
  function mount(root) {
    if(!root || mounted.has(root)) return;
    const poster=root.querySelector('img');
    const source=root.dataset.vesselPrototype;
    if(!poster || !source) return;
    root.classList.add('vessel-composition');
    const slot=document.createElement('div');
    slot.className='vessel-prototype-window';
    slot.setAttribute('aria-label','船舶管理交互原型');
    const hotspots=document.createElement('div');
    hotspots.className='vessel-hotspots';
    let trigger;
    for(let index=0;index<6;index++) {
      const card=document.createElement(index===0?'button':'div');
      card.className='vessel-card-hit';
      card.style.left=(38.6667+(index%3)*1222.2222)+'px';
      card.style.top=(835.4444+Math.floor(index/3)*733.3333)+'px';
      if(index===0) {
        card.type='button';card.setAttribute('aria-label','CNC101030，查看航线跟踪');trigger=card;
      } else card.setAttribute('aria-hidden','true');
      hotspots.append(card);
    }
    const live=document.createElement('div');
    live.className='vessel-live';live.inert=true;live.setAttribute('aria-hidden','true');
    const frame=document.createElement('iframe');
    frame.className='vessel-frame';frame.title='船舶管理与航线跟踪可点击原型';
    frame.width='1440';frame.height='800';frame.tabIndex=-1;
    const url=new URL(source,document.baseURI);url.hash='tracking';
    live.append(frame);slot.append(hotspots,live);root.append(slot);
    const mini=document.createElement('button');
    mini.type='button';mini.className='vessel-mini-entry';mini.setAttribute('aria-label','体验卡片视图航线跟踪原型');root.append(mini);
    let disposed=false,loaded=false,requestedOpen=false,requestId=0;
    function resize() {
      if(root.classList.contains('preview-artwork')) {
        const parent=root.parentElement;
        const width=Math.min(parent.clientWidth,parent.clientHeight*16/9);
        if(width>0) root.style.width=width+'px';
      }
      const scale=root.getBoundingClientRect().width/7680;
      root.style.setProperty('--vessel-artwork-scale',String(scale));
      root.style.setProperty('--vessel-prototype-scale',String(scale*55/18));
    }
    function navigate() {frame.contentWindow.postMessage({type:'shenghang:navigate',screen:'tracking',requestId},'*');}
    function open(event) {
      event.preventDefault();event.stopPropagation();resize();
      requestedOpen=true;requestId++;
      if(loaded) navigate();
    }
    async function reveal(id) {
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(disposed || !requestedOpen || requestId!==id) return;
      live.classList.add('is-open');live.inert=false;live.setAttribute('aria-hidden','false');hotspots.inert=true;
      frame.focus({preventScroll:true});
    }
    function close() {
      requestedOpen=false;requestId++;
      live.classList.remove('is-open');live.inert=true;live.setAttribute('aria-hidden','true');hotspots.inert=false;
      trigger.focus({preventScroll:true});
    }
    function message(event) {
      if(event.source!==frame.contentWindow || disposed) return;
      const data=event.data;
      if(data?.type==='shenghang:screen' && data.screen==='overview') close();
      if(data?.type==='shenghang:ready') {
        loaded=true;live.dataset.ready='true';
        if(!requestedOpen || data.screen!=='tracking') return;
        if(data.requestId===requestId) reveal(requestId);
        else if(data.requestId==null) navigate();
      }
    }
    function keydown(event) {
      if(event.key==='Escape' && requestedOpen && root.contains(document.activeElement)) {
        event.preventDefault();close();
      }
    }
    trigger.addEventListener('click',open);mini.addEventListener('click',open);
    slot.addEventListener('click',event=>event.stopPropagation());
    frame.addEventListener('load',()=>{loaded=true;if(requestedOpen)navigate();});
    window.addEventListener('message',message);window.addEventListener('keydown',keydown);
    const observer=new ResizeObserver(resize);observer.observe(root);
    if(root.classList.contains('preview-artwork') && root.parentElement)observer.observe(root.parentElement);
    mounted.set(root,()=>{
      disposed=true;requestedOpen=false;requestId++;observer.disconnect();
      window.removeEventListener('message',message);window.removeEventListener('keydown',keydown);
      slot.remove();mini.remove();
    });
    resize();frame.src=url.href;
  }
  function unmount(root) {mounted.get(root)?.();mounted.delete(root);}
  window.VesselPortfolio={mount,unmount};
  document.querySelectorAll('.vessel-composition[data-vessel-prototype]').forEach(mount);
})();
