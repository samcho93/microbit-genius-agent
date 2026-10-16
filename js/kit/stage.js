// 시뮬레이션 무대: micro:bit + 확장보드 + 구성품 자동 배치 + 3핀 케이블 + 조절 패널
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const VW = 1200, VH = 1010;
  const MBX = 410, MBY = 26, MBW = 380, MBH = 314;           // micro:bit 위치
  const HX0 = 398, HDX = 40, HY = { S: 384, V: 403, G: 422 };  // 확장보드 3핀 단자
  const I2C = { x: 800, SDA: 366, SCL: 385, V: 404, G: 423 };
  const WIRE = { G: '#262626', V: '#e53935', S: '#f5c400', SCL: '#22a06b', SDA: '#2f80ed', ECHO: '#ff8a00' };

  // 구성품 자리 (가운데 좌표). 앞쪽부터 우선 사용
  const SLOTS = {
    L1: [128, 150], L2: [128, 420], L3: [128, 690], L4: [128, 965],
    R1: [1072, 150], R2: [1072, 420], R3: [1072, 690], R4: [1072, 965],
    B1: [365, 690], B2: [600, 760], B3: [835, 690], B4: [365, 965], B5: [835, 965],
  };
  const PRIORITY = ['R2', 'L2', 'B2', 'L1', 'R1', 'B1', 'B3', 'L3', 'R3', 'B4', 'B5', 'L4', 'R4'];

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const hcol = pin => KIT.HEADER_PINS.indexOf(pin);
  const headerX = pin => HX0 + hcol(pin) * HDX;

  const St = window.Stage = { svg: null, nodes: [] };

  function drawExpansionBoard(g) {
    // 흰색 확장보드
    el('rect', { x: 352, y: 228, width: 496, height: 236, rx: 16, fill: '#f6f6f2', stroke: '#c9ccc6', 'stroke-width': 2, filter: 'url(#k-shadow)' }, g);
    for (const [x, y] of [[372, 248], [828, 248], [372, 444], [828, 444]]) el('circle', { cx: x, cy: y, r: 7, fill: '#dfe2e6', stroke: '#a9adb2', 'stroke-width': 1.5 }, g);
    const t = el('text', { x: 600, y: 456, 'text-anchor': 'middle', 'font-size': 11, fill: '#8a8f96', 'font-family': 'sans-serif', 'font-weight': 700 }, g);
    t.textContent = 'micro:bit 확장보드';
    // 전원 스위치 · 배터리 단자 장식
    el('rect', { x: 362, y: 300, width: 24, height: 40, rx: 3, fill: '#2b2b2e' }, g);
    el('rect', { x: 367, y: 306, width: 14, height: 14, rx: 2, fill: '#e0e0e0' }, g);
    // 3핀 단자 (S 노랑 · V 빨강 · G 검정)
    KIT.HEADER_PINS.forEach((p, i) => {
      const x = HX0 + i * HDX;
      el('rect', { x: x - 13, y: HY.S - 12, width: 26, height: 60, rx: 3, fill: '#2a2a2c' }, g);
      for (const [k, c] of [['S', '#f5c400'], ['V', '#e53935'], ['G', '#3a3a3a']]) {
        el('rect', { x: x - 9, y: HY[k] - 7, width: 18, height: 15, rx: 2, fill: c }, g);
        el('rect', { x: x - 2.5, y: HY[k] - 2.5, width: 5, height: 5, fill: '#d4b25a' }, g);
      }
      const lb = el('text', { x, y: HY.G + 30, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#475069', 'font-family': 'monospace' }, g);
      lb.textContent = p;
    });
    // I2C 단자
    el('rect', { x: I2C.x - 13, y: I2C.SDA - 12, width: 26, height: 78, rx: 3, fill: '#2a2a2c' }, g);
    for (const [k, c] of [['SDA', '#2f80ed'], ['SCL', '#22a06b'], ['V', '#e53935'], ['G', '#3a3a3a']]) {
      el('rect', { x: I2C.x - 9, y: I2C[k] - 7, width: 18, height: 15, rx: 2, fill: c }, g);
      el('rect', { x: I2C.x - 2.5, y: I2C[k] - 2.5, width: 5, height: 5, fill: '#d4b25a' }, g);
      const lb = el('text', { x: I2C.x + 18, y: I2C[k] + 4, 'font-size': 9, fill: '#475069', 'font-family': 'monospace' }, g);
      lb.textContent = k === 'SDA' ? 'SDA·P20' : k === 'SCL' ? 'SCL·P19' : k === 'V' ? '3V' : 'GND';
    }
    const i2cl = el('text', { x: I2C.x, y: I2C.G + 30, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#475069', 'font-family': 'monospace' }, g);
    i2cl.textContent = 'I2C';
  }

  function slotPositions(n) {
    const keys = PRIORITY.slice(0, Math.min(n, PRIORITY.length));
    return keys.map(k => ({ key: k, x: SLOTS[k][0], y: SLOTS[k][1] }))
      .sort((a, b) => (a.x - b.x) || (a.x < 600 ? b.y - a.y : a.y - b.y));
  }

  // 케이블 한 가닥
  function wire(g, x1, y1, x2, y2, dir, color, bend) {
    const c1y = y1 + 60 + bend;
    let c2x = x2, c2y = y2;
    if (dir === 'down') c2y = y2 + 90; else if (dir === 'up') c2y = y2 - 90; else if (dir === 'left') c2x = x2 - 90; else c2x = x2 + 90;
    const d = `M${x1} ${y1} C${x1} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;
    el('path', { d, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, g);
    el('path', { d, stroke: color, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', class: 'k-wire' }, g);
  }

  St.build = function (host, components) {
    host.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'stage-svg', role: 'img', 'aria-label': '시뮬레이션 회로' });
    host.appendChild(svg);
    St.svg = svg;
    const bg = el('g', {}, svg);
    el('rect', { x: -400, y: -400, width: VW + 800, height: VH + 800, fill: 'url(#stage-grid)', class: 'stage-bg' }, bg);
    const defs = el('defs', {}, svg);
    defs.innerHTML = `<pattern id="stage-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" class="stage-gridline"/></pattern>`;

    const content = el('g', {}, svg);
    const boardG = el('g', {}, content);
    drawExpansionBoard(boardG);
    const mbG = el('g', {}, content);
    // micro:bit 그림은 한 번만 만들고 다시 배치할 때는 옮겨 붙임 (이벤트 중복 방지)
    if (!St.mbSvg) { MBBoard.init(mbG); St.mbSvg = MBBoard.svg; } else mbG.appendChild(St.mbSvg);
    const mbSvg = St.mbSvg;
    for (const [k, v] of Object.entries({ x: MBX, y: MBY, width: MBW, height: MBH })) mbSvg.setAttribute(k, v);
    // 가장자리 커넥터 슬롯 (micro:bit 를 꽂는 부분)
    el('rect', { x: MBX - 8, y: 300, width: MBW + 16, height: 46, rx: 5, fill: '#1e1e20' }, content);
    el('rect', { x: MBX - 2, y: 306, width: MBW + 4, height: 6, rx: 2, fill: '#3a3a3e' }, content);

    const wiresG = el('g', { class: 'k-wires' }, content);
    const partsG = el('g', {}, content);

    const devs = MB.kit.devices.filter(d => KIT.byId[d.type]);
    const slots = slotPositions(devs.length);
    // 단자 왼쪽 → 오른쪽 순서대로 자리 배정
    const colOf = d => {
      if (d.type === 'oled') return 99;
      const ps = Object.values(d.pins).map(hcol).filter(i => i >= 0);
      return ps.length ? Math.min(...ps) : 50;
    };
    const ordered = devs.slice().sort((a, b) => colOf(a) - colOf(b));
    St.nodes = [];
    ordered.forEach((d, i) => {
      const s = slots[i] || { x: 600, y: 900 };
      const art = KitDraw.draw(d.type);
      // OLED 는 글씨가 보이도록 크게 (나머지는 칸 크기에 맞춤)
      const sc = d.type === 'oled' ? 2.1 : Math.min(1.5, 225 / art.w, 225 / art.h);
      const ox = s.x - art.w * sc / 2, oy = s.y - art.h * sc / 2 - 8;
      const g = el('g', { class: 'k-part k-' + d.type, transform: `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${sc.toFixed(3)})`, 'data-type': d.type }, partsG);
      g.innerHTML = art.svg;
      // 이름표
      const label = el('g', { class: 'k-label' }, partsG);
      const ly = oy + art.h * sc + 24;
      const txt = el('text', { x: s.x, y: ly, 'text-anchor': 'middle', class: 'k-label-text' }, label);
      const pinTxt = d.type === 'oled' ? 'I2C' : Object.entries(d.pins).map(([r, p]) => (Object.keys(d.pins).length > 1 ? r.toUpperCase() + ' ' : '') + p).join(' · ');
      txt.textContent = `${d.label || KIT.byId[d.type].name}  ${pinTxt}`;
      const val = el('text', { x: s.x, y: ly + 18, 'text-anchor': 'middle', class: 'k-value-text' }, label);
      const ax = ox + art.anchor.x * sc, ay = oy + art.anchor.y * sc;
      // 케이블
      if (d.type === 'oled') {
        const offs = { G: -21, V: -7, SCL: 7, SDA: 21 };
        let b = 0;
        for (const k of ['G', 'V', 'SCL', 'SDA']) wire(wiresG, I2C.x, I2C[k], ax + offs[k] * sc, ay, art.anchor.dir, WIRE[k], (b += 6));
      } else if (d.type === 'sonar') {
        const tx = headerX(d.pins.trig), ex = headerX(d.pins.echo);
        const o = x => ax + x * sc;
        wire(wiresG, tx, HY.V, o(-18), ay, 'down', WIRE.V, 0);
        wire(wiresG, tx, HY.S, o(-6), ay, 'down', WIRE.S, 8);
        wire(wiresG, ex, HY.S, o(6), ay, 'down', WIRE.ECHO, 16);
        wire(wiresG, ex, HY.G, o(18), ay, 'down', WIRE.G, 24);
      } else if (d.pins.sig) {
        const hx = headerX(d.pins.sig);
        const along = art.anchor.dir === 'left' || art.anchor.dir === 'right';
        const offs = { G: -10, V: 0, S: 10 };
        for (const k of ['G', 'V', 'S']) {
          const tx = along ? ax : ax + offs[k] * sc, ty = along ? ay + offs[k] * sc : ay;
          wire(wiresG, hx + (k === 'S' ? 0 : 0), HY[k], tx, ty, art.anchor.dir, WIRE[k], (hcol(d.pins.sig) % 3) * 10);
        }
      }
      St.nodes.push({ d, g, val, sc });
      bindStageInput(d, g);
    });
    St.renderAll();
    St.content = content;
    bindZoom(host, svg);
    St.fit();
    return svg;
  };

  // 무대 위 구성품 직접 누르기
  function bindStageInput(d, g) {
    const hold = (target, on, off) => {
      target.style.cursor = 'pointer';
      target.addEventListener('pointerdown', e => { e.preventDefault(); try { target.setPointerCapture(e.pointerId); } catch (_) {} on(); });
      const up = () => off();
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    };
    if (d.type === 'crash') hold(g, () => MB.kit.set(d, true), () => MB.kit.set(d, false));
    if (d.type === 'keypad') g.querySelectorAll('.k-key').forEach(k => hold(k, () => MB.kit.set(d, k.dataset.key), () => MB.kit.set(d, null)));
    if (d.type === 'pir') { g.style.cursor = 'pointer'; g.addEventListener('click', () => MB.kit.set(d, !d.value)); }
  }

  const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

  St.render = function (node) {
    const { d, g, val } = node;
    const K = MB.kit;
    const q = s => g.querySelector(s);
    let text = '';
    switch (d.type) {
      case 'pot': { q('.k-knob').style.transform = `rotate(${(d.value / 1023) * 270 - 135}deg)`; text = `값 ${Math.round(d.value)}`; break; }
      case 'light': text = `밝기 ${Math.round(d.value)}`; break;
      case 'tmp36': text = `${d.value.toFixed ? d.value.toFixed(1) : d.value}°C  (값 ${MB.pins[d.n.sig].analogIn})`; break;
      case 'soil': q('.k-soil-wet').setAttribute('opacity', (d.value / 1023).toFixed(2)); text = `수분 ${Math.round(d.value)}`; break;
      case 'mq3': q('.k-gas-haze').setAttribute('opacity', (Math.max(0, d.value - 150) / 1400).toFixed(2)); text = `가스 ${Math.round(d.value)}`; break;
      case 'crash': q('.k-lever').style.transform = d.value ? 'rotate(14deg)' : ''; text = d.value ? '눌림 (0)' : '안 눌림 (1)'; break;
      case 'pir': q('.k-pir-ring').setAttribute('opacity', d.value ? 1 : 0); text = d.value ? '움직임 감지 (1)' : '조용함 (0)'; break;
      case 'keypad': g.querySelectorAll('.k-key').forEach(k => k.classList.toggle('down', k.dataset.key === d.value)); text = d.value ? `${d.value} 누름` : '안 누름'; break;
      case 'sonar': text = `거리 ${Math.round(d.value)} cm`; break;
      case 'led': {
        const v = K.output(d) || 0;
        q('.k-led-glow').setAttribute('opacity', (v * v).toFixed(2));
        q('.k-led-core').setAttribute('opacity', (v * 0.8).toFixed(2));
        text = v ? `켜짐 ${Math.round(v * 100)}%` : '꺼짐';
        break;
      }
      case 'motor': {
        const v = K.output(d) || 0;
        const fan = q('.k-fan');
        if (v > 0.02) { fan.style.animation = `k-spin ${(0.9 - v * 0.8).toFixed(2)}s linear infinite`; } else fan.style.animation = 'none';
        text = v ? `회전 ${Math.round(v * 100)}%` : '정지';
        break;
      }
      case 'servo': {
        const a = K.output(d);
        q('.k-horn').style.transform = `rotate(${a === null ? 0 : -(a - 0)}deg)`;
        text = a === null ? '대기' : `${a}°`;
        break;
      }
      case 'ring': {
        const px = g.querySelectorAll('.k-px');
        let lit = 0;
        px.forEach((p, i) => {
          const c = d.ring[i] || [0, 0, 0];
          const on = c[0] + c[1] + c[2] > 0;
          if (on) lit++;
          p.setAttribute('fill', on ? rgb(c.map(v => Math.min(255, 60 + v * 0.85))) : '#e9e3d6');
          p.style.filter = on ? `drop-shadow(0 0 5px ${rgb(c)})` : '';
        });
        text = lit ? `${lit}개 켜짐` : '꺼짐';
        break;
      }
      case 'oled': {
        const b = MB.oled.shown;
        let path = '';
        for (let y = 0; y < 64; y++) {
          let x = 0;
          while (x < 128) {
            if (b[y * 128 + x]) { let s = x; while (x < 128 && b[y * 128 + x]) x++; path += `M${s} ${y}h${x - s}v1h${s - x}z`; } else x++;
          }
        }
        q('.k-oled-px').setAttribute('d', path);
        text = MB.oled.on ? '표시 중' : '꺼짐';
        break;
      }
      default: break;
    }
    val.textContent = text;
  };

  // 쓰인 부분만 보이도록 viewBox 맞춤 (화면이 숨겨져 있으면 전체)
  // 쓰인 부분만 보이도록 viewBox 맞춤 (화면이 숨겨져 있으면 전체). 확대·이동도 viewBox 로 처리
  St.fit = function () {
    if (!St.svg || !St.content) return;
    let b;
    try { b = St.content.getBBox(); } catch (_) { b = null; }
    if (!b || !b.width) { St.fitVB = null; St.svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`); return; }
    const pad = 24;
    St.fitVB = { x: Math.floor(b.x - pad), y: Math.floor(b.y - pad), w: Math.ceil(b.width + pad * 2), h: Math.ceil(b.height + pad * 2) };
    setVB(Object.assign({}, St.fitVB));
  };
  function setVB(v) {
    St.vb = v;
    St.svg.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`);
    if (St.zoomLabel && St.fitVB) St.zoomLabel.textContent = Math.round(St.fitVB.w / v.w * 100) + '%';
  }
  // 화면 좌표 → viewBox 좌표
  function svgPoint(cx, cy) {
    const r = St.svg.getBoundingClientRect(), v = St.vb;
    const s = Math.max(v.w / r.width, v.h / r.height);           // preserveAspectRatio meet
    const ox = (r.width - v.w / s) / 2, oy = (r.height - v.h / s) / 2;
    return { x: v.x + (cx - r.left - ox) * s, y: v.y + (cy - r.top - oy) * s, s };
  }
  St.zoom = function (factor, cx, cy) {
    if (!St.vb || !St.fitVB) return;
    const v = St.vb;
    const nw = Math.max(St.fitVB.w / 8, Math.min(St.fitVB.w * 1.5, v.w * factor));
    const f = nw / v.w;
    const r = St.svg.getBoundingClientRect();
    const p = cx === undefined ? { x: v.x + v.w / 2, y: v.y + v.h / 2 } : svgPoint(cx, cy);
    setVB({ x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f, w: v.w * f, h: v.h * f });
  };
  St.resetZoom = () => { if (St.fitVB) setVB(Object.assign({}, St.fitVB)); };

  function bindZoom(host, svg) {
    // 마우스 휠: 커서 위치를 중심으로 확대·축소
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      St.zoom(Math.exp(dy * 0.0015), e.clientX, e.clientY);
    }, { passive: false });
    // 빈 곳을 끌면 이동 (구성품·버튼 누르기는 그대로)
    let drag = null;
    svg.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.mb-touch, .k-part')) return;
      drag = { x: e.clientX, y: e.clientY, vb: Object.assign({}, St.vb), id: e.pointerId, moved: false };
    });
    svg.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) { drag.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} svg.classList.add('panning'); }
      const s = svgPoint(0, 0).s;
      setVB({ x: drag.vb.x - dx * s, y: drag.vb.y - dy * s, w: drag.vb.w, h: drag.vb.h });
    });
    const end = () => { drag = null; svg.classList.remove('panning'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('dblclick', e => { if (!e.target.closest('.mb-touch, .k-part')) St.resetZoom(); });
    // 확대 버튼 (터치 화면용)
    const bar = document.createElement('div');
    bar.className = 'stage-zoom';
    bar.innerHTML = '<button type="button" data-z="in" title="확대 (마우스 휠)">＋</button><span class="zl">100%</span><button type="button" data-z="out" title="축소">－</button><button type="button" data-z="fit" title="전체 보기 (빈 곳 더블클릭)">⤢</button>';
    bar.onclick = e => {
      const z = e.target.dataset && e.target.dataset.z;
      if (z === 'in') St.zoom(1 / 1.3); else if (z === 'out') St.zoom(1.3); else if (z === 'fit') St.resetZoom();
    };
    host.appendChild(bar);
    St.zoomLabel = bar.querySelector('.zl');
  }

  St.renderAll = () => St.nodes.forEach(St.render);
  const renderType = (...types) => St.nodes.forEach(n => { if (types.includes(n.d.type)) St.render(n); });

  // 다음 화면 그리기 때 한 번만 다시 그림. 종류(key)별로 모아 두어 서로 덮어쓰지 않게
  let raf = 0;
  const pending = new Map();
  const schedule = (fn, key) => {
    pending.set(key || fn, fn);
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const fns = [...pending.values()]; pending.clear(); fns.forEach(f => f()); });
  };
  MB.on('pinout', () => schedule(() => renderType('led', 'motor', 'servo'), 'pins'));
  MB.on('ring', () => renderType('ring'));
  MB.on('oled', () => schedule(() => renderType('oled'), 'oled'));
  MB.on('kitinput', d => St.nodes.forEach(n => { if (n.d === d) St.render(n); }));
  MB.on('sonarping', d => {
    const n = St.nodes.find(x => x.d === d);
    if (!n) return;
    const w = n.g.querySelector('.k-sonar-wave');
    w.setAttribute('opacity', 1);
    clearTimeout(n.t); n.t = setTimeout(() => w.setAttribute('opacity', 0), 160);
  });
  MB.on('reset', () => setTimeout(St.renderAll, 0));

  // ---------- 조절 패널 ----------
  const SLIDERS = {
    pot: { min: 0, max: 1023, step: 1, lab: '손잡이' },
    light: { min: 0, max: 1023, step: 1, lab: '밝기' },
    tmp36: { min: -10, max: 50, step: 0.5, lab: '온도 °C' },
    soil: { min: 0, max: 1023, step: 1, lab: '수분' },
    mq3: { min: 0, max: 1023, step: 1, lab: '가스 농도' },
    sonar: { min: 2, max: 300, step: 1, lab: '거리 cm' },
  };

  St.buildControls = function (host) {
    host.innerHTML = '';
    const mk = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e; };
    for (const d of MB.kit.devices) {
      const part = KIT.byId[d.type];
      if (!part || part.group === 'accessory') continue;
      const row = mk('div', 'ctl', host);
      const ic = mk('div', 'ctl-ic', row); ic.innerHTML = KitDraw.thumb(d.type);
      const body = mk('div', 'ctl-body', row);
      const head = mk('div', 'ctl-head', body);
      mk('b', '', head, part.name);
      mk('span', 'pinbadge', head, d.type === 'oled' ? 'I2C P19/P20' : Object.entries(d.pins).map(([r, p]) => (part.pins.length > 1 ? r + ' ' : '') + p).join(' · '));
      const out = mk('span', 'ctl-out', head);
      const ctl = mk('div', 'ctl-input', body);
      const sl = SLIDERS[d.type];
      if (sl) {
        const r = mk('input', '', ctl); r.type = 'range'; r.min = sl.min; r.max = sl.max; r.step = sl.step; r.value = d.value;
        r.setAttribute('aria-label', part.name + ' ' + sl.lab);
        const lab = mk('span', 'ctl-val', ctl);
        const upd = () => { lab.textContent = `${sl.lab} ${r.value}`; };
        r.oninput = () => { MB.kit.set(d, +r.value); upd(); };
        upd();
      } else if (d.type === 'crash') {
        const b = mk('button', 'btn sm', ctl, '꾹 누르기');
        b.onpointerdown = () => MB.kit.set(d, true);
        b.onpointerup = b.onpointerleave = () => d.value && MB.kit.set(d, false);
      } else if (d.type === 'pir') {
        const b = mk('button', 'btn sm', ctl, '움직임 감지 켜기/끄기');
        b.onclick = () => MB.kit.set(d, !d.value);
      } else if (d.type === 'keypad') {
        for (const k of ['A', 'B', 'C', 'D', 'E']) {
          const b = mk('button', 'btn sm key', ctl, k);
          b.onpointerdown = () => MB.kit.set(d, k);
          b.onpointerup = b.onpointerleave = () => d.value === k && MB.kit.set(d, null);
        }
      } else {
        if (d.type === 'oled') {
          // 확대한 OLED 화면 (무대에서는 글씨가 작아서)
          const cv = mk('canvas', 'oled-big', ctl); cv.width = 128; cv.height = 64;
          cv.setAttribute('aria-label', 'OLED 화면 확대');
          St.oledCanvas = cv; drawOledBig();
        } else mk('span', 'muted', ctl, '코드가 제어하는 출력 장치');
      }
      const sync = () => { const n = St.nodes.find(x => x.d === d); out.textContent = n ? n.val.textContent : ''; };
      d._sync = sync; sync();
    }
  };
  function drawOledBig() {
    const cv = St.oledCanvas;
    if (!cv || !cv.isConnected) return;
    const g = cv.getContext('2d'), b = MB.oled.shown, img = g.createImageData(128, 64);
    for (let i = 0; i < 128 * 64; i++) {
      const on = b[i], k = i * 4;
      img.data[k] = on ? 127 : 3; img.data[k + 1] = on ? 215 : 6; img.data[k + 2] = on ? 255 : 12; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  MB.on('oled', () => schedule2(drawOledBig));
  let raf2 = 0;
  function schedule2(fn) { if (raf2) return; raf2 = requestAnimationFrame(() => { raf2 = 0; fn(); }); }

  const syncAll = () => MB.kit.devices.forEach(d => d._sync && d._sync());
  ['pinout', 'ring', 'oled', 'kitinput', 'reset'].forEach(ev => MB.on(ev, () => setTimeout(syncAll, 20)));

  St.setup = function (stageHost, ctlHost, components) {
    MB.kit.setup(components);
    St.build(stageHost, components);
    St.buildControls(ctlHost);
  };
})();
