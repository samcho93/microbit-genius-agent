// 시뮬레이터 상태 · 이벤트 · 디스플레이 애니메이션
(function () {
  const listeners = {};
  const MB = {
    t0: performance.now(),
    running: false,
    temperature: 22,
    light: 120,
    volume: 255,
    speakerOn: true,
    buttons: {
      a: { down: false, presses: 0, was: false },
      b: { down: false, presses: 0, was: false },
      logo: { down: false, presses: 0, was: false },
    },
    pins: {},

    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return fn; },
    off(ev, fn) { const l = listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit(ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); },
    now() { return Math.floor(performance.now() - MB.t0); },
  };

  for (let n = 0; n <= 20; n++) {
    MB.pins[n] = { touch: false, digitalOut: null, analogOut: null, period: 20, analogIn: null, pull: 'down' };
  }

  // 버튼 · 로고 · 핀 입력
  MB.input = function (id, down) {
    if (MB.buttons[id]) {
      const b = MB.buttons[id];
      if (down && !b.down) { b.presses++; b.was = true; }
      b.down = down;
      if (id === 'logo') MB.pins.logo = down;
    } else if (/^pin\d+$/.test(id)) {
      MB.pins[+id.slice(3)].touch = down;
    }
    MB.emit('input', { id, down });
  };

  // ---------- 디스플레이 ----------
  const D = MB.display = {
    leds: new Array(25).fill(0),
    on: true,
    anim: null,
  };

  function render() { MB.emit('display', D.on ? D.leds : new Array(25).fill(0)); }

  function cancelAnim() {
    if (D.anim) { clearTimeout(D.anim.timer); const r = D.anim.resolve; D.anim = null; r(); }
  }

  D.set = function (leds) {
    cancelAnim();
    D.leds = leds.slice(0, 25).map(v => Math.max(0, Math.min(9, v | 0)));
    while (D.leds.length < 25) D.leds.push(0);
    render();
  };
  D.setPixel = function (x, y, v) {
    cancelAnim();
    D.leds[y * 5 + x] = Math.max(0, Math.min(9, v | 0));
    render();
  };
  D.getPixel = (x, y) => D.leds[y * 5 + x];
  D.clear = () => D.set(new Array(25).fill(0));
  D.setOn = function (on) { D.on = on; render(); };
  D.refresh = render;

  // 애니메이션: step(i)가 다음 프레임 배열 또는 null(끝) 반환
  function animate(step, delay) {
    cancelAnim();
    return new Promise(resolve => {
      const a = { resolve, timer: null };
      D.anim = a;
      let i = 0;
      const tick = () => {
        if (D.anim !== a) return;
        const f = step(i++);
        if (!f) { D.anim = null; resolve(); return; }
        D.leds = f; render();
        a.timer = setTimeout(tick, delay);
      };
      tick();
    });
  }

  D.scroll = function (text, delay, loop, monospace) {
    const cols = MBFont.textColumns(text, monospace);
    const blank = [0, 0, 0, 0, 0];
    const all = [blank, blank, blank, blank, blank].concat(cols).concat([blank, blank, blank, blank]);
    const n = all.length - 4;
    return animate(i => {
      if (i >= n) { if (!loop) return null; i = i % n; }
      const f = new Array(25).fill(0);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) f[y * 5 + x] = all[i + x][y];
      return f;
    }, delay);
  };

  // frames: 각 항목은 25칸 배열
  D.frames = function (frames, delay, loop, clear) {
    const n = frames.length;
    let done = false;
    return animate(i => {
      if (done) return null;
      if (i >= n) {
        if (loop && n) i = i % n;
        else if (clear) { done = true; return new Array(25).fill(0); }
        else return null;
      }
      return frames[i];
    }, delay);
  };

  D.reset = function () { cancelAnim(); D.on = true; D.leds = new Array(25).fill(0); render(); };

  window.MB = MB;
})();
