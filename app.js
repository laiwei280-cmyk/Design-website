const dialogs = [...document.querySelectorAll('dialog')];
const caseDialog = document.querySelector('#case-dialog');
const contactDialog = document.querySelector('#contact-dialog');
let content = null;
let opener = null;
const contentReady = fetch('content.json').then(response => {
  if (!response.ok) throw new Error('Content unavailable');
  return response.json();
}).then(data => {
  content = data;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const link = document.querySelector('#contact-email');
    link.textContent = email;
    link.href = `mailto:${email}`;
    link.hidden = false;
    document.querySelector('#contact-pending').hidden = true;
    document.querySelectorAll('[data-contact-email]').forEach(item => {
      item.href = `mailto:${email}`;
      (item.querySelector('strong') || item).textContent = email;
    });
  }
  const phone = typeof data.phone === 'string' ? data.phone.replace(/[\s()-]/g, '') : '';
  if (/^\+?\d{7,15}$/.test(phone)) {
    document.querySelectorAll('[data-contact-phone]').forEach(item => {
      item.href = `tel:${phone}`;
      (item.querySelector('strong') || item).textContent = phone;
    });
  }
  if (typeof data.wechatQrImage === 'string' && data.wechatQrImage.trim()) {
    const qrUrl = new URL(data.wechatQrImage, location.href);
    if (qrUrl.origin === location.origin && ['http:', 'https:'].includes(qrUrl.protocol)) {
      document.querySelectorAll('.wechat-qr-source, .badge-wechat-card').forEach(image => { image.src = qrUrl.href; });
    }
  }
  if (typeof data.resumeUrl === 'string' && data.resumeUrl.trim()) {
    const url = new URL(data.resumeUrl, location.href);
    if (['http:', 'https:'].includes(url.protocol) || (location.protocol === 'file:' && url.protocol === 'file:')) {
      document.querySelectorAll('#resume-link, [data-resume-entry]').forEach(link => {
        link.href = url.href;
        if (url.origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener'; }
        else { link.removeAttribute('target'); link.removeAttribute('rel'); }
        link.removeAttribute('aria-disabled');
      });
      document.querySelector('.resume-box>div>span').textContent = '了解我的设计经历与更多可能';
    }
  }
  return data;
}).catch(() => {
  document.querySelector('#live-status').textContent = '项目详情暂时无法加载，请刷新重试。';
  return null;
});

function showDialog(dialog, trigger) {
  opener = trigger;
  dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.scrollTop = 0;
}

function closeDialog(dialog) { dialog.close(); }

dialogs.forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    opener?.focus({ preventScroll: true });
  });
});

document.querySelectorAll('.contact-trigger').forEach(button => button.addEventListener('click', () => showDialog(contactDialog, button)));
document.querySelector('.case-done').addEventListener('click', () => closeDialog(caseDialog));
document.querySelector('.contact-work').addEventListener('click', () => {
  closeDialog(contactDialog);
  document.querySelector('#work').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});

document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', async () => {
  const data = await contentReady;
  const project = data?.projects?.[button.dataset.project];
  if (!project) {
    document.querySelector('#live-status').textContent = '项目详情暂时无法加载，请刷新后重试。';
    return;
  }
  document.querySelector('#case-title').textContent = project.title;
  document.querySelector('#case-category').textContent = project.category;
  document.querySelector('#case-summary').textContent = project.summary;
  document.querySelector('.case-notice').hidden = project.isDemo === false;
  const detail = document.querySelector('#case-details');
  detail.replaceChildren();
  for (const section of project.sections || []) {
    const article = document.createElement('article');
    const heading = document.createElement('h3');
    const paragraph = document.createElement('p');
    heading.textContent = section.title;
    paragraph.textContent = section.body;
    article.append(heading, paragraph);
    detail.append(article);
  }
  const originalCover = document.querySelector(`.project-cover[data-project="${button.dataset.project}"]`);
  const visual = document.querySelector('#case-visual');
  visual.replaceChildren();
  visual.hidden = !originalCover;
  if (originalCover) {
    const preview = document.createElement('div');
    preview.className = originalCover.className;
    preview.setAttribute('aria-hidden', 'true');
    for (const child of originalCover.children) preview.append(child.cloneNode(true));
    preview.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    const gradient = preview.querySelector('linearGradient');
    if (gradient) {
      gradient.id = 'case-area';
      preview.querySelector('[fill="url(#area)"]')?.setAttribute('fill', 'url(#case-area)');
    }
    preview.querySelector('.cover-open')?.remove();
    visual.append(preview);
  }
  showDialog(caseDialog, button);
}));

const filters = [...document.querySelectorAll('[data-filter]')];
filters.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  filters.forEach(filter => {
    const active = filter === button;
    filter.classList.toggle('active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  let visible = 0;
  document.querySelectorAll('.project-card').forEach(card => {
    card.hidden = category !== 'all' && card.dataset.category !== category;
    if (!card.hidden) visible += 1;
  });
  document.querySelector('#live-status').textContent = `当前显示 ${visible} 个项目`;
}));

const navigation = [...document.querySelectorAll('.nav-link')];
function markActive(id) {
  navigation.forEach(link => {
    const active = link.hash === `#${id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
const sections = [...document.querySelectorAll('main>section')];
let scrollQueued = false;
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    const position = window.innerHeight * .35;
    const section = [...sections].reverse().find(item => item.getBoundingClientRect().top <= position) || sections[0];
    markActive(section.id);
    scrollQueued = false;
  });
}, { passive: true });
markActive('about');
document.querySelector('#year').textContent = String(new Date().getFullYear());
