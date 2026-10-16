// 키트 장치 모델: 센서 값 → 핀 입력, 핀 출력 → 액추에이터 상태, OLED 프레임버퍼
(function () {
  // ---------- OLED (SSD1306 128x64) ----------
  const W = 128, H = 64;
  const O = MB.oled = {
    buf: new Uint8Array(W * H),     // 그리는 중인 버퍼
    shown: new Uint8Array(W * H),   // 화면에 보이는 내용
    on: false,
    row: 0,                         // print_line 용 줄 위치
    cx: 0, cy: 0,                   // MakeCode 글자 커서 (글자 단위)
  };
  const emitOled = () => MB.emit('oled', O.shown);
  O.reset = function () { O.buf.fill(0); O.shown.fill(0); O.row = 0; O.cx = 0; O.cy = 0; O.on = false; emitOled(); };
  O.px = function (x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    O.buf[y * W + x] = c ? 1 : 0;
  };
  O.text = function (s, x, y, scale, c) {
    scale = Math.max(1, scale | 0 || 1);
    for (const ch of String(s)) {
      const g = MBFont.glyph(ch);
      for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 5; gy++) {
        if (!g[gy * 5 + gx]) continue;
        for (let dx = 0; dx < scale; dx++) for (let dy = 0; dy < scale; dy++)
          O.px(x + gx * scale + dx, y + (gy + 1) * scale + dy, c);
      }
      x += 6 * scale;
    }
  };
  O.line = function (x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      O.px(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 1000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  O.rect = function (x, y, w, h, c, fill) {
    if (fill) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) O.px(x + i, y + j, c); return; }
    O.line(x, y, x + w - 1, y, c); O.line(x, y + h - 1, x + w - 1, y + h - 1, c);
    O.line(x, y, x, y + h - 1, c); O.line(x + w - 1, y, x + w - 1, y + h - 1, c);
  };
  O.show = function () { O.shown.set(O.buf); O.on = true; emitOled(); };
  O.clearBuf = function () { O.buf.fill(0); O.row = 0; O.cx = 0; O.cy = 0; };

  // MicroPython oled 모듈에서 오는 명령
  O.op = function (op, a) {
    const c = a[4] === undefined ? 1 : (a[4] ? 1 : 0);
    switch (op) {
      case 'init': O.clearBuf(); O.show(); break;
      case 'clear': O.clearBuf(); break;
      case 'show': O.show(); break;
      case 'pixel': O.px(a[0], a[1], a[2] === undefined ? 1 : a[2]); break;
      case 'text': O.text(a[0], a[1] || 0, a[2] || 0, a[3] || 1, c); break;
      case 'line': O.line(a[0], a[1], a[2], a[3], a[4] === undefined ? 1 : a[4]); break;
      case 'rect': O.rect(a[0], a[1], a[2], a[3], a[4] === undefined ? 1 : a[4], a[5]); break;
      case 'print':
        if (O.row >= 8) O.clearBuf();
        O.text(a[0], 0, O.row * 8, 1, 1); O.row++; O.show(); break;
      default: throw new Error('unknown oled op ' + op);
    }
  };

  // MakeCode OLED 확장(pxt-oled-ssd1306): 글자 6x8 칸, 21열 x 8줄, 바로 화면에 표시
  O.mcNewLine = function () {
    O.cx = 0; O.cy++;
    if (O.cy >= 8) { // 한 줄 위로 밀기
      O.buf.copyWithin(0, W * 8); O.buf.fill(0, W * (H - 8));
      O.cy = 7;
    }
  };
  O.mcWrite = function (s, newline) {
    for (const ch of String(s)) {
      if (O.cx >= 21) O.mcNewLine();
      O.rect(O.cx * 6, O.cy * 8, 6, 8, 0, true);
      O.text(ch, O.cx * 6, O.cy * 8, 1, 1);
      O.cx++;
    }
    if (newline) O.mcNewLine();
    O.show();
  };

  // ---------- 키트 장치 ----------
  const DEFAULTS = {
    pot: 512, light: 520, tmp36: 25, soil: 420, mq3: 110, keypad: null, crash: false, pir: false, sonar: 80,
  };
  const KEY_VAL = { A: 5, B: 50, C: 95, D: 140, E: 545 };

  const K = MB.kit = { devices: [] };
  const pinNo = p => +String(p).replace(/\D/g, '');

  // tmp36 °C → 아날로그 값
  const tmpToAnalog = t => Math.max(0, Math.min(1023, Math.round((t * 10 + 500) * 1023 / 3300)));

  K.setup = function (list) {
    // 이전 입력 핀 정리
    for (const d of K.devices) for (const n of Object.values(d.n)) if (MB.pins[n]) MB.pins[n].analogIn = null;
    K.devices = (list || []).map(c => {
      const n = {};
      for (const [role, p] of Object.entries(c.pins || {})) n[role] = pinNo(p);
      const d = { type: c.type, label: c.label, pins: c.pins || {}, n, value: DEFAULTS[c.type], ring: new Array(8).fill([0, 0, 0]) };
      return d;
    });
    for (const d of K.devices) K.apply(d);
    MB.emit('kit');
  };

  K.find = type => K.devices.find(d => d.type === type);

  // 입력 장치 값 → 핀
  K.apply = function (d) {
    const pin = d.n.sig !== undefined ? MB.pins[d.n.sig] : null;
    switch (d.type) {
      case 'pot': case 'light': case 'soil': case 'mq3': pin.analogIn = Math.round(d.value); break;
      case 'tmp36': pin.analogIn = tmpToAnalog(d.value); break;
      case 'keypad': pin.analogIn = d.value ? KEY_VAL[d.value] : 1023; break;
      case 'crash': pin.analogIn = d.value ? 0 : 1023; break;   // 풀업: 누르면 0
      case 'pir': pin.analogIn = d.value ? 1023 : 0; break;
      default: break;
    }
  };

  K.set = function (d, v) { d.value = v; K.apply(d); MB.emit('kitinput', d); };

  // 초음파: echo 핀으로 펄스 길이(µs) 돌려줌
  K.pulseIn = function (n, level) {
    const d = K.devices.find(x => x.type === 'sonar' && x.n.echo === n);
    if (!d || level === 0) return -1;
    MB.emit('sonarping', d);
    return Math.round(d.value * 58);
  };
  K.sonarCm = function (trig, echo) {
    const d = K.devices.find(x => x.type === 'sonar' && x.n.echo === echo && (trig === undefined || x.n.trig === trig))
      || K.devices.find(x => x.type === 'sonar' && x.n.echo === echo);
    if (!d) return 0;
    MB.emit('sonarping', d);
    return d.value;
  };

  // 출력 장치 상태
  const level = p => (p.digitalOut !== null ? (p.digitalOut ? 1 : 0) : p.analogOut !== null ? p.analogOut / 1023 : 0);
  K.output = function (d) {
    const p = d.n.sig !== undefined ? MB.pins[d.n.sig] : null;
    if (!p) return null;
    switch (d.type) {
      case 'led': case 'motor': return level(p);
      case 'servo': {
        if (p.servo !== undefined && p.servo !== null) return p.servo;
        if (p.analogOut === null) return null;
        const ms = p.analogOut / 1023 * (p.period || 20);
        return Math.max(0, Math.min(180, Math.round((ms - 0.5) / 2 * 180)));
      }
      default: return null;
    }
  };

  MB.on('neopixel', e => {
    if (!e) { for (const d of K.devices) if (d.type === 'ring') d.ring = new Array(8).fill([0, 0, 0]); MB.emit('ring'); return; }
    const d = K.devices.find(x => x.type === 'ring' && x.n.sig === e.pin) || K.devices.find(x => x.type === 'ring');
    if (!d) return;
    d.ring = e.pixels.slice(0, 8).map(c => c.slice(0, 3));
    while (d.ring.length < 8) d.ring.push([0, 0, 0]);
    MB.emit('ring', d);
  });

  MB.on('reset', () => {
    for (const p of Object.values(MB.pins)) if (p && typeof p === 'object') p.servo = null;
    O.reset();
  });
})();
