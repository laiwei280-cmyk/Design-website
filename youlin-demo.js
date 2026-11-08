
(() => {
  const chapter = document.querySelector('#prototype-demo');
  const demo = chapter.querySelector('.youlin-demo');
  const previewDialog = document.querySelector('#youlin-demo-preview');
  const previewStage = previewDialog.querySelector('.youlin-preview-stage');
  const previewTrigger = demo.querySelector('.youlin-demo-title-trigger');
  const device = demo.querySelector('.youlin-device');
  const board = demo.querySelector('.youlin-board');
  let layer = demo.querySelector('.youlin-screen-layer');
  let artwork = layer.querySelector('.youlin-artwork');
  const title = demo.querySelector('#youlin-screen-title');
  let controls = layer.querySelector('.youlin-controls');
  const tabBar = demo.querySelector('.youlin-tabbar');
  const scenarios = [...demo.querySelectorAll('[data-scenario]')];
  const overlay = demo.querySelector('.youlin-overlay');
  const sheet = overlay.querySelector('.youlin-sheet');
  const sheetTitle = sheet.querySelector('h4');
  const sheetBody = sheet.querySelector('.youlin-sheet-body');
  const closeButton = sheet.querySelector('[data-demo-close]');
  const imageSource = name => 'assets/youlin/demo/' + name + '-3x.webp';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const titles = {
    home: '首页', utility: '生活缴费', query: '缴费前 · 查询电费账单',
    confirm: '缴费中 · 请确认缴费信息', records: '缴费后 · 我的生活缴费单',
    profile: '我的', square: '人民广场', shop: '商城', checkin: '签到',
    smart: '智慧停车', lost: '失物招领', housekeeping: '家政服务',
  };
  const scenarioForView = {
    home: 'main', square: 'main', profile: 'main',
    utility: 'payments', query: 'payments', confirm: 'payments', records: 'payments',
    lost: 'community', housekeeping: 'community',
    checkin: 'more', shop: 'more', smart: 'more',
  };
  const routeSpots = {
    home: [
      [[7, 102, 73, 77], '生活缴费', 'utility', [44, 132, 60]],
      [[84, 102, 72, 77], '智慧停车', 'smart', [121, 132, 60]],
      [[161, 102, 72, 77], '失物招领', 'lost', [197, 132, 60]],
      [[236, 102, 72, 77], '家政服务', 'housekeeping', [273, 132, 60]],
      [[121, 302, 147, 39], '社区生活缴费专区', 'utility'],
      [[16, 710, 358, 50], '友邻吐槽广场', 'square'],
    ],
    profile: [
      [[305, 105, 69, 57], '签到', 'checkin'],
      [[16, 248, 105, 77], '待缴费用', 'utility'],
      [[105, 343, 91, 75], '缴费账单', 'records'],
      [[16, 428, 358, 119], '预约家政', 'housekeeping'],
      [[16, 689, 358, 40], '车辆管理', 'smart'],
    ],
    square: [
      [[16, 260, 170, 72], '邻里互助', 'lost'],
      [[199, 260, 175, 72], '社区活动', 'checkin'],
    ],
    checkin: [
      [[203, 235, 171, 70], '积分兑换', 'shop'],
      [[16, 379, 358, 95], '家政服务暖心礼', 'housekeeping'],
      [[16, 483, 358, 95], '停车福利限时享', 'smart'],
      [[16, 587, 358, 95], '邻里寻物互助行动', 'lost'],
      [[16, 795, 358, 49], '绿色生活节能周', 'utility'],
    ],
  };
  const billTypes = [
    { id: 'all', name: '全部', box: [0, 100, 80, 44], underline: 30 },
    { id: 'electric', name: '电费', box: [80, 100, 80, 44], underline: 110 },
    { id: 'water', name: '水费', box: [160, 100, 80, 44], underline: 190 },
    { id: 'gas', name: '燃气费', box: [240, 100, 96, 44], underline: 278 },
    { id: 'broadband', name: '宽带费', box: [336, 100, 54, 44], underline: 365 },
  ];
  const billStatuses = { all: '全部状态', paid: '已缴费', pending: '处理中', failed: '缴费失败' };
  const bills = [
    { type: 'electric', title: '电费缴费', provider: '江苏省电费', amount: '¥90.99', status: 'paid', date: '2026-10-01 14:32' },
    { type: 'water', title: '水费缴费', provider: '南京市自来水费', amount: '¥56.80', status: 'pending', date: '2026-09-21 10:28' },
    { type: 'gas', title: '燃气费缴费', provider: '南京市燃气费', amount: '¥82.50', status: 'failed', date: '2026-09-08 16:08' },
    { type: 'broadband', title: '宽带费缴费', provider: '南京市自来水费', amount: '¥56.80', status: 'paid', date: '2026-09-21 10:28' },
  ];
  const exampleAccount = '0000008256';
  const trail = [];
  let active = 'home';
  let paid = false;
  let accountValue = exampleAccount;
  let accountEdited = false;
  let sheetOpener;
  let routeBounce;
  let pendingNavigation;
  let pageMotion;

  function place(node, [x, y, w, h]) {
    node.classList.add('youlin-spot');
    node.style.setProperty('--spot-x', (x / 390 * 100) + '%');
    node.style.setProperty('--spot-y', (y / 844 * 100) + '%');
    node.style.setProperty('--spot-width', (w / 390 * 100) + '%');
    node.style.setProperty('--spot-height', (h / 844 * 100) + '%');
    return node;
  }

  function action(label, run) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'youlin-hit';
    button.setAttribute('aria-label', label);
    if (run) button.addEventListener('click', run);
    return button;
  }

  function spot(container, box, label, run) {
    const button = place(action(label, run), box);
    container.append(button);
    return button;
  }

  function select(label, options, box) {
    const node = document.createElement('select');
    node.setAttribute('aria-label', label);
    for (const [value, text] of Object.entries(options)) node.add(new Option(text, value));
    return place(node, box);
  }

  function openSheet(label, fields, message) {
    sheetOpener = document.activeElement;
    sheetTitle.textContent = label;
    sheetBody.replaceChildren();
    if (message) {
      const paragraph = document.createElement('p');
      paragraph.textContent = message;
      sheetBody.append(paragraph);
    }
    if (fields) {
      const list = document.createElement('dl');
      for (const [key, value] of Object.entries(fields)) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const definition = document.createElement('dd');
        term.textContent = key;
        definition.textContent = value;
        row.append(term, definition);
        list.append(row);
      }
      sheetBody.append(list);
    }
    board.inert = true;
    overlay.hidden = false;
    closeButton.focus({ preventScroll: true });
  }

  function closeSheet(restoreFocus = true) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    board.inert = false;
    if (restoreFocus) sheetOpener?.focus({ preventScroll: true });
    sheetOpener = undefined;
  }

  function prepareArtwork(screen) {
    const image = new Image(390, 844);
    image.className = 'youlin-artwork';
    image.alt = '';
    image.draggable = false;
    image.src = imageSource('board-' + screen);
    return image.decode().then(() => image, () => null);
  }

  async function navigate(next, motion, commit, ready) {
    if (pendingNavigation) return false;
    const request = ready ?? prepareArtwork(next);
    pendingNavigation = request;
    const image = await request;
    if (pendingNavigation !== request) return false;
    pendingNavigation = undefined;
    if (!image) return false;
    commit?.();
    show(next, { image, motion });
    return true;
  }

  function go(next, motion = next === 'confirm' ? 'fade' : 'forward', ready) {
    if (next === active) return;
    return navigate(next, motion, () => trail.push(active), ready);
  }

  async function followIcon(next, icon, motion = 'forward') {
    if (routeBounce || pendingNavigation || next === active) return;
    if (reducedMotion.matches) {
      return go(next, motion);
    }

    const ready = prepareArtwork(next);
    const bounce = icon.animate([
      { transform: 'none' },
      { transform: 'translateY(-1.5px) scale(1.08)', offset: 0.48 },
      { transform: 'none' },
    ], { duration: 170, easing: 'ease-in-out' });
    routeBounce = bounce;
    await bounce.finished.catch(() => {});
    if (routeBounce !== bounce) return;
    routeBounce = undefined;
    return go(next, motion, ready);
  }

  async function followRoute(next, icon) {
    if (routeBounce || pendingNavigation) return;
    if (!icon || reducedMotion.matches || !artwork.complete || !artwork.naturalWidth) {
      go(next);
      return;
    }

    const [centerX, centerY, size] = icon;
    const x = centerX - size / 2;
    const y = centerY - size / 2;
    const effect = place(document.createElement('span'), [x, y, size, size]);
    effect.classList.add('youlin-icon-bounce');
    effect.setAttribute('aria-hidden', 'true');
    effect.style.backgroundImage = 'url("' + artwork.currentSrc + '")';
    effect.style.backgroundSize = (390 / size * 100) + '% ' + (844 / size * 100) + '%';
    effect.style.backgroundPosition = (x / (390 - size) * 100) + '% ' + (y / (844 - size) * 100) + '%';
    controls.append(effect);
    try {
      await followIcon(next, effect);
    } finally {
      effect.remove();
    }
  }

  function back() {
    navigate(trail.at(-1) ?? 'home', active === 'confirm' ? 'fade' : 'back', () => trail.pop());
  }

  function query(addAccount) {
    if (pendingNavigation) return;
    if (paid && !addAccount) {
      go('records');
      return;
    }
    accountValue = addAccount ? '' : exampleAccount;
    accountEdited = addAccount;
    go('query');
  }

  function renderQuery() {
    const form = document.createElement('form');
    form.className = 'youlin-query-form';
    const provider = select('选择缴费单位', { jiangsu: '江苏省电费' }, [27, 502, 337, 40]);
    const account = place(document.createElement('input'), [27, 602, 305, 40]);
    account.id = 'youlin-account';
    account.type = 'text';
    account.inputMode = 'numeric';
    account.autocomplete = 'off';
    account.maxLength = 12;
    account.value = accountValue;
    account.placeholder = '输入户号或使用示例户号';
    account.setAttribute('aria-label', '填写缴费户号');
    account.setAttribute('aria-describedby', 'youlin-query-error');
    account.classList.toggle('is-edited', accountEdited);

    const error = place(document.createElement('p'), [27, 652, 337, 26]);
    error.id = 'youlin-query-error';
    error.classList.add('youlin-account-error');
    error.setAttribute('role', 'alert');
    error.hidden = true;

    function updateAccount() {
      accountValue = account.value;
      accountEdited = true;
      account.classList.add('is-edited');
      account.removeAttribute('aria-invalid');
      error.hidden = true;
    }
    function fillExample() {
      account.value = exampleAccount;
      updateAccount();
      account.focus({ preventScroll: true });
    }
    account.addEventListener('input', updateAccount);
    form.append(provider, account, error);
    spot(form, [332, 597, 37, 49], '扫码输入 · 使用示例户号', fillExample);
    spot(form, [24, 704, 175, 32], '历史缴费账户 · 使用示例户号', fillExample);
    const submit = spot(form, [27, 752, 336, 42], '查询电费账单');
    submit.type = 'submit';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = account.value.trim();
      if (value !== exampleAccount) {
        error.textContent = /^\d{10,12}$/.test(value) ? '未查到该户号，请使用示例户号。' : '请输入 10–12 位数字户号。';
        error.hidden = false;
        account.setAttribute('aria-invalid', 'true');
        account.focus({ preventScroll: true });
        return;
      }
      go(paid ? 'records' : 'confirm');
    });
    controls.append(form);
  }

  async function pay() {
    if (active !== 'confirm') return;
    const completed = await navigate('records', 'fade', () => {
      paid = true;
      // Skip the confirmation and query when returning from the finished bill.
      trail.pop();
    });
    if (completed) title.textContent = '模拟缴费完成 · 我的生活缴费单';
  }

  function renderRecords() {
    let type = 'all';
    const status = select('筛选账单状态', billStatuses, [254, 155, 120, 35]);
    const list = place(document.createElement('div'), [0, 201, 390, 643]);
    list.classList.add('youlin-record-scroll');
    list.setAttribute('role', 'region');
    list.setAttribute('aria-label', '生活缴费账单列表');
    list.tabIndex = 0;

    const cover = place(document.createElement('span'), [29, 138, 22, 6]);
    cover.classList.add('youlin-tab-cover');
    const indicator = document.createElement('span');
    indicator.classList.add('youlin-tab-active');
    const tabs = billTypes.map(item => spot(controls, item.box, item.name, () => {
      type = item.id;
      refresh();
    }));
    controls.append(cover, indicator, status, list);
    status.addEventListener('change', refresh);

    function refresh() {
      const selected = billTypes.find(item => item.id === type);
      tabs.forEach((tab, index) => {
        const item = billTypes[index];
        const expanded = item.id === 'broadband' && item === selected;
        tab.setAttribute('aria-pressed', String(item === selected));
        tab.classList.toggle('youlin-broadband-selected', expanded);
        tab.textContent = expanded ? item.name : '';
      });
      cover.hidden = indicator.hidden = type === 'all';
      place(indicator, [selected.underline, 139, 20, 4]);
      status.classList.toggle('is-edited', status.value !== 'all');
      list.replaceChildren();
      list.scrollTop = 0;
      const matching = bills.filter(bill => (
        (type === 'all' || bill.type === type) && (status.value === 'all' || bill.status === status.value)
      ));
      for (const bill of matching) {
        const row = document.createElement('article');
        row.className = 'youlin-record-row';
        row.setAttribute('aria-label', bill.title + '，' + bill.amount + '，' + billStatuses[bill.status]);
        const image = new Image(390, 206);
        image.src = imageSource('bill-' + bill.type);
        image.alt = '';
        image.draggable = false;
        const detail = action('查看详情：' + bill.title, () => openSheet('账单详情', {
          缴费项目: bill.title, 缴费单位: bill.provider, 金额: bill.amount,
          账单状态: billStatuses[bill.status], 缴费户号: '******8256', 交易时间: bill.date,
        }));
        row.append(image, detail);
        list.append(row);
      }
      if (!matching.length) {
        const empty = document.createElement('p');
        empty.className = 'youlin-record-empty';
        empty.setAttribute('role', 'status');
        empty.textContent = '当前筛选下暂无账单';
        list.append(empty);
      }
    }
    refresh();
  }

  function swapLayer(image, motion) {
    const previous = layer;
    artwork.classList.remove('youlin-artwork');
    artwork = image;
    controls = document.createElement('div');
    controls.className = 'youlin-controls';
    layer = document.createElement('div');
    layer.className = 'youlin-screen-layer';
    layer.append(artwork, controls);
    tabBar.before(layer);

    if (reducedMotion.matches) {
      previous.remove();
      return;
    }

    previous.inert = true;
    const offset = motion === 'fade' ? 0 : motion === 'back' ? -8 : 8;
    const effect = layer.animate([
      { opacity: 0, transform: 'translateX(' + offset + 'px)' },
      { opacity: 1, transform: 'none' },
    ], { duration: offset ? 180 : 150, easing: 'cubic-bezier(.2,.7,.3,1)' });
    pageMotion = effect;
    effect.finished.catch(() => {}).then(() => {
      previous.remove();
      if (pageMotion === effect) pageMotion = undefined;
    });
  }

  function show(next, { focus = true, image, motion } = {}) {
    routeBounce?.cancel();
    routeBounce = undefined;
    pageMotion?.cancel();
    pageMotion = undefined;
    board.querySelector('.youlin-screen-layer[inert]')?.remove();
    closeSheet(false);
    active = next;
    device.dataset.screen = next;
    if (image) swapLayer(image, motion);
    else controls.replaceChildren();
    title.textContent = titles[next];
    tabBar.hidden = !tabs.some(tab => tab.screen === next);
    tabs.forEach(({ screen, button }) => {
      if (screen === next) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    scenarios.forEach(scenario => {
      if (scenario.dataset.scenario === scenarioForView[next]) scenario.setAttribute('aria-current', 'true');
      else scenario.removeAttribute('aria-current');
    });

    if (!['home', 'profile', 'square', 'confirm'].includes(next)) {
      spot(controls, [0, 48, 47, 46], '返回上一页', back);
    }
    for (const [box, label, destination, icon] of routeSpots[next] ?? []) {
      if (next !== destination) spot(controls, box, label, () => followRoute(destination, icon));
    }
    if (next === 'utility') {
      spot(controls, [24, 294, 344, 58], '立即缴费', () => query(false));
      spot(controls, [24, 427, 344, 54], '去添加电费户号', () => query(true));
      spot(controls, [72, 779, 72, 51], '缴费记录', () => go('records'));
    } else if (next === 'query') {
      renderQuery();
    } else if (next === 'confirm') {
      spot(controls, [0, 47, 390, 167], '关闭确认弹层', back);
      spot(controls, [16, 746, 42, 55], '客服', () => openSheet('生活缴费客服', null, '请核对缴费户号、账单金额和账单周期。'));
      spot(controls, [202, 752, 178, 42], '查询并缴费', pay);
    } else if (next === 'records') {
      renderRecords();
    }
    if (focus) title.focus({ preventScroll: true });
  }

  closeButton.addEventListener('click', () => closeSheet());
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeSheet();
  });
  device.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!overlay.hidden) {
        event.preventDefault();
        closeSheet();
      } else if (active === 'confirm' && !previewDialog.open) back();
    }
    if (event.key === 'Tab' && !overlay.hidden) {
      event.preventDefault();
      closeButton.focus();
    }
  });
  demo.querySelector('[data-demo-reset]').addEventListener('click', async () => {
    pendingNavigation = undefined;
    function resetState() {
      trail.length = 0;
      paid = accountEdited = false;
      accountValue = exampleAccount;
    }
    if (active === 'home') {
      resetState();
      show('home');
    } else if (!await navigate('home', 'fade', resetState)) return;
    controls.querySelector('button').focus();
  });

  function openPreview() {
    if (previewDialog.open) return;
    chapter.style.minHeight = chapter.getBoundingClientRect().height + 'px';
    previewStage.append(demo);
    previewDialog.showModal();
    previewStage.scrollTop = 0;
    document.documentElement.classList.add('image-preview-open');
  }

  demo.addEventListener('click', event => {
    if (event.target !== previewTrigger && (event.target.closest('.youlin-phone, button, a, input, select') || getSelection()?.type === 'Range')) return;
    if (previewDialog.open) previewDialog.close();
    else openPreview();
  });
  previewDialog.querySelector('.preview-close').addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('click', event => {
    if (event.target === previewDialog || event.target === previewStage) previewDialog.close();
  });
  previewDialog.addEventListener('close', () => {
    chapter.append(demo);
    chapter.style.removeProperty('min-height');
    document.documentElement.classList.remove('image-preview-open');
    previewTrigger.focus({ preventScroll: true });
  });

  const tabs = [
    ['home', '首页'], ['square', '人民广场'], ['shop', '商城'], ['profile', '我'],
  ].map(([screen, label], index) => {
    const icon = document.createElement('span');
    icon.className = 'youlin-tab-icon';
    icon.setAttribute('aria-hidden', 'true');
    const button = action(label, () => followIcon(screen, icon, 'fade'));
    button.style.setProperty('--youlin-tab-column', (index / 3 * 100) + '%');
    button.append(icon, label);
    tabBar.append(button);
    return { screen, button };
  });

  show('home', { focus: false });
})();
