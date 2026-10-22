const badgeStage = document.querySelector('.badge-stage');
const badgeRig = document.querySelector('.badge-rig');
const badgeRibbon = document.querySelector('.badge-ribbon');
const badgeRibbonPaths = [...badgeRibbon.querySelectorAll('[data-ribbon]')];
const badgeRibbonSeams = [...badgeRibbon.querySelectorAll('[data-ribbon-offset]')];
const badgeRibbonLabel = badgeRibbon.querySelector('textPath');
const badgeHardware = document.querySelector('.badge-hardware');
const badgeMetal = window.createBadgeMetal?.(badgeStage);
const badgeCard = document.querySelector('#identity-badge');
const badgeFlipper = badgeCard.querySelector('.badge-flipper');
const badgeFront = badgeCard.querySelector('.badge-front');
const badgeBack = badgeCard.querySelector('.badge-back');
const badgeFrontButton = badgeCard.querySelector('.badge-front-trigger');
const badgeBackButton = badgeCard.querySelector('.badge-back-toggle');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

// Position, eyelet swing, depth tilt and the half turn share one continuous clock.
// Damped springs retain velocity when the next click arrives during a movement.
const badgePose = {
  x: { value: 0, velocity: 0, target: 0, stiffness: 48, damping: 10 },
  y: { value: 0, velocity: 0, target: 0, stiffness: 70, damping: 10.8 },
  roll: { value: 0, velocity: 0, target: 0, stiffness: 32, damping: 6.3 },
  pitch: { value: 0, velocity: 0, target: 0, stiffness: 72, damping: 11 },
  twist: { value: 0, velocity: 0, target: 0, stiffness: 155, damping: 19 }
};
let badgeGeometry = { width: 0, height: 0, ribbonOverhang: 0, pivotY: 132, clipY: 71, cardHeight: 472, swingScale: 1 };
let badgeFrame = null;
let badgeLastFrame = 0;
let badgeInView = false;
let badgeEntrancePending = false;
let badgeEntranceTimer = null;
const badgeEntranceDelay = 1000;
let badgeDropHoldUntil = 0;
let badgeTurnHoldUntil = 0;
let badgeTurnAnticipation = 0;

function setBadgeFace(back, moveFocus = false, announce = true) {
  badgeCard.dataset.side = back ? 'back' : 'front';
  badgeFront.inert = back;
  badgeBack.inert = !back;
  badgeFront.setAttribute('aria-hidden', String(back));
  badgeBack.setAttribute('aria-hidden', String(!back));
  if (moveFocus) (back ? badgeBackButton : badgeFrontButton).focus({ preventScroll: true });
  const status = document.querySelector('#live-status');
  status.textContent = announce
    ? back ? '工牌背面：微信二维码、电话号码和邮箱。点击下方按钮可返回正面。'
      : '工牌正面：魏莱的个人照片。点击可翻转查看联系方式。'
    : '';
}

function renderBadgePose() {
  const { x, y, roll, pitch, twist } = badgePose;
  const radians = Math.PI / 180;
  const rollAngle = roll.value * radians;
  const pitchAngle = pitch.value * radians;
  badgeRig.style.transform = `translate3d(${x.value.toFixed(3)}px,${y.value.toFixed(3)}px,0) rotateZ(${roll.value.toFixed(3)}deg) rotateX(${pitch.value.toFixed(3)}deg)`;
  badgeFlipper.style.transform = `rotateY(${twist.value.toFixed(3)}deg)`;
  badgeMetal?.render(badgePose);

  // Keep the ribbon's upper endpoint fixed and its lower endpoint on the buckle.
  const center = badgeGeometry.width / 2;
  // Use the same camera as the HTML card and metal, including depth perspective.
  const attachmentY = badgeStage.dataset.hardware === 'webgl' ? -52 : badgeGeometry.clipY - badgeGeometry.pivotY;
  const projectRibbonPoint = (localX, localY) => {
    const projectedY = localY * Math.cos(pitchAngle);
    const depth = localY * Math.sin(pitchAngle);
    const scale = 1500 / (1500 - depth);
    return [
      center + (x.value + localX * Math.cos(rollAngle) - projectedY * Math.sin(rollAngle)) * scale,
      badgeGeometry.pivotY + (y.value + localX * Math.sin(rollAngle) + projectedY * Math.cos(rollAngle)) * scale
    ];
  };
  const [, endY] = projectRibbonPoint(0, attachmentY);
  const startY = -18 - badgeGeometry.ribbonOverhang;
  const length = Math.max(8, endY - startY);
  const bend = Math.max(-24, Math.min(24, roll.value * .55 + x.value * .3 + pitch.value * .15));
  const ribbonPath = (offset = 0) => {
    const end = projectRibbonPoint(offset, attachmentY);
    const tangent = projectRibbonPoint(offset, attachmentY - length * .3);
    return `M ${(center + offset).toFixed(2)} ${startY.toFixed(2)} C ${(center - bend * .45 + offset).toFixed(2)} ${(startY + length * .42).toFixed(2)}, ${tangent[0].toFixed(2)} ${tangent[1].toFixed(2)}, ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
  };
  badgeRibbonPaths.forEach(item => item.setAttribute('d', ribbonPath()));
  badgeRibbonSeams.forEach(item => item.setAttribute('d', ribbonPath(Number(item.dataset.ribbonOffset))));
  badgeRibbon.style.opacity = endY > -8 ? '1' : '0';

  const shadowX = x.value - Math.sin(rollAngle) * badgeGeometry.cardHeight * .35;
  badgeStage.style.setProperty('--badge-shadow-x', `${shadowX.toFixed(2)}px`);
  badgeStage.style.setProperty('--badge-shadow-scale', (1 - Math.min(.22, Math.abs(roll.value) * .004)).toFixed(3));
  badgeStage.style.setProperty('--badge-shadow-opacity', Math.max(0, 1 + Math.min(0, y.value) / 200).toFixed(3));
  badgeStage.style.setProperty('--badge-shine', (Math.abs(Math.sin(twist.value * radians)) * .13 + Math.min(.03, Math.abs(pitch.value) * .002)).toFixed(3));
}

function settleBadgePose() {
  if (badgeFrame !== null) cancelAnimationFrame(badgeFrame);
  badgeFrame = null;
  Object.values(badgePose).forEach(axis => { axis.value = axis.target; axis.velocity = 0; });
  // Whole revolutions are visually identical; discard them at rest, never mid-turn.
  const revolutions = Math.trunc(badgePose.twist.target / 360) * 360;
  badgePose.twist.target -= revolutions;
  badgePose.twist.value -= revolutions;
  badgeDropHoldUntil = 0;
  badgeTurnHoldUntil = 0;
  renderBadgePose();
  badgeStage.dataset.motion = 'still';
}

function advanceBadgeSpring(axis, goal, seconds) {
  axis.velocity += ((goal - axis.value) * axis.stiffness - axis.velocity * axis.damping) * seconds;
  axis.value += axis.velocity * seconds;
}

function tickBadgeMotion(now) {
  badgeFrame = null;
  // Small substeps keep the motion stable across high/low refresh rates and tab stalls.
  const elapsed = Math.min(.04, Math.max(.001, (now - badgeLastFrame) / 1000));
  badgeLastFrame = now;
  const steps = Math.ceil(elapsed / .008);
  const seconds = elapsed / steps;
  for (let i = 0; i < steps; i += 1) {
    for (const [key, axis] of Object.entries(badgePose)) {
      if (key === 'y' && now < badgeDropHoldUntil) continue;
      const goal = key === 'twist' && now < badgeTurnHoldUntil ? badgeTurnAnticipation : axis.target;
      advanceBadgeSpring(axis, goal, seconds);
    }
  }
  renderBadgePose();
  const atRest = now >= Math.max(badgeDropHoldUntil, badgeTurnHoldUntil)
    && Object.values(badgePose).every(axis => Math.abs(axis.value - axis.target) < .06 && Math.abs(axis.velocity) < .35);
  if (atRest) settleBadgePose();
  else badgeFrame = requestAnimationFrame(tickBadgeMotion);
}

function startBadgeMotion() {
  if (badgeFrame !== null) return;
  badgeStage.dataset.motion = 'moving';
  badgeLastFrame = performance.now();
  badgeFrame = requestAnimationFrame(tickBadgeMotion);
}

function flipBadge() {
  const back = badgeCard.dataset.side !== 'back';
  setBadgeFace(back, true);
  // Continue another half turn rather than snapping or reversing a running CSS tween.
  badgePose.twist.target += 180;
  if (motionPreference.matches) { settleBadgePose(); return; }
  badgeTurnAnticipation = badgePose.twist.value - 7;
  badgeTurnHoldUntil = performance.now() + 65;
  badgeDropHoldUntil = 0;
  const scale = badgeGeometry.swingScale;
  badgePose.x.velocity = Math.max(-180 * scale, badgePose.x.velocity - 105 * scale);
  badgePose.y.velocity = Math.max(-160 * scale, badgePose.y.velocity - 105 * scale);
  const rollLimit = (window.innerWidth <= 600 ? 320 : 440) * scale;
  badgePose.roll.velocity = Math.min(rollLimit, badgePose.roll.velocity + 320 * scale);
  badgePose.pitch.velocity = Math.max(-260 * scale, badgePose.pitch.velocity - 195 * scale);
  startBadgeMotion();
}

badgeCard.querySelectorAll('[data-badge-toggle]').forEach(button => button.addEventListener('click', flipBadge));
badgeCard.addEventListener('click', event => {
  // Native phone/email links keep their own actions; the rest of the card can turn.
  if (!event.target.closest('a, button')) flipBadge();
});

function playBadgeEntrance() {
  if (document.visibilityState === 'hidden') {
    badgeEntrancePending = true;
    settleBadgePose();
    return;
  }
  badgeEntrancePending = false;
  settleBadgePose();
  setBadgeFace(false, badgeBack.contains(document.activeElement), false);
  badgePose.twist.target = 0;
  badgePose.twist.value = 0;
  if (motionPreference.matches) {
    settleBadgePose();
    badgeStage.dataset.entrance = 'shown';
    badgeStage.inert = false;
    return;
  }
  badgePose.x.value = 18 * badgeGeometry.swingScale;
  badgePose.x.velocity = -50 * badgeGeometry.swingScale;
  badgePose.y.value = -Math.max(500, badgeGeometry.cardHeight + badgeGeometry.pivotY + 35);
  badgePose.y.velocity = 0;
  badgePose.roll.value = -12 * badgeGeometry.swingScale;
  badgePose.roll.velocity = 90 * badgeGeometry.swingScale;
  badgePose.pitch.value = 18;
  badgePose.pitch.velocity = -25;
  badgePose.twist.value = -13;
  badgeDropHoldUntil = performance.now() + 160;
  renderBadgePose();
  badgeStage.dataset.entrance = 'shown';
  badgeStage.inert = false;
  startBadgeMotion();
}

function scheduleBadgeEntrance() {
  clearTimeout(badgeEntranceTimer);
  badgeEntranceTimer = null;
  badgeEntrancePending = true;
  badgeStage.dataset.entrance = 'waiting';
  badgeStage.inert = true;
  settleBadgePose();
  if (document.visibilityState === 'hidden') return;
  badgeEntranceTimer = setTimeout(() => {
    badgeEntranceTimer = null;
    if (badgeInView) playBadgeEntrance();
  }, badgeEntranceDelay);
}

function measureBadgeGeometry() {
  const style = getComputedStyle(badgeStage);
  const eyeletY = parseFloat(style.getPropertyValue('--badge-eyelet-y'));
  badgeGeometry = {
    width: badgeStage.clientWidth,
    height: badgeStage.clientHeight,
    ribbonOverhang: parseFloat(style.getPropertyValue('--badge-ribbon-overhang')) || 0,
    pivotY: badgeCard.offsetTop + eyeletY,
    eyeletY,
    clipY: badgeHardware.offsetTop + 17,
    cardHeight: badgeCard.offsetHeight,
    cardWidth: badgeCard.offsetWidth,
    // Preserve the full diagonal gesture on desktop and keep phone contacts in view.
    swingScale: window.innerWidth <= 600 ? .15 : Math.max(.4, Math.min(1, (window.innerWidth - 320) / 800))
  };
  badgeStage.style.setProperty('--rig-pivot', `${badgeGeometry.pivotY}px`);
  badgeRibbon.setAttribute('viewBox', `0 ${-badgeGeometry.ribbonOverhang} ${badgeGeometry.width} ${badgeGeometry.height + badgeGeometry.ribbonOverhang}`);
  badgeRibbonLabel.setAttribute('startOffset', String(12 + badgeGeometry.ribbonOverhang));
  badgeMetal?.resize(badgeGeometry);
  renderBadgePose();
}
measureBadgeGeometry();
badgeStage.addEventListener('badge-hardware-change', renderBadgePose);
if ('ResizeObserver' in window) new ResizeObserver(measureBadgeGeometry).observe(badgeStage);
else window.addEventListener('resize', measureBadgeGeometry, { passive: true });

if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    const entry = entries[0];
    if (entry.isIntersecting && entry.intersectionRatio >= .25) {
      badgeInView = true;
      if (badgeStage.dataset.entrance !== 'shown' && !badgeEntrancePending) scheduleBadgeEntrance();
    } else if (entry.intersectionRatio <= .08) {
      badgeInView = false;
      clearTimeout(badgeEntranceTimer);
      badgeEntranceTimer = null;
      badgeEntrancePending = false;
      badgeStage.dataset.entrance = 'waiting';
      badgeStage.inert = true;
      settleBadgePose();
    }
  }, { threshold: [0, .08, .25] }).observe(badgeStage);
} else {
  badgeInView = true;
  scheduleBadgeEntrance();
}

window.addEventListener('pageshow', event => {
  if (event.persisted && badgeInView) scheduleBadgeEntrance();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    clearTimeout(badgeEntranceTimer);
    badgeEntranceTimer = null;
    settleBadgePose();
  } else if (badgeEntrancePending && badgeInView) scheduleBadgeEntrance();
});
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) settleBadgePose();
});
