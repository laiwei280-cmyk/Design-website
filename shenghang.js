// Native fragment links work without JavaScript. Enhance them with reading state.
const chapterLinks = [...document.querySelectorAll('.chapter-nav a')];
const chapters = chapterLinks.map(link => document.getElementById(link.hash.slice(1)));
const sectionGroupLinks = [...document.querySelectorAll('.project-section-link[data-chapters]')];
let scheduled = false;
function updateChapter() {
  scheduled = false;
  const threshold = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 12;
  let active = 0;
  chapters.forEach((chapter, index) => {
    if (chapter.getBoundingClientRect().top <= threshold) active = index;
  });
  // The final chapter may be shorter than the viewport.
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) active = chapters.length - 1;
  chapterLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  sectionGroupLinks.forEach(link => {
    const isCurrent = link.dataset.chapters.split(' ').includes(chapters[active]?.id);
    if (isCurrent) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function requestUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateChapter); }
}
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
window.addEventListener('pageshow', requestUpdate);
window.addEventListener('hashchange', requestUpdate);
updateChapter();

// Shared image viewer for every project using the case-slide structure.
const preview = document.createElement('dialog');
preview.className = 'case-image-preview';
preview.setAttribute('aria-labelledby', 'image-preview-title');
preview.innerHTML = '<div class="preview-toolbar"><h2 id="image-preview-title">高清预览 · 点击画面退出</h2><span class="preview-counter" role="status" aria-live="polite" aria-atomic="true"></span><button class="preview-close" type="button" aria-label="关闭高清预览" autofocus>×</button></div><button class="preview-step preview-prev" type="button" aria-label="上一张图片"><span aria-hidden="true">‹</span></button><div class="preview-stage" aria-busy="false"><img class="preview-artwork" alt=""></div><span class="preview-loading" role="status" hidden>作品加载中…</span><button class="preview-step preview-next" type="button" aria-label="下一张图片"><span aria-hidden="true">›</span></button>';
document.body.append(preview);
const previewStage = preview.querySelector('.preview-stage');
let previewImage = preview.querySelector('.preview-artwork');
const previewCounter = preview.querySelector('.preview-counter');
const previousButton = preview.querySelector('.preview-prev');
const nextButton = preview.querySelector('.preview-next');
const previewLoading = preview.querySelector('.preview-loading');
const previewSlides = [...document.querySelectorAll('.case-slide')];
const neighborPreloads = [new Image(), new Image()];
const reducedPreviewMotion = matchMedia('(prefers-reduced-motion: reduce)');
let previewIndex = 0;
let renderedPreviewIndex = -1;
let previewRequest = 0;
let slideAnimations = [];
let outgoingPreviewImage = null;
let previewOpener;

function unmountInteractive(node) {
  window.CrewPortfolio?.unmount(node);
  window.VesselPortfolio?.unmount(node);
}

function stopPreviewMotion() {
  slideAnimations.forEach(animation => animation.cancel());
  slideAnimations = [];
  outgoingPreviewImage?.pause?.();
  if (outgoingPreviewImage) unmountInteractive(outgoingPreviewImage);
  outgoingPreviewImage?.remove();
  outgoingPreviewImage = null;
  previewStage.classList.remove('is-sliding');
}

function updatePreviewControls(index) {
  const focusedButton = document.activeElement;
  previousButton.disabled = index === 0;
  nextButton.disabled = index === previewSlides.length - 1;
  if (focusedButton === previousButton && previousButton.disabled) nextButton.focus({ preventScroll: true });
  if (focusedButton === nextButton && nextButton.disabled) previousButton.focus({ preventScroll: true });
}

async function showPreviewSlide(index, animate = true) {
  if (index < 0 || index >= previewSlides.length) return;
  const request = ++previewRequest;
  previewIndex = index;
  updatePreviewControls(index);
  previewStage.setAttribute('aria-busy', 'true');
  previewLoading.hidden = true;
  previewLoading.textContent = '作品加载中…';
  const loadingTimer = setTimeout(() => {
    if (preview.open && request === previewRequest) previewLoading.hidden = false;
  }, 120);
  const slide = previewSlides[index];
  const isVideo = Boolean(slide.dataset.videoSrc);
  const isCrew = Boolean(window.CrewPortfolio && slide.dataset.crewPrototype);
  const isVessel = Boolean(window.VesselPortfolio && slide.dataset.vesselPrototype);
  const isInteractive = isCrew || isVessel;
  const incoming = isVideo ? document.createElement('video') : isInteractive ? document.createElement('div') : new Image();
  incoming.className = 'preview-artwork';
  const original = slide.querySelector('video, img');
  incoming.alt = original.getAttribute('aria-label') || original.alt;
  let crewPoster;
  if (isInteractive) {
    incoming.classList.add(isCrew ? 'crew-composition' : 'vessel-composition');
    if(isCrew) incoming.dataset.crewPrototype = slide.dataset.crewPrototype;
    else incoming.dataset.vesselPrototype = slide.dataset.vesselPrototype;
    incoming.setAttribute('role','group');
    incoming.setAttribute('aria-label',incoming.alt);
    crewPoster = new Image();
    crewPoster.className = isCrew ? 'crew-poster' : 'vessel-poster';
    crewPoster.alt = incoming.alt;
    crewPoster.width = 3840;
    crewPoster.height = 2160;
    crewPoster.decoding = 'async';
    crewPoster.src = slide.querySelector('a').href;
    incoming.append(crewPoster);
  } else if (isVideo) {
    incoming.setAttribute('aria-label', incoming.alt);
    incoming.muted = true;
    incoming.defaultMuted = true;
    incoming.loop = true;
    incoming.playsInline = true;
    incoming.poster = original.poster;
  } else {
    incoming.decoding = 'async';
    incoming.src = slide.querySelector('a').href;
  }
  [index - 1, index + 1].forEach((neighbor, slot) => {
    if (previewSlides[neighbor] && !previewSlides[neighbor].dataset.videoSrc) neighborPreloads[slot].src = previewSlides[neighbor].querySelector('a').href;
    else neighborPreloads[slot].removeAttribute('src');
  });
  try {
    if (isVideo) {
      await new Promise((resolve, reject) => {
        const clear = () => { incoming.removeEventListener('loadeddata', ready); incoming.removeEventListener('error', failed); };
        const ready = () => { clear(); resolve(); };
        const failed = () => { clear(); reject(new Error('Video unavailable')); };
        incoming.addEventListener('loadeddata', ready);
        incoming.addEventListener('error', failed);
        incoming.src = slide.dataset.videoSrc;
        incoming.load();
      });
    } else if (isInteractive) await crewPoster.decode();
    else await incoming.decode();
  } catch {
    if (preview.open && request === previewRequest) {
      previewLoading.textContent = '作品加载失败，请切换后重试。';
      previewLoading.hidden = false;
      previewStage.setAttribute('aria-busy', 'false');
    }
    return;
  } finally {
    clearTimeout(loadingTimer);
  }
  if (!preview.open || request !== previewRequest) {
    if (isVideo) { incoming.removeAttribute('src'); incoming.load(); }
    return;
  }
  const direction = index >= renderedPreviewIndex ? 1 : -1;
  const previous = previewImage;
  const previousTransform = getComputedStyle(previous).transform;
  const previousOpacity = getComputedStyle(previous).opacity;
  const shouldAnimate = animate && renderedPreviewIndex >= 0 && index !== renderedPreviewIndex && !reducedPreviewMotion.matches;
  previous.pause?.();
  stopPreviewMotion();
  previewStage.append(incoming);
  if (isCrew) window.CrewPortfolio.mount(incoming);
  if (isVessel) window.VesselPortfolio.mount(incoming);
  previewImage = incoming;
  renderedPreviewIndex = index;
  previewCounter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(previewSlides.length).padStart(2, '0');
  previewCounter.setAttribute('aria-label', '第 ' + (index + 1) + ' 张，共 ' + previewSlides.length + ' 张');
  previewStage.setAttribute('aria-busy', 'false');
  previewLoading.hidden = true;
  preview.querySelector('#image-preview-title').textContent = isInteractive ? '高清预览' : '高清预览 · 点击画面退出';
  if (isVideo) incoming.play().catch(() => {});
  if (!shouldAnimate) {
    unmountInteractive(previous);
    previous.remove();
    return;
  }
  previous.alt = '';
  previous.setAttribute('aria-hidden', 'true');
  previous.classList.add('preview-outgoing');
  outgoingPreviewImage = previous;
  previewStage.classList.add('is-sliding');
  const distance = previewStage.clientWidth * direction;
  const options = { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' };
  const motion = [
    incoming.animate([
      { transform: 'translate3d(' + distance + 'px, 0, 0)', opacity: .65 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 }
    ], options),
    previous.animate([
      { transform: previousTransform === 'none' ? 'translate3d(0, 0, 0)' : previousTransform, opacity: previousOpacity },
      { transform: 'translate3d(' + (-distance) + 'px, 0, 0)', opacity: .65 }
    ], options)
  ];
  slideAnimations = motion;
  Promise.all(motion.map(animation => animation.finished)).then(() => {
    if (slideAnimations === motion) stopPreviewMotion();
  }).catch(() => { /* A newer transition or closing the viewer cancels this pair. */ });
}

document.querySelectorAll('.case-slide a').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    previewOpener = link;
    preview.showModal();
    document.documentElement.classList.add('image-preview-open');
    showPreviewSlide(previewSlides.indexOf(link.closest('.case-slide')), false);
  });
});
previousButton.addEventListener('click', () => showPreviewSlide(previewIndex - 1));
nextButton.addEventListener('click', () => showPreviewSlide(previewIndex + 1));
preview.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showPreviewSlide(previewIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
preview.addEventListener('click', event => {
  if (event.target === preview || event.target.closest('.preview-stage') || event.target.closest('.preview-close')) preview.close();
});
preview.addEventListener('close', () => {
  ++previewRequest;
  stopPreviewMotion();
  renderedPreviewIndex = -1;
  previewImage.pause?.();
  unmountInteractive(previewImage);
  previewImage.querySelector?.('.crew-poster,.vessel-poster')?.removeAttribute('src');
  previewImage.removeAttribute('src');
  previewImage.load?.();
  previewImage.alt = '';
  previewCounter.textContent = '';
  previewStage.setAttribute('aria-busy', 'false');
  previewLoading.hidden = true;
  neighborPreloads.forEach(image => image.removeAttribute('src'));
  document.documentElement.classList.remove('image-preview-open');
  previewOpener?.focus({ preventScroll: true });
});
reducedPreviewMotion.addEventListener('change', event => {
  if (event.matches) stopPreviewMotion();
});
