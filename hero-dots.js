(() => {
  const hero = document.querySelector('.hero');
  const field = hero?.querySelector('.hero-dot-field');
  if (!field) return;
  const reveal = field.querySelector('.hero-dot-reveal');
  const ambient = field.querySelector('.hero-dot-ambient');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const spacing = parseFloat(getComputedStyle(field).getPropertyValue('--dot-spacing')) || 21.333333;
  const radius = parseFloat(getComputedStyle(field).getPropertyValue('--dot-radius')) || 120;
  const maxAmbientDots = 10;
  let visible = false;
  let timer = null;
  let pointerFrame = null;
  let pointer = null;
  let bounds = field.getBoundingClientRect();
  const dots = new Map();
  const hoverDots = new Map();
  const liquid = { x: 0, y: 0, vx: 0, vy: 0 };
  let lastFrameTime = 0;
  let lensAngle = 0;

  function resetLiquid() {
    liquid.x = liquid.y = liquid.vx = liquid.vy = 0;
    lastFrameTime = 0;
  }

  function advanceLiquid(now) {
    if (reducedMotion.matches) { resetLiquid(); return false; }
    const elapsed = lastFrameTime ? Math.min(.032, Math.max(.001, (now - lastFrameTime) / 1000)) : 1 / 60;
    lastFrameTime = now;
    const steps = Math.ceil(elapsed / .008);
    const dt = elapsed / steps;
    for (let step = 0; step < steps; step += 1) {
      liquid.vx += (-120 * liquid.x - 14 * liquid.vx) * dt;
      liquid.vy += (-120 * liquid.y - 14 * liquid.vy) * dt;
      liquid.x += liquid.vx * dt;
      liquid.y += liquid.vy * dt;
    }
    const moving = Math.hypot(liquid.x, liquid.y) > .02 || Math.hypot(liquid.vx, liquid.vy) > .12;
    if (!moving) resetLiquid();
    return moving;
  }

  function renderHoverDots(x, y, now) {
    const active = new Set();
    const origin = spacing / 2;
    const firstColumn = Math.max(0, Math.ceil((x - radius - origin) / spacing));
    const lastColumn = Math.floor((Math.min(bounds.width, x + radius) - origin) / spacing);
    const firstRow = Math.max(0, Math.ceil((y - radius - origin) / spacing));
    const lastRow = Math.floor((Math.min(bounds.height, y + radius) - origin) / spacing);
    // Materialize only points inside the current hover circle.
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      for (let row = firstRow; row <= lastRow; row += 1) {
        const pointX = origin + column * spacing;
        const pointY = origin + row * spacing;
        const distance = Math.hypot(pointX - x, pointY - y);
        if (distance >= radius) continue;
        const key = `${column}:${row}`;
        active.add(key);
        let dot = hoverDots.get(key);
        if (!dot) {
          dot = document.createElement('span');
          dot.style.left = `${pointX}px`;
          dot.style.top = `${pointY}px`;
          hoverDots.set(key, dot);
          reveal.append(dot);
        }
        const progress = distance / radius;
        const falloff = (1 - progress * progress) ** 2;
        const energy = Math.min(1, Math.hypot(liquid.x, liquid.y) / 12 + Math.hypot(liquid.vx, liquid.vy) / 350);
        const ripple = Math.sin(progress * Math.PI * 2 - now / 130) * energy * .075;
        // Radial magnification spreads the grid; a short spring wake makes it liquid.
        const refraction = (.48 + ripple) * falloff * .5;
        const offsetX = (pointX - x) * refraction + liquid.x * falloff * .75;
        const offsetY = (pointY - y) * refraction + liquid.y * falloff * .75;
        const scale = .2 + 1.5 * (1 - progress) ** .85;
        const stretch = energy * falloff * .12;
        dot.style.setProperty('--dot-offset-x', `${offsetX.toFixed(3)}px`);
        dot.style.setProperty('--dot-offset-y', `${offsetY.toFixed(3)}px`);
        dot.style.setProperty('--dot-scale-x', (scale * (1 + stretch)).toFixed(4));
        dot.style.setProperty('--dot-scale-y', (scale * (1 - stretch * .5)).toFixed(4));
      }
    }
    for (const [key, dot] of hoverDots) {
      if (!active.has(key)) { hoverDots.delete(key); dot.remove(); }
    }
  }

  function updatePointer(now) {
    pointerFrame = null;
    if (!pointer) return;
    const x = pointer.x - bounds.left;
    const y = pointer.y - bounds.top;
    const inside = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;
    field.classList.toggle('is-hovered', inside);
    if (!inside) { clearPointer(); return; }
    const moving = advanceLiquid(now);
    field.classList.toggle('is-liquid', moving);
    if (moving) {
      const targetAngle = Math.atan2(liquid.y || liquid.vy, liquid.x || liquid.vx);
      const difference = Math.atan2(Math.sin(targetAngle - lensAngle), Math.cos(targetAngle - lensAngle));
      lensAngle += difference * .16;
    }
    field.style.setProperty('--lens-angle', `${lensAngle}rad`);
    field.style.setProperty('--dot-x', `${x}px`);
    field.style.setProperty('--dot-y', `${y}px`);
    renderHoverDots(x, y, now);
    // Ambient hints must never add a second highlight inside the hover circle.
    for (const [dot, point] of dots) {
      if (Math.hypot(point.x - x, point.y - y) < radius + 2) {
        dots.delete(dot);
        dot.remove();
      }
    }
    if (moving) pointerFrame = requestAnimationFrame(updatePointer);
  }

  function queuePointer(event) {
    if (event.pointerType === 'touch') { clearPointer(); return; }
    if (pointer && !reducedMotion.matches) {
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      liquid.vx = Math.max(-260, Math.min(260, liquid.vx - Math.max(-160, Math.min(160, dx * 5))));
      liquid.vy = Math.max(-260, Math.min(260, liquid.vy - Math.max(-160, Math.min(160, dy * 5))));
    }
    pointer = { x: event.clientX, y: event.clientY };
    if (pointerFrame === null) { lastFrameTime = 0; pointerFrame = requestAnimationFrame(updatePointer); }
  }

  function clearPointer() {
    pointer = null;
    if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    field.classList.remove('is-hovered');
    field.classList.remove('is-liquid');
    resetLiquid();
    lensAngle = 0;
    hoverDots.clear();
    reveal.replaceChildren();
  }

  function canGlimmer() {
    return visible && !document.hidden && !reducedMotion.matches;
  }

  function spawnDot() {
    if (!canGlimmer()) return;
    if (dots.size < maxAmbientDots) {
      const columns = Math.max(0, Math.floor((bounds.width - spacing / 2) / spacing) + 1);
      const rows = Math.max(0, Math.floor((bounds.height - spacing / 2) / spacing) + 1);
      // Low-frequency bursts alternate between small clusters and separated hints.
      const clustered = Math.random() < .45;
      const count = Math.min(maxAmbientDots - dots.size, clustered ? 3 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3));
      const existing = [...dots.values()];
      const nearby = clustered && existing.length && Math.random() < .5
        ? existing[Math.floor(Math.random() * existing.length)] : null;
      const centerColumn = nearby ? Math.floor(nearby.x / spacing) : Math.floor(Math.random() * columns);
      const centerRow = nearby ? Math.floor(nearby.y / spacing) : Math.floor(Math.random() * rows);
      for (let added = 0; added < count; added += 1) {
        for (let attempt = 0; columns && rows && attempt < 30; attempt += 1) {
          const column = clustered ? centerColumn + Math.floor(Math.random() * 5) - 2 : Math.floor(Math.random() * columns);
          const row = clustered ? centerRow + Math.floor(Math.random() * 5) - 2 : Math.floor(Math.random() * rows);
          if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
          const point = { x: (column + .5) * spacing, y: (row + .5) * spacing };
          const inViewport = bounds.top + point.y > 0 && bounds.top + point.y < innerHeight;
          if (!inViewport) continue;
          if (pointer && Math.hypot(point.x - (pointer.x - bounds.left), point.y - (pointer.y - bounds.top)) < radius + spacing) continue;
          const minimumDistance = clustered ? spacing * .5 : spacing * 3;
          if ([...dots.values()].some(other => Math.hypot(point.x - other.x, point.y - other.y) < minimumDistance)) continue;
          const dot = document.createElement('span');
          dot.style.left = `${point.x}px`;
          dot.style.top = `${point.y}px`;
          dot.style.setProperty('--dot-duration', `${2600 + Math.random() * 900}ms`);
          dots.set(dot, point);
          dot.addEventListener('animationend', () => { dots.delete(dot); dot.remove(); }, { once: true });
          ambient.append(dot);
          break;
        }
      }
    }
    timer = setTimeout(spawnDot, 1400 + Math.random() * 1000);
  }

  function refreshActivity() {
    clearTimeout(timer);
    timer = null;
    dots.clear();
    ambient.replaceChildren();
    if (canGlimmer()) timer = setTimeout(spawnDot, 650 + Math.random() * 800);
  }

  function measure() {
    bounds = field.getBoundingClientRect();
    if (pointer && pointerFrame === null) pointerFrame = requestAnimationFrame(updatePointer);
  }

  hero.addEventListener('pointerenter', event => { measure(); queuePointer(event); });
  hero.addEventListener('pointermove', queuePointer, { passive: true });
  hero.addEventListener('pointerleave', clearPointer);
  hero.addEventListener('pointercancel', clearPointer);
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('blur', clearPointer);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) clearPointer();
      measure();
      refreshActivity();
    }).observe(hero);
  } else { visible = true; refreshActivity(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearPointer(); refreshActivity(); });
  reducedMotion.addEventListener('change', () => {
    resetLiquid();
    if (pointer && pointerFrame === null) pointerFrame = requestAnimationFrame(updatePointer);
    refreshActivity();
  });
})();
