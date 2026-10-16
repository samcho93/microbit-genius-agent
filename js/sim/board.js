// micro:bit V2 앞면 SVG 렌더링과 터치 입력
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 520, H = 430;
  const PAD_X = { 0: 58, 1: 159, 2: 260, '3V': 361, GND: 462 };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function build(host) {
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mb-svg', role: 'img', 'aria-label': 'micro:bit' });
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <linearGradient id="pcb" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#2b2b2e"/><stop offset="1" stop-color="#151517"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f3d27a"/><stop offset=".5" stop-color="#d4a93c"/><stop offset="1" stop-color="#a87b1e"/>
      </linearGradient>
      <linearGradient id="goldHi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff0b8"/><stop offset="1" stop-color="#e8bd50"/>
      </linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#eaeaea"/><stop offset=".55" stop-color="#b4b4b4"/><stop offset="1" stop-color="#7d7d7d"/>
      </linearGradient>
      <radialGradient id="cap" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#4a4a4e"/><stop offset=".6" stop-color="#1c1c1f"/><stop offset="1" stop-color="#050506"/>
      </radialGradient>
      <radialGradient id="ledGlow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#ff5a3a" stop-opacity=".9"/><stop offset=".45" stop-color="#ff2a10" stop-opacity=".35"/><stop offset="1" stop-color="#ff2a10" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="pinGlow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#5dff7a" stop-opacity=".95"/><stop offset="1" stop-color="#5dff7a" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>`;

    // 기판
    el('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 26, fill: 'url(#pcb)', stroke: '#0a0a0a', 'stroke-width': 3 }, svg);
    // 기판 미세 패턴 (배선 느낌)
    const traces = el('g', { opacity: .18, stroke: '#6b6b70', 'stroke-width': 1.2, fill: 'none' }, svg);
    traces.innerHTML = `
      <path d="M110 70 L140 70 L150 80 L150 280"/><path d="M410 70 L380 70 L370 80 L370 280"/>
      <path d="M40 240 L100 240 L120 260 L120 320"/><path d="M480 240 L420 240 L400 260 L400 320"/>
      <path d="M200 300 L200 318"/><path d="M320 300 L320 318"/>`;

    // 로고 (터치)
    const logo = el('g', { id: 'mb-logo', class: 'mb-touch' }, svg);
    el('rect', { x: 216, y: 18, width: 88, height: 46, rx: 23, fill: 'transparent' }, logo);
    el('rect', { x: 226, y: 24, width: 68, height: 34, rx: 17, fill: 'none', stroke: 'url(#gold)', 'stroke-width': 6, class: 'logo-ring' }, logo);
    el('circle', { cx: 246, cy: 41, r: 5.5, fill: 'url(#gold)', class: 'logo-dot' }, logo);
    el('circle', { cx: 274, cy: 41, r: 5.5, fill: 'url(#gold)', class: 'logo-dot' }, logo);

    // 마이크 구멍 + 마이크 LED
    el('circle', { cx: 345, cy: 41, r: 6, fill: '#050505', stroke: '#3a3a3a', 'stroke-width': 2 }, svg);
    el('rect', { id: 'mb-micled', x: 325, y: 37, width: 6, height: 8, rx: 1.5, fill: '#3c2a2a' }, svg);

    // 버튼 A, B
    function button(id, cx, label) {
      const g = el('g', { id, class: 'mb-touch mb-button' }, svg);
      el('rect', { x: cx - 40, y: 130, width: 80, height: 92, fill: 'transparent' }, g);
      el('text', { x: cx, y: 120, 'text-anchor': 'middle', class: 'mb-label' }, g).textContent = label;
      el('rect', { x: cx - 32, y: 144, width: 64, height: 64, rx: 6, fill: 'url(#metal)', stroke: '#555', 'stroke-width': 1.5 }, g);
      for (const [dx, dy] of [[-25, -25], [25, -25], [-25, 25], [25, 25]])
        el('circle', { cx: cx + dx, cy: 176 + dy, r: 2.6, fill: '#777' }, g);
      el('circle', { cx, cy: 176, r: 21, fill: 'url(#cap)', class: 'btn-cap', stroke: '#000', 'stroke-width': 1 }, g);
      return g;
    }
    button('mb-btn-a', 62, 'A');
    button('mb-btn-b', 458, 'B');

    // 5x5 LED
    const leds = [];
    const ledG = el('g', {}, svg);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const cx = 168 + x * 46, cy = 86 + y * 46;
      const glow = el('circle', { cx, cy, r: 22, fill: 'url(#ledGlow)', opacity: 0 }, ledG);
      el('rect', { x: cx - 5, y: cy - 11, width: 10, height: 22, rx: 2, fill: '#3a3434', stroke: '#1a1a1a', 'stroke-width': 1 }, ledG);
      const lit = el('rect', { x: cx - 5, y: cy - 11, width: 10, height: 22, rx: 2, fill: '#ff3b1f', opacity: 0 }, ledG);
      leds.push({ glow, lit });
    }

    // 가장자리 커넥터
    const edge = el('g', {}, svg);
    // 작은 핀(금도금 스트립)
    const bigs = Object.values(PAD_X);
    for (let i = 0; i < bigs.length - 1; i++) {
      const a = bigs[i] + 38, b = bigs[i + 1] - 38;
      const n = 4, step = (b - a) / n;
      for (let k = 0; k < n; k++) el('rect', { x: a + k * step + 3, y: 352, width: step - 6, height: 76, rx: 1.5, fill: 'url(#gold)', opacity: .9 }, edge);
    }
    el('rect', { x: 8, y: 352, width: 8, height: 76, rx: 1.5, fill: 'url(#gold)', opacity: .9 }, edge);
    el('rect', { x: W - 16, y: 352, width: 8, height: 76, rx: 1.5, fill: 'url(#gold)', opacity: .9 }, edge);

    const pinEls = {};
    for (const [name, cx] of Object.entries(PAD_X)) {
      const touchable = ['0', '1', '2'].includes(name);
      const g = el('g', { id: 'mb-pin-' + name, class: touchable ? 'mb-touch mb-pin' : 'mb-pin' }, edge);
      el('path', { d: `M${cx - 36} 428 L${cx - 36} 336 Q${cx - 36} 318 ${cx - 18} 318 L${cx + 18} 318 Q${cx + 36} 318 ${cx + 36} 336 L${cx + 36} 428 Z`, fill: 'url(#gold)', stroke: '#7a5a14', 'stroke-width': 1.2, class: 'pad' }, g);
      el('circle', { cx, cy: 350, r: 20, fill: '#0b0b0c', stroke: '#8d6a1c', 'stroke-width': 2 }, g);
      el('text', { x: cx, y: 402, 'text-anchor': 'middle', class: 'mb-pinlabel' }, g).textContent = name;
      const glow = el('circle', { cx, cy: 350, r: 30, fill: 'url(#pinGlow)', opacity: 0, 'pointer-events': 'none' }, g);
      pinEls[name] = { g, glow };
    }

    host.appendChild(svg);
    return { svg, leds, pinEls };
  }

  const Board = {};

  Board.init = function (host) {
    const b = build(host);
    Board.svg = b.svg;

    MB.on('display', leds => {
      for (let i = 0; i < 25; i++) {
        const v = leds[i] / 9;
        b.leds[i].lit.setAttribute('opacity', v ? (0.35 + 0.65 * v).toFixed(2) : 0);
        b.leds[i].glow.setAttribute('opacity', (v * v).toFixed(2));
      }
    });

    // 터치/클릭: 포인터마다 따로 추적 (A+B 동시 누르기 가능)
    const map = { 'mb-btn-a': 'a', 'mb-btn-b': 'b', 'mb-logo': 'logo', 'mb-pin-0': 'pin0', 'mb-pin-1': 'pin1', 'mb-pin-2': 'pin2' };
    for (const [elId, id] of Object.entries(map)) {
      const g = b.svg.getElementById ? b.svg.getElementById(elId) : b.svg.querySelector('#' + elId);
      const active = new Set();
      const set = () => { const d = active.size > 0; g.classList.toggle('down', d); MB.input(id, d); };
      g.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { g.setPointerCapture(e.pointerId); } catch (_) {}
        active.add(e.pointerId); set();
        if (navigator.vibrate) navigator.vibrate(12);
      });
      const up = e => { if (active.delete(e.pointerId)) set(); };
      g.addEventListener('pointerup', up);
      g.addEventListener('pointercancel', up);
      g.addEventListener('lostpointercapture', up);
      g.addEventListener('contextmenu', e => e.preventDefault());
    }

    // 다른 곳(예: A+B 버튼)에서 들어온 입력도 화면에 반영
    MB.on('input', ({ id, down }) => {
      const elId = Object.keys(map).find(k => map[k] === id);
      if (elId) b.svg.querySelector('#' + elId).classList.toggle('down', down);
    });

    // 핀 출력 표시
    MB.on('pinout', () => {
      for (const n of [0, 1, 2]) {
        const p = MB.pins[n];
        let v = 0;
        if (p.digitalOut !== null) v = p.digitalOut ? 1 : 0;
        else if (p.analogOut !== null) v = p.analogOut / 1023;
        b.pinEls[String(n)].glow.setAttribute('opacity', v.toFixed(2));
      }
    });

    MB.on('mic', on => {
      b.svg.querySelector('#mb-micled').setAttribute('fill', on ? '#ff3b1f' : '#3c2a2a');
    });

    MB.display.refresh();
  };

  window.MBBoard = Board;
})();
