// Project pages use the same contact data as the home page.
const projectContact = document.createElement('dialog');
projectContact.className = 'project-contact-dialog';
projectContact.setAttribute('aria-labelledby', 'project-contact-title');
projectContact.innerHTML = '<div class="project-contact-top"><span>LET\'S CONNECT</span><button type="button" aria-label="关闭联系信息" autofocus>×</button></div><div class="project-contact-content"><h2 id="project-contact-title">从一句你好开始。</h2><p>感谢您的观看，期待与您深度交流。</p><div class="project-contact-qr"><div><img src="assets/wechat-card.png" alt="魏莱的微信名片二维码" width="888" height="1378"></div><span>微信扫一扫，添加好友</span></div><a class="project-contact-phone" hidden></a><a class="project-contact-email" hidden></a><p class="project-contact-status" hidden>联系方式暂时无法加载，请刷新重试。</p><a class="project-contact-work" href="./#work">先看看我的作品 <span aria-hidden="true">↗</span></a></div>';
document.body.append(projectContact);
let contactOpener;
document.querySelectorAll('.header-contact').forEach(button => button.addEventListener('click', () => {
  contactOpener = button;
  projectContact.showModal();
  document.documentElement.classList.add('project-contact-open');
}));
projectContact.querySelector('button').addEventListener('click', () => projectContact.close());
projectContact.addEventListener('click', event => {
  if (event.target !== projectContact) return;
  const rect = projectContact.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) projectContact.close();
});
projectContact.addEventListener('close', () => {
  document.documentElement.classList.remove('project-contact-open');
  contactOpener?.focus({ preventScroll: true });
});
fetch('content.json').then(response => {
  if (!response.ok) throw new Error('Contact unavailable');
  return response.json();
}).then(data => {
  const phone = typeof data.phone === 'string' ? data.phone.replace(/[\s()-]/g, '') : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (/^\+?\d{7,15}$/.test(phone)) {
    const link = projectContact.querySelector('.project-contact-phone');
    link.textContent = phone; link.href = `tel:${phone}`; link.hidden = false;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const link = projectContact.querySelector('.project-contact-email');
    link.textContent = email; link.href = `mailto:${email}`; link.hidden = false;
  }
  if (typeof data.wechatQrImage === 'string' && data.wechatQrImage.trim()) {
    const imageUrl = new URL(data.wechatQrImage, location.href);
    if (imageUrl.origin === location.origin && ['http:', 'https:'].includes(imageUrl.protocol)) projectContact.querySelector('img').src = imageUrl.href;
  }
}).catch(() => { projectContact.querySelector('.project-contact-status').hidden = false; });
