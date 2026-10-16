// Skulpt 로 MicroPython 코드를 실행하고 microbit API(_mb 모듈)를 연결
(function () {
  const PY_FILES = ['microbit/__init__.py', 'music.py', 'radio.py', 'log.py', 'speech.py', 'neopixel.py',
    'utime.py', 'time.py', 'machine.py', 'power.py', 'audio.py', 'gc.py', 'micropython.py', '_mbfs.py', 'os.py', 'oled.py'];
  const pySrc = {};
  const STOP = { stop: true }, RESET = { reset: true };

  const RT = MB.runtime = { running: false, stopFlag: false, current: null, code: '' };

  RT.loadLibs = function () {
    return Promise.all(PY_FILES.map(f => fetch('py/' + f, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error('py/' + f);
      return r.text();
    }).then(t => { pySrc['src/lib/' + f] = t; })));
  };

  function read(path) {
    if (path === 'src/lib/_mb.js') return 'var $builtinmodule = function (name) { return window.__mbModule(); };';
    if (pySrc[path] !== undefined) return pySrc[path];
    if (path === 'src/lib/time.js') throw new Error('use time.py');
    const files = Sk.builtinFiles && Sk.builtinFiles.files;
    if (files && files[path] !== undefined) return files[path];
    throw new Error('File not found: ' + path);
  }

  // ---------- 변환 도우미 ----------
  const None = () => Sk.builtin.none.none$;
  const py = v => (v === null || v === undefined ? None() : Sk.ffi.remapToPy(v));
  const js = v => (v === undefined ? undefined : Sk.ffi.remapToJs(v));
  let abortResolve = null, abortPromise = null;
  function susp(p, map) {
    const q = Promise.race([Promise.resolve(p), abortPromise]).then(v => (map ? map(v) : None()));
    return Sk.misceval.promiseToSuspension(q);
  }
  const wait = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

  function f(fn) { return new Sk.builtin.func(fn); }
  const OSErr = () => Sk.builtin.OSError || Sk.builtin.IOError;

  window.__mbModule = function () {
    const S = MB.sensors, D = MB.display, A = MB.audio, M = MB.mic;
    const m = {};
    const def = (name, fn) => { m[name] = f(fn); };

    def('sleep', ms => susp(wait(js(ms))));
    def('running_time', () => py(MB.now()));
    def('ticks_us', () => py(Math.floor((performance.now() - MB.t0) * 1000)));
    def('temperature', () => py(Math.round(MB.temperature)));

    // 디스플레이
    def('display_set', l => { D.set(js(l)); return None(); });
    def('display_get', (x, y) => py(D.getPixel(js(x), js(y))));
    def('display_set_pixel', (x, y, v) => { D.setPixel(js(x), js(y), js(v)); return None(); });
    def('display_clear', () => { D.clear(); return None(); });
    def('display_on', on => { D.setOn(js(on)); return None(); });
    def('display_is_on', () => py(D.on));
    def('light_level', () => py(Math.round(MB.light)));
    def('char_image', c => py(MBFont.glyph(js(c))));
    def('display_scroll', (text, delay, w, loop, mono) => {
      const p = D.scroll(js(text), js(delay), js(loop), js(mono));
      return js(w) && !js(loop) ? susp(p) : None();
    });
    def('display_frames', (frames, delay, w, loop, clear) => {
      const fr = js(frames).map(x => (typeof x === 'string' ? MBFont.glyph(x) : x));
      const p = D.frames(fr, js(delay), js(loop), js(clear));
      return js(w) && !js(loop) ? susp(p) : None();
    });

    // 버튼 · 핀
    const btn = id => MB.buttons[js(id)];
    def('btn_is', id => py(btn(id).down));
    def('btn_was', id => { const b = btn(id); const r = b.was; b.was = false; return py(r); });
    def('btn_presses', id => { const b = btn(id); const r = b.presses; b.presses = 0; b.was = false; return py(r); });
    def('pin_touch', n => { n = js(n); return py(n === 'logo' ? MB.buttons.logo.down : MB.pins[n].touch); });
    def('pin_rd', n => {
      const p = MB.pins[js(n)];
      if (p.analogIn !== null) return py(p.analogIn > 511 ? 1 : 0);
      if (p.touch) return py(p.pull === 'up' ? 0 : 1);
      if (p.digitalOut !== null) return py(p.digitalOut);
      return py(p.pull === 'up' ? 1 : 0);
    });
    def('pin_wd', (n, v) => { const p = MB.pins[js(n)]; p.digitalOut = js(v) ? 1 : 0; p.analogOut = null; MB.emit('pinout', js(n)); return None(); });
    def('pin_ra', n => {
      const p = MB.pins[js(n)];
      if (p.analogIn !== null) return py(Math.round(p.analogIn));
      if (p.touch) return py(1023);
      return py(p.analogOut !== null ? p.analogOut : (p.digitalOut ? 1023 : 0));
    });
    def('pin_wa', (n, v) => {
      const p = MB.pins[js(n)]; const val = Math.max(0, Math.min(1023, Math.round(js(v))));
      p.analogOut = val; p.digitalOut = null; MB.emit('pinout', js(n)); return None();
    });
    def('pin_period', (n, ms) => { MB.pins[js(n)].period = js(ms); return None(); });
    def('pin_pull', (n, pull) => { MB.pins[js(n)].pull = js(pull); return None(); });

    // 가속도 · 나침반
    def('acc', () => py(S.values()));
    def('gesture', () => py(S.gesture));
    def('was_gesture', g => py(S.wasGesture(js(g))));
    def('gestures', () => py(S.getGestures()));
    def('heading', () => py(Math.round(((S.heading % 360) + 360) % 360)));
    def('mag', () => py(S.magnetic()));
    def('is_cal', () => py(S.calibrated));
    def('clear_cal', () => { S.setCalibrated(false); return None(); });
    def('calibrate', () => {
      MB.emit('serial', '[나침반 보정] 기기를 이리저리 기울여 화면을 채우세요\r\n');
      const p = (async () => {
        await D.scroll('TILT TO FILL SCREEN', 70, false, false);
        const lit = new Array(25).fill(0);
        const order = [...Array(25).keys()].sort(() => Math.random() - 0.5);
        for (const i of order) { if (RT.stopFlag) return; lit[i] = 9; D.set(lit); await wait(60); }
        D.set('0000000009000909090009000'.split('').map(Number).map(v => v * 9)); // 체크 표시
        S.setCalibrated(true);
        await wait(500);
        D.clear();
      })();
      return susp(p);
    });

    // 소리
    def('music_pitch', (freq, ms, w) => {
      const p = A.tone(js(freq), js(ms));
      return js(w) && js(ms) >= 0 ? susp(p) : None();
    });
    def('music_play', (notes, w, loop) => {
      let p;
      try { p = A.playNotes(js(notes), js(loop)); } catch (e) { throw new Sk.builtin.ValueError(e.message); }
      return js(w) && !js(loop) ? susp(p) : None();
    });
    def('music_stop', () => { A.stop(); return None(); });
    def('music_tempo', (ticks, bpm) => {
      if (js(ticks) !== null) A.music.ticks = js(ticks);
      if (js(bpm) !== null) A.music.bpm = js(bpm);
      return None();
    });
    def('music_get_tempo', () => py([A.music.ticks, A.music.bpm]));
    def('music_reset', () => { A.resetMusic(); return None(); });
    def('audio_sound', (name, w) => {
      const segs = A.SOUNDS[js(name)];
      if (!segs) throw new Sk.builtin.ValueError('unknown sound');
      const p = A.playSegs(segs, false);
      return js(w) ? susp(p) : None();
    });
    def('audio_effect', (params, w) => {
      const segs = js(params).flatMap(e => A.effectSegs(e));
      const p = A.playSegs(segs, false);
      return js(w) ? susp(p) : None();
    });
    def('audio_stop', () => { A.stop(); return None(); });
    def('is_playing', () => py(A.playing));
    def('set_volume', v => { A.setVolume(js(v)); return None(); });
    def('get_volume', () => py(MB.volume));
    def('speaker', on => { A.setSpeaker(js(on)); return None(); });
    def('speaker_is_on', () => py(MB.speakerOn));
    def('say', (text, w, speed, pitch) => {
      const p = A.say(js(text), { speed: js(speed), pitch: js(pitch) });
      return js(w) ? susp(p) : None();
    });

    // 마이크
    def('mic_start', () => susp(M.start()));
    def('mic_level', () => py(M.level));
    def('mic_current', () => py(M.state));
    def('mic_was', name => { const r = M.seen.has(js(name)); M.seen.delete(js(name)); return py(r); });
    def('mic_is', name => py(M.state === js(name)));
    def('mic_events', () => { const h = M.history.slice(); M.history.length = 0; M.seen.clear(); return py(h); });
    def('mic_threshold', (name, v) => { M[js(name)] = Math.max(0, Math.min(255, js(v))); return None(); });

    // 무선
    def('radio_on', on => { MB.radio.on = js(on); if (!MB.radio.on) MB.radio.queue = []; MB.emit('radio', { state: MB.radio.on }); return None(); });
    def('radio_config', d => { MB.radio.config(js(d)); return None(); });
    def('radio_reset', () => { MB.radio.reset(); return None(); });
    def('radio_send', (kind, data) => {
      try { MB.radio.send({ kind: js(kind), data: js(data) }); } catch (e) { throw new Sk.builtin.ValueError(e.message); }
      return None();
    });
    def('radio_recv', () => {
      const msg = MB.radio.receive();
      if (!msg) return None();
      return py([msg.kind, msg.data, msg.rssi || -50, msg.time || MB.now()]);
    });

    // 데이터 로그
    const L = MB.datalog;
    def('log_labels', (labels, ts) => { L.setLabels(js(labels), js(ts) === null ? 0 : js(ts)); return None(); });
    def('log_labels_keep', labels => { L.setLabels(js(labels)); return None(); });
    def('log_add', pairs => {
      try { L.add(js(pairs)); } catch (e) { throw new (OSErr())(e.message); }
      return None();
    });
    def('log_delete', full => { L.delete(js(full)); return None(); });
    def('log_mirror', on => { L.mirroring = js(on); return None(); });

    // 파일 시스템
    const fsErr = e => { throw new (OSErr())(e.errno || 5); };
    def('fs_read', n => py(MB.fs.read(js(n))));
    def('fs_write', (n, t) => { try { MB.fs.write(js(n), js(t)); } catch (e) { fsErr(e); } return None(); });
    def('fs_append', (n, t) => { try { MB.fs.append(js(n), js(t)); } catch (e) { fsErr(e); } return None(); });
    def('fs_list', () => py(MB.fs.list()));
    def('fs_remove', n => py(MB.fs.remove(js(n))));
    def('fs_size', n => py(MB.fs.size(js(n))));

    // NeoPixel · UART
    def('neopixel', (pin, pixels) => { MB.emit('neopixel', { pin: js(pin), pixels: js(pixels) }); return None(); });
    // 지니어스 키트: 초음파(echo 펄스) · OLED
    def('pulse_in', (n, level, timeout) => py(MB.kit ? MB.kit.pulseIn(js(n), js(level), js(timeout)) : -1));
    def('oled', (op, args) => {
      if (!MB.oled) return None();
      try { MB.oled.op(js(op), js(args) || []); } catch (e) { throw new Sk.builtin.ValueError(e.message); }
      return None();
    });
    def('uart_write', s => { MB.emit('serial', js(s)); return None(); });
    def('uart_read', () => { const s = RT.serialIn; RT.serialIn = ''; return py(s || null); });
    def('uart_any', () => py(!!RT.serialIn));

    def('reset', () => { throw RESET; });
    const SAD = '0000009090000000999090009'.split('').map(c => +c * 9);
    def('panic', code => {
      MB.emit('serial', 'panic ' + js(code) + '\r\n');
      const p = (async () => {
        for (;;) {
          await D.frames([SAD], 800, false, false);
          await D.scroll(String(js(code)), 120, false, false);
          if (RT.stopFlag) return;
        }
      })();
      return susp(p);
    });
    return m;
  };

  // Skulpt 1.2 버그 회피: import 가 시간 분할(yieldLimit)로 도중에 일시정지되면 이름이 바인딩되지 않음
  // → 모듈을 가져오는 동안에는 시간 분할을 끔
  const origImport = Sk.builtin.__import__;
  Sk.builtin.__import__ = function () {
    const saved = Sk.yieldLimit, keep = Sk.retainGlobals;
    Sk.yieldLimit = Infinity;
    Sk.retainGlobals = false; // REPL 전역 변수가 가져오는 모듈에 섞이지 않게
    try { return origImport.apply(this, arguments); }
    finally { Sk.yieldLimit = saved; Sk.retainGlobals = keep; Sk.lastYield = Date.now(); }
  };

  // ---------- 실행 ----------
  function resetDevice() {
    MB.t0 = performance.now();
    MB.display.reset();
    for (const b of Object.values(MB.buttons)) { b.presses = 0; b.was = false; }
    for (const p of Object.values(MB.pins)) if (p && typeof p === 'object') { p.digitalOut = null; p.analogOut = null; p.pull = 'down'; }
    MB.emit('pinout');
    MB.emit('neopixel', null);
    MB.emit('reset');
    MB.audio.stop(); MB.audio.resetMusic(); MB.audio.setSpeaker(true); MB.audio.setVolume(255);
    MB.mic.resetEvents();
    MB.radio.on = false; MB.radio.reset(); MB.emit('radio', { state: false });
    MB.sensors.history.length = 0; MB.sensors.seen.clear();
    MB.datalog.startProgram();
    RT.serialIn = '';
  }

  RT.resetDevice = resetDevice;

  function formatError(e, file) {
    file = file || 'main.py';
    if (e instanceof Sk.builtin.BaseException) {
      let msg = 'Traceback (most recent call last):\n';
      for (const t of (e.traceback || []).slice().reverse()) {
        if (!t.filename || /src\/lib/.test(t.filename)) continue;
        const ln = '  File "' + file + '", line ' + t.lineno + ', in <module>\n';
        if (!msg.endsWith(ln)) msg += ln;
      }
      const name = e.tp$name || 'Error';
      const a0 = e.args && e.args.v && e.args.v.length ? e.args.v[0] : null;
      const args = a0 === null ? '' : a0 instanceof Sk.builtin.str ? a0.v : Sk.misceval.objectRepr(a0);
      const line = (e.traceback || []).find(t => t.filename && !/src\/lib/.test(t.filename));
      return { text: msg + name + (args ? ': ' + args : ''), short: name + (line ? ' line ' + line.lineno : '') + (args ? ' ' + args : '') };
    }
    const s = String(e && e.message || e);
    return { text: s, short: s };
  }

  // open() 은 micro:bit 파일 시스템(_mbfs)으로
  const openFn = new Sk.builtin.func(function (name, mode) {
    const mod = Sk.misceval.retryOptionalSuspensionOrThrow(Sk.builtin.__import__('_mbfs', {}, {}, [], 0));
    const fn = mod.tp$getattr(new Sk.builtin.str('open'));
    return Sk.misceval.callsimOrSuspendArray(fn, [name, mode === undefined ? new Sk.builtin.str('r') : mode]);
  });

  function configure(retain) {
    Sk.configure({
      output: t => MB.emit('serial', t.replace(/\n/g, '\r\n')),
      read,
      __future__: Sk.python3,
      yieldLimit: 25,
      execLimit: null,
      inputfun: p => window.prompt(p || '') || '',
      inputfunTakesPrompt: true,
      retainglobals: retain,
    });
    Sk.builtins.OSError = OSErr();
    Sk.builtins.open = openFn;
  }

  // 코드 실행 (프로그램 · REPL 공용). 결과: 'ok' | 'stop' | 'reset' | 'error'
  async function execute(code, mode) {
    RT.stopFlag = false;
    abortPromise = new Promise(r => { abortResolve = r; });
    RT.running = true; RT.mode = mode;
    const handlers = { '*': () => { if (RT.stopFlag) throw STOP; } };
    const run = Sk.misceval.asyncToPromise(() => Sk.importMainWithBody(mode === 'repl' ? 'repl' : 'main', false, code, true), handlers);
    RT.current = run;
    try {
      await run;
      return 'ok';
    } catch (e) {
      if (e === RESET) return 'reset';
      if (e === STOP || RT.stopFlag) return 'stop';
      RT.lastError = formatError(e, mode === 'repl' ? '<stdin>' : 'main.py');
      return 'error';
    } finally {
      if (RT.current === run) { RT.running = false; RT.current = null; RT.mode = null; }
    }
  }

  RT.run = async function (code) {
    await RT.stop();
    RT.code = code;
    RT.replGlobals = null; RT.replBuf = [];
    resetDevice();
    MB.audio.ensure();
    if (/\bmicrophone\b/.test(code)) MB.mic.start();
    MB.emit('status', 'running');
    configure(false);
    const r = await execute(code, 'program');
    if (r === 'ok') MB.emit('status', 'done');
    else if (r === 'reset') setTimeout(() => RT.run(code), 50);
    else if (r === 'error') {
      const err = RT.lastError;
      MB.emit('serial', '\r\n' + err.text.replace(/\n/g, '\r\n') + '\r\n');
      MB.emit('status', 'error');
      MB.emit('error', err);
      // 실제 micro:bit 처럼 화면에 오류를 흘려 보여 줌
      MB.display.scroll(err.short, 90, false, false);
    }
  };

  RT.stop = async function () {
    if (!RT.running) return;
    const wasRepl = RT.mode === 'repl';
    RT.stopFlag = true;
    if (abortResolve) abortResolve();
    MB.audio.stop();
    const cur = RT.current;
    if (cur) await Promise.race([cur.catch(() => {}), wait(800)]);
    RT.running = false;
    MB.emit('status', wasRepl ? 'repl' : 'stopped');
  };

  // ---------- REPL ----------
  RT.replGlobals = null;
  RT.replBuf = [];
  RT.prompt = () => (RT.replBuf.length ? '... ' : '>>> ');
  RT.banner = 'MicroPython v1.18 on micro:bit 시뮬레이터 (Skulpt)\r\nType "help()" for more information.\r\n';

  function isExpression(src) {
    try { Sk.compile('_ = (' + src + '\n)', 'repl.py', 'exec', true); return true; } catch (_) { return false; }
  }

  async function replExec(src) {
    configure(true);
    if (!RT.replGlobals) {
      Sk.globals = RT.replGlobals = {};
      await execute('from microbit import *\n', 'repl');
    }
    Sk.globals = RT.replGlobals;
    const code = isExpression(src) ? '_ = (' + src + '\n)\nif _ is not None: print(repr(_))\n' : src + '\n';
    MB.emit('status', 'repl');
    const r = await execute(code, 'repl');
    if (r === 'error') MB.emit('serial', RT.lastError.text.replace(/\n/g, '\r\n') + '\r\n');
    else if (r === 'stop') MB.emit('serial', 'KeyboardInterrupt\r\n');
    else if (r === 'reset') { RT.run(RT.code); return; }
    MB.emit('status', 'repl');
  }

  // 한 줄 입력. 프로그램이 돌고 있으면 먼저 멈춤 (Ctrl+C 와 같음)
  RT.repl = async function (line) {
    if (RT.running && RT.mode === 'repl') return; // 앞 명령이 아직 실행 중
    if (RT.running) { await RT.stop(); MB.emit('serial', 'KeyboardInterrupt\r\n' + RT.banner); }
    MB.emit('serial', RT.prompt() + line + '\r\n');
    if (line.trim() === 'help()') { MB.emit('serial', REPL_HELP); return; }
    let src;
    if (RT.replBuf.length) {
      if (line.trim() !== '') { RT.replBuf.push(line); MB.emit('replprompt', RT.prompt()); return; }
      src = RT.replBuf.join('\n'); RT.replBuf = [];
    } else if (/:\s*(#.*)?$/.test(line)) {
      RT.replBuf.push(line); MB.emit('replprompt', RT.prompt()); return;
    } else src = line;
    MB.emit('replprompt', RT.prompt());
    if (src.trim()) await replExec(src);
  };

  // Ctrl+C: 실행 중인 것을 멈추고 REPL 로
  RT.interrupt = async function () {
    RT.replBuf = [];
    if (RT.running) { await RT.stop(); MB.emit('serial', '\r\nKeyboardInterrupt\r\n'); }
    MB.emit('serial', RT.banner);
    MB.emit('status', 'repl');
    MB.emit('replprompt', RT.prompt());
  };
  // Ctrl+D: 소프트 리셋 (프로그램 다시 실행)
  RT.softReset = function () { MB.emit('serial', 'soft reboot\r\n'); RT.run(RT.code); };

  const REPL_HELP = 'micro:bit 시뮬레이터 REPL — 한 줄씩 입력하면 바로 실행합니다.\r\n' +
    '  from microbit import * 는 이미 되어 있습니다.\r\n' +
    '  display.scroll("Hi"), temperature(), accelerometer.get_x(), 3 * 60 처럼 입력해 보세요.\r\n' +
    '  콜론(:)으로 끝나는 줄은 이어서 입력하고, 빈 줄을 넣으면 실행됩니다.\r\n' +
    '  Ctrl+C: 실행 중인 프로그램 멈추기 · Ctrl+D: 프로그램 다시 시작\r\n';

  RT.sendSerial = function (text) { RT.serialIn = (RT.serialIn || '') + text; };
})();
