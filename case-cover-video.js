// Autoplay silent slide videos only while visible; keep a pause control.
document.querySelectorAll('.case-video-slide').forEach(slide => {
  const video = slide.querySelector('video');
  const toggle = slide.querySelector('.cover-video-toggle');
  const viewer = document.querySelector('.case-image-preview');
  let visible = video.getBoundingClientRect().top < innerHeight && video.getBoundingClientRect().bottom > 0;
  let manuallyPaused = false;
  video.muted = true;
  video.defaultMuted = true;
  video.controls = false;
  toggle.hidden = false;
  function syncPlayback() {
    if (visible && !document.hidden && !viewer?.open && !manuallyPaused) {
      video.play().catch(() => { toggle.textContent = '播放动效'; });
    } else video.pause();
  }
  video.addEventListener('play', () => { toggle.textContent = '暂停动效'; });
  video.addEventListener('pause', () => { toggle.textContent = '播放动效'; });
  toggle.addEventListener('click', () => { manuallyPaused = !video.paused; syncPlayback(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncPlayback(); }, { threshold: .05 }).observe(video);
  document.addEventListener('visibilitychange', syncPlayback);
  if (viewer) new MutationObserver(syncPlayback).observe(viewer, { attributes: true, attributeFilter: ['open'] });
  syncPlayback();
});
