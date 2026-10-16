// MakeCode(JavaScript/TypeScript) 실행기
// 코드 → (sucrase: 타입 제거) → (acorn: 구문 트리) → 모든 함수 async + 호출마다 await + 반복문 양보 → (astring) → 실행
// micro:bit API(basic, input, pins, led, music, radio, serial, control, images)와
// 확장(neopixel, OLED(pxt-oled-ssd1306), sonar)을 시뮬레이터 장치에 연결
(function () {
  const CDN = {
    sucrase: 'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm',
    acorn: 'https://cdn.jsdelivr.net/npm/acorn@8.14.0/+esm',
    astring: 'https://cdn.jsdelivr.net/npm/astring@1.9.0/+esm',
  };
  let libs = null;
  async function loadLibs() {
    if (libs) return libs;
    const [s, a, g] = await Promise.all([import(CDN.sucrase), import(CDN.acorn), import(CDN.astring)]);
    libs = { transform: s.transform, parse: a.parse, generate: g.generate };
    return libs;
  }

  // ---------- 코드 변환 ----------
  const ARRAY_CB = new Set(['map', 'filter', 'forEach', 'sort', 'some', 'every', 'find', 'findIndex', 'reduce', 'removeElement']);
  const LOOPS = new Set(['WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement']);
  const FUNCS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

  function yieldStmt() {
    return { type: 'ExpressionStatement', expression: { type: 'AwaitExpression', argument: { type: 'CallExpression', callee: { type: 'Identifier', name: '__y' }, arguments: [], optional: false } } };
  }

  function asyncify(ast) {
    function visit(node, isAsync, syncFns) {
      if (!node || typeof node.type !== 'string') return node;
      if (FUNCS.has(node.type)) {
        const makeSync = syncFns.has(node);
        if (!makeSync) { node.async = true; node.generator = false; }
        if (node.type === 'ArrowFunctionExpression' && node.expression && !makeSync) {
          node.body = visit(node.body, true, syncFns);
          return node;
        }
        node.body = visit(node.body, !makeSync, syncFns);
        return node;
      }
      if (node.type === 'MethodDefinition' && (node.kind === 'constructor' || node.kind === 'get' || node.kind === 'set')) {
        syncFns.add(node.value);
      }
      if (node.type === 'CallExpression') {
        const cal = node.callee;
        if (cal && cal.type === 'MemberExpression' && !cal.computed && cal.property && ARRAY_CB.has(cal.property.name))
          for (const a of node.arguments) if (FUNCS.has(a.type)) syncFns.add(a);
      }
      for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue;
        const v = node[key];
        if (Array.isArray(v)) node[key] = v.map(x => (x && typeof x.type === 'string' ? visit(x, isAsync, syncFns) : x));
        else if (v && typeof v.type === 'string') node[key] = visit(v, isAsync, syncFns);
      }
      if (isAsync && LOOPS.has(node.type)) {
        const body = node.body.type === 'BlockStatement' ? node.body : { type: 'BlockStatement', body: [node.body] };
        body.body.unshift(yieldStmt());
        node.body = body;
      }
      if (isAsync && node.type === 'CallExpression' && node.callee.type !== 'Super') {
        return { type: 'AwaitExpression', argument: node };
      }
      return node;
    }
    return visit(ast, true, new Set());
  }

  async function compile(src) {
    const L = await loadLibs();
    let js;
    try {
      js = L.transform(src, { transforms: ['typescript'], disableESTransforms: true }).code;
    } catch (e) { throw new Error('문법 오류: ' + e.message); }
    let ast;
    try {
      ast = L.parse(js, { ecmaVersion: 2022, sourceType: 'script', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true });
    } catch (e) { throw new Error('문법 오류: ' + e.message); }
    return L.generate(asyncify(ast));
  }

  // ---------- 실행 상태 ----------
  const STOP = { mcStop: true };
  const M = window.MCRT = { running: false, compile };
  let stopped = true, abortResolve = null, abortP = null, subs = [], lastYield = 0, runId = 0;

  const on = (ev, fn) => { MB.on(ev, fn); subs.push([ev, fn]); };
  const sleep = ms => {
    if (stopped) return Promise.reject(STOP);
    return Promise.race([new Promise(r => setTimeout(r, Math.max(0, ms || 0))), abortP]).then(() => { if (stopped) throw STOP; });
  };
  const wrap = p => Promise.race([Promise.resolve(p), abortP]).then(v => { if (stopped) throw STOP; return v; });
  async function __y() {
    if (stopped) throw STOP;
    const now = performance.now();
    if (now - lastYield > 14) { lastYield = now; await sleep(0); }
  }
  function fail(e) {
    if (e === STOP || stopped) return;
    const msg = (e && e.message) || String(e);
    MB.emit('serial', '\r\n[MakeCode 오류] ' + msg + '\r\n');
    MB.emit('status', 'error');
    MB.emit('error', { text: msg, short: msg });
    M.stop(true);
  }
  // 이벤트 처리기 · forever 를 따로 실행 (MakeCode 의 fiber)
  const spawn = fn => { if (stopped) return; Promise.resolve().then(() => fn()).catch(fail); };

  // ---------- 상수 · 열거형 ----------
  const IMG = {
    Heart: '09090:99999:99999:09990:00900', SmallHeart: '00000:09090:09990:00900:00000', Yes: '00000:00009:00090:90900:09000',
    No: '90009:09090:00900:09090:90009', Happy: '00000:09090:00000:90009:09990', Sad: '00000:09090:00000:09990:90009',
    Confused: '00000:09090:00000:09090:90909', Angry: '90009:09090:00000:99999:90909', Asleep: '00000:99099:00000:09990:00000',
    Surprised: '09090:00000:00900:09090:00900', Silly: '90009:00000:99999:00909:00999', Fabulous: '99999:99099:00000:09090:09990',
    Meh: '09090:00000:00090:00900:09000', TShirt: '99099:99999:09990:09990:09990', Rollerskate: '00099:00099:99999:99999:09090',
    Duck: '09900:99900:09999:09990:00000', House: '00900:09990:99999:09990:09090', Tortoise: '00000:09990:99999:09090:00000',
    Butterfly: '99099:99999:00900:99999:99099', StickFigure: '00900:99999:00900:09090:90009', Ghost: '99999:90909:99999:99999:90909',
    Sword: '00900:00900:00900:09990:00900', Giraffe: '99000:09000:09000:09990:09090', Skull: '09990:90909:99999:09990:09990',
    Umbrella: '09990:99999:00900:90900:09900', Snake: '99000:99099:09090:09990:00000', Rabbit: '90900:90900:99990:99090:99990',
    Cow: '90009:90009:99999:09990:00900', QuarterNote: '00900:00900:00900:99900:99900', EigthNote: '00900:00990:00909:99900:99900',
    Pitchfork: '90909:90909:99999:00900:00900', Target: '00900:09990:99099:09990:00900', Triangle: '00000:00900:09090:99999:00000',
    LeftTriangle: '90000:99000:90900:90090:99999', Chessboard: '09090:90909:09090:90909:09090', Diamond: '00900:09090:90009:09090:00900',
    SmallDiamond: '00000:00900:09090:00900:00000', Square: '99999:90009:90009:90009:99999', SmallSquare: '00000:09990:09090:09990:00000',
    Scissors: '99009:99090:00900:99090:99009',
    North: '00900:09990:90909:00900:00900', NorthEast: '00999:00099:00909:09000:90000', East: '00900:00090:99999:00090:00900',
    SouthEast: '90000:09000:00909:00099:00999', South: '00900:00900:90909:09990:00900', SouthWest: '00009:00090:90900:99000:99900',
    West: '00900:09000:99999:09000:00900', NorthWest: '99900:99000:90900:00090:00009',
  };
  const imgLeds = s => s.replace(/:/g, '').split('').map(Number);
  const enumOf = names => Object.fromEntries(names.map(n => [n, n]));
  const IconNames = enumOf(Object.keys(IMG).filter(k => !/^(North|South|East|West)/.test(k)));
  const ArrowNames = enumOf(['North', 'NorthEast', 'East', 'SouthEast', 'South', 'SouthWest', 'West', 'NorthWest']);
  const pinEnum = () => Object.fromEntries(Array.from({ length: 21 }, (_, i) => ['P' + i, i]));
  const NOTE = {};
  ['C', 'CSharp', 'D', 'Eb', 'E', 'F', 'FSharp', 'G', 'GSharp', 'A', 'Bb', 'B'].forEach((n, i) => {
    for (const oct of [3, 4, 5]) {
      const f = Math.round(440 * Math.pow(2, ((oct + 1) * 12 + i - 69) / 12));
      NOTE[n + oct] = f;
      if (oct === 4) NOTE[n] = f;
    }
  });
  NOTE.Db = NOTE.CSharp; NOTE.Gb = NOTE.FSharp; NOTE.Ab = NOTE.GSharp; NOTE.ASharp = NOTE.Bb; NOTE.DSharp = NOTE.Eb;
  const MELODIES = {
    Dadadadum: ['r4:2', 'g', 'g', 'g', 'eb:8', 'r:2', 'f', 'f', 'f', 'd:8'],
    Entertainer: ['d4:1', 'd#', 'e', 'c5:2', 'e4:1', 'c5:2', 'e4:1', 'c5:3', 'c:1', 'd', 'd#', 'e', 'c', 'd', 'e:2', 'b4:1', 'd5:2', 'c:4'],
    Prelude: ['c4:1', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e', 'c4', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e'],
    Ode: ['e4', 'e', 'f', 'g', 'g', 'f', 'e', 'd', 'c', 'c', 'd', 'e', 'e:6', 'd:2', 'd:8'],
    Nyan: ['f#5:2', 'g#', 'c#:1', 'd#:2', 'b4:1', 'd5:1', 'c#', 'b4:2', 'b', 'c#5', 'd', 'd:1', 'c#', 'b4:1'],
    Ringtone: ['c4:1', 'd', 'e:2', 'g', 'd:1', 'e', 'f:2', 'a', 'e:1', 'f', 'g:2', 'b', 'c5:4'],
    Birthday: ['c4:3', 'c:1', 'd:4', 'c:4', 'f', 'e:8', 'c:3', 'c:1', 'd:4', 'c:4', 'g', 'f:8'],
    Wedding: ['c4:4', 'f:3', 'f:1', 'f:8', 'c:4', 'g:3', 'e:1', 'f:8'],
    Funeral: ['c3:4', 'c:3', 'c:1', 'c:4', 'd#:3', 'd:1', 'd:3', 'c:1', 'c:3', 'b2:1', 'c3:4'],
    Punchline: ['c4:3', 'g3:1', 'f#', 'g', 'g#:3', 'g', 'r', 'b', 'c4'],
    Baddy: ['c3:3', 'r', 'd:2', 'd#', 'r', 'c', 'r', 'f#:8'],
    Chase: ['a4:1', 'b', 'c5', 'b4', 'a:2', 'r', 'a:1', 'b', 'c5', 'b4', 'a:2', 'r'],
    BaDing: ['b5:1', 'e6:3'], Wawawawaa: ['e3:3', 'r:1', 'd#:3', 'r:1', 'd:4', 'r:1', 'c#:8'],
    JumpUp: ['c5:1', 'd', 'e', 'f', 'g'], JumpDown: ['g5:1', 'f', 'e', 'd', 'c'],
    PowerUp: ['g4:1', 'c5', 'e', 'g:2', 'e:1', 'g:3'], PowerDown: ['g5:1', 'd#', 'c', 'g4:2', 'b:1', 'c5:3'],
  };
  const GESTURE = { Shake: 'shake', LogoUp: 'up', LogoDown: 'down', ScreenUp: 'face up', ScreenDown: 'face down', TiltLeft: 'left', TiltRight: 'right', FreeFall: 'freefall', ThreeG: '3g', SixG: '6g', EightG: '8g' };
  const NEO = { Red: 0xFF0000, Orange: 0xFFA500, Yellow: 0xFFFF00, Green: 0x00FF00, Blue: 0x0000FF, Indigo: 0x4b0082, Violet: 0x8a2be2, Purple: 0xFF00FF, White: 0xFFFFFF, Black: 0x000000 };

  // ---------- API ----------
  function buildEnv() {
    const D = MB.display, A = MB.audio, S = MB.sensors, K = MB.kit, O = MB.oled;
    const P = n => MB.pins[n];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let tempo = 120;

    const showText = async (s, interval) => {
      s = String(s);
      interval = interval === undefined ? 150 : interval;
      if (s.length === 0) return;
      if (s.length === 1) { D.set(MBFont.glyph(s)); await sleep(interval * 5 > 400 ? 400 : interval * 5); return; }
      await wrap(D.scroll(s, interval, false, false));
    };
    const parseLeds = str => {
      const t = String(str).replace(/[^#.\d*]/g, ' ').trim().split(/\s+/).filter(Boolean).map(c => (c === '#' || c === '*' ? 9 : c === '.' || c === '0' ? 0 : 9));
      while (t.length < 25) t.push(0);
      return t.slice(0, 25);
    };

    const basic = {
      showNumber: (n, interval) => showText(Number.isInteger(n) ? n : Math.round(n * 100) / 100, interval),
      showString: (s, interval) => showText(s, interval),
      showLeds: async (s, interval) => { D.set(parseLeds(s)); await sleep(interval === undefined ? 400 : interval); },
      plotLeds: s => D.set(parseLeds(s)),
      showIcon: async (icon, interval) => { D.set(imgLeds(IMG[icon] || IMG.Heart)); await sleep(interval === undefined ? 600 : interval); },
      showArrow: async (dir, interval) => { const k = typeof dir === 'number' ? Object.keys(ArrowNames)[dir] : dir; D.set(imgLeds(IMG[k] || IMG.North)); await sleep(interval === undefined ? 600 : interval); },
      clearScreen: () => D.clear(),
      pause: ms => sleep(ms),
      forever: h => spawn(async () => { for (;;) { await h(); await sleep(20); } }),
    };
    const led = {
      plot: (x, y) => D.setPixel(x, y, 9), unplot: (x, y) => D.setPixel(x, y, 0),
      toggle: (x, y) => D.setPixel(x, y, D.getPixel(x, y) ? 0 : 9), point: (x, y) => D.getPixel(x, y) > 0,
      plotBrightness: (x, y, b) => D.setPixel(x, y, Math.round(clamp(b, 0, 255) / 255 * 9)),
      pointBrightness: (x, y) => Math.round(D.getPixel(x, y) / 9 * 255),
      plotBarGraph: (v, high) => {
        const n = high > 0 ? clamp(Math.round(Math.abs(v) / high * 25), 0, 25) : 0;
        const leds = new Array(25).fill(0);
        for (let i = 0; i < n; i++) { const row = 4 - Math.floor(i / 5); leds[row * 5 + (i % 5)] = 9; }
        D.set(leds); MB.emit('serial', v + '\r\n');
      },
      setBrightness: () => {}, brightness: () => 255, enable: on => D.setOn(on), stopAnimation: () => D.set(D.leds),
    };
    const images = {
      createImage: s => { const l = parseLeds(s); return { showImage: async (o, iv) => { D.set(l); await sleep(iv === undefined ? 400 : iv); }, plotImage: () => D.set(l), scrollImage: async () => { D.set(l); await sleep(400); }, width: () => 5 }; },
      iconImage: icon => images.createImage(IMG[icon].split(':').map(r => r.split('').map(c => (+c ? '#' : '.')).join(' ')).join('\n')),
      arrowImage: dir => images.iconImage(typeof dir === 'number' ? Object.keys(ArrowNames)[dir] : dir),
    };

    // 버튼: 눌렀다 뗄 때 이벤트 (A+B 는 둘 다 뗄 때)
    const btnHandlers = { a: [], b: [], ab: [] };
    let abPending = false;
    on('input', ({ id, down }) => {
      if (id !== 'a' && id !== 'b') return;
      const B = MB.buttons;
      if (down) { if (B.a.down && B.b.down) abPending = true; return; }
      if (abPending) { if (!B.a.down && !B.b.down) { abPending = false; btnHandlers.ab.forEach(spawn); } return; }
      btnHandlers[id].forEach(spawn);
    });
    const touchHandlers = { pin0: [], pin1: [], pin2: [], logo: [] };
    on('input', ({ id, down }) => { if (!down && touchHandlers[id]) touchHandlers[id].forEach(spawn); });
    const gestureHandlers = {};
    on('gesture', g => (gestureHandlers[g] || []).forEach(spawn));

    const input = {
      onButtonPressed: (b, h) => btnHandlers[b].push(h),
      buttonIsPressed: b => (b === 'ab' ? MB.buttons.a.down && MB.buttons.b.down : MB.buttons[b].down),
      onGesture: (g, h) => (gestureHandlers[g] = gestureHandlers[g] || []).push(h),
      isGesture: g => S.gesture === g,
      onPinPressed: (p, h) => touchHandlers['pin' + p].push(h),
      onPinReleased: (p, h) => touchHandlers['pin' + p].push(h),
      pinIsPressed: p => MB.pins[p].touch,
      onLogoEvent: (e, h) => touchHandlers.logo.push(h),
      logoIsPressed: () => MB.buttons.logo.down,
      acceleration: d => { const v = S.values(); return d === 'x' ? v[0] : d === 'y' ? v[1] : d === 'z' ? v[2] : Math.round(Math.hypot(v[0], v[1], v[2])); },
      rotation: r => Math.round(r === 'pitch' ? -S.pitch : S.roll),
      compassHeading: () => Math.round(((S.heading % 360) + 360) % 360),
      magneticForce: d => { const v = S.magnetic(); return (d === 'x' ? v[0] : d === 'y' ? v[1] : d === 'z' ? v[2] : Math.hypot(...v)) / 1000; },
      temperature: () => Math.round(MB.temperature),
      lightLevel: () => Math.round(MB.light),
      soundLevel: () => Math.round(MB.mic.level || 0),
      runningTime: () => MB.now(), runningTimeMicros: () => Math.floor((performance.now() - MB.t0) * 1000),
      calibrateCompass: () => S.setCalibrated(true), setAccelerometerRange: () => {},
    };

    const emitPin = n => MB.emit('pinout', n);
    const pins = {
      digitalReadPin: n => {
        const p = P(n);
        if (p.analogIn !== null) return p.analogIn > 511 ? 1 : 0;
        if (p.touch) return p.pull === 'up' ? 0 : 1;
        if (p.digitalOut !== null) return p.digitalOut;
        return p.pull === 'up' ? 1 : 0;
      },
      digitalWritePin: (n, v) => { const p = P(n); p.digitalOut = v ? 1 : 0; p.analogOut = null; p.servo = null; emitPin(n); },
      analogReadPin: n => {
        const p = P(n);
        if (p.analogIn !== null) return Math.round(p.analogIn);
        if (p.touch) return 1023;
        return p.analogOut !== null ? p.analogOut : (p.digitalOut ? 1023 : 0);
      },
      analogWritePin: (n, v) => { const p = P(n); p.analogOut = clamp(Math.round(v), 0, 1023); p.digitalOut = null; p.servo = null; emitPin(n); },
      analogSetPeriod: (n, us) => { P(n).period = us / 1000; },
      servoWritePin: (n, a) => { const p = P(n); p.servo = clamp(Math.round(a), 0, 180); p.analogOut = Math.round((0.5 + p.servo / 180 * 2) / 20 * 1023); p.digitalOut = null; emitPin(n); },
      servoSetPulse: (n, us) => pins.servoWritePin(n, (us - 500) / 2000 * 180),
      setPull: (n, pull) => { P(n).pull = pull; },
      pulseIn: (n, v) => { const r = K.pulseIn(n, v); return r < 0 ? 0 : r; },
      map: (v, a, b, c, d) => c + (v - a) * (d - c) / (b - a),
      setAudioPin: () => {}, onPulsed: () => {}, setEvents: () => {},
    };

    // 소리
    const noteFreq = tok => {
      const m = /^([A-Ga-g])(#|b)?(\d)?$/.exec(tok);
      if (!m) return 0;
      const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      const oct = m[3] ? +m[3] : 4;
      return 440 * Math.pow(2, ((oct + 1) * 12 + semi - 69) / 12);
    };
    const playString = async (str, bpm) => {
      const beat = 60000 / (bpm || tempo);
      for (const tok of String(str).trim().split(/\s+/)) {
        if (!tok) continue;
        if (tok === '-' || tok === 'R' || tok === 'r') { await sleep(beat); continue; }
        await wrap(A.tone(noteFreq(tok), beat * 0.95)); await sleep(beat * 0.05);
      }
    };
    const playable = p => {
      if (p.kind === 'tone') return wrap(A.tone(p.f, p.ms));
      if (p.kind === 'str') return playString(p.s, p.bpm);
      if (p.kind === 'mel') return wrap(A.playNotes(p.notes, false));
      return Promise.resolve();
    };
    const music = {
      playTone: (f, ms) => wrap(A.tone(f, ms)),
      ringTone: f => { A.tone(f, -1); },
      rest: ms => { A.stop(); return sleep(ms); },
      beat: frac => Math.round(60000 / tempo * (frac === undefined ? 1 : frac)),
      setTempo: b => { tempo = b; A.music.bpm = b; }, changeTempoBy: d => { tempo += d; A.music.bpm = tempo; }, tempo: () => tempo,
      setVolume: v => A.setVolume(v), volume: () => MB.volume,
      stopAllSounds: () => A.stop(), stopMelody: () => A.stop(),
      builtInMelody: m => MELODIES[m] || MELODIES.Dadadadum,
      startMelody: (notes, opt) => { A.playNotes(notes, opt === 'Forever' || opt === 'ForeverInBackground'); },
      beginMelody: (notes, opt) => { A.playNotes(notes, opt === 'Forever' || opt === 'ForeverInBackground'); },
      playMelody: (s, bpm) => playString(s, bpm),
      tonePlayable: (f, ms) => ({ kind: 'tone', f, ms }),
      stringPlayable: (s, bpm) => ({ kind: 'str', s, bpm }),
      builtinPlayable: m => ({ kind: 'mel', notes: MELODIES[m] || MELODIES.Dadadadum }),
      play: (p, mode) => { if (mode === 'UntilDone' || mode === undefined) return playable(p); playable(p).catch(() => {}); },
      PlaybackMode: enumOf(['UntilDone', 'InBackground', 'LoopingInBackground']),
      noteFrequency: n => n,
      setBuiltInSpeakerEnabled: on => A.setSpeaker(on),
    };

    // 무선
    const R = MB.radio;
    const radioOn = () => { if (!R.on) { R.on = true; MB.emit('radio', { state: true }); } };
    const rx = { number: [], string: [], value: [] };
    let lastPacket = { signal: -60, time: 0, serial: 0 };
    on('radio', e => {
      if (!e || e.dir !== 'rx') return;
      const msg = R.receive();
      if (!msg || msg.kind !== 'str') return;
      let o;
      try { o = JSON.parse(msg.data); } catch (_) { o = { t: 's', v: msg.data }; }
      lastPacket = { signal: msg.rssi || -60, time: msg.time || MB.now(), serial: 0 };
      if (o.t === 'n') rx.number.forEach(h => spawn(() => h(o.v)));
      else if (o.t === 'kv') rx.value.forEach(h => spawn(() => h(o.k, o.v)));
      else rx.string.forEach(h => spawn(() => h(String(o.v))));
    });
    const send = o => { radioOn(); R.send({ kind: 'str', data: JSON.stringify(o) }); };
    const radio = {
      setGroup: g => { radioOn(); R.config({ group: g }); },
      sendNumber: n => send({ t: 'n', v: n }), sendString: s => send({ t: 's', v: String(s) }), sendValue: (k, v) => send({ t: 'kv', k, v }),
      onReceivedNumber: h => { radioOn(); rx.number.push(h); }, onReceivedString: h => { radioOn(); rx.string.push(h); }, onReceivedValue: h => { radioOn(); rx.value.push(h); },
      receivedPacket: k => (k === 'SignalStrength' ? lastPacket.signal : k === 'Time' ? lastPacket.time : 0),
      setTransmitPower: () => {}, setTransmitSerialNumber: () => {}, setFrequencyBand: () => {},
    };

    const serial = {
      writeLine: s => MB.emit('serial', String(s) + '\r\n'), writeString: s => MB.emit('serial', String(s)),
      writeNumber: n => MB.emit('serial', String(n)), writeValue: (k, v) => MB.emit('serial', `${k}:${v}\r\n`),
      writeNumbers: a => MB.emit('serial', a.join(',') + '\r\n'),
      readLine: () => { const s = MB.runtime.serialIn || ''; MB.runtime.serialIn = ''; return s.replace(/\r?\n$/, ''); },
      readString: () => { const s = MB.runtime.serialIn || ''; MB.runtime.serialIn = ''; return s; },
      redirectToUSB: () => {}, redirect: () => {}, setBaudRate: () => {}, onDataReceived: () => {},
    };

    const events = {};
    const control = {
      inBackground: h => spawn(h), waitMicros: us => sleep(us / 1000), millis: () => MB.now(), micros: () => input.runningTimeMicros(),
      reset: () => { setTimeout(() => M.run(M.code), 50); M.stop(); throw STOP; },
      deviceName: () => 'zapuz', deviceSerialNumber: () => 12345678,
      onEvent: (src, val, h) => (events[src + ':' + val] = events[src + ':' + val] || []).push(h),
      raiseEvent: (src, val) => (events[src + ':' + val] || []).forEach(spawn),
      waitForEvent: () => sleep(10),
    };

    // NeoPixel (pxt-neopixel)
    const unpack = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    function makeStrip(pin, n, buf, start) {
      const st = { pin, n, buf, start, bright: 255 };
      const flush = () => {
        const sc = st.bright / 255;
        MB.emit('neopixel', { pin, pixels: st.root.buf.map(c => unpack(c).map(v => Math.round(v * sc))) });
      };
      st.root = st;
      Object.assign(st, {
        show: () => flush(),
        clear: () => { for (let i = 0; i < n; i++) st.root.buf[start + i] = 0; },
        showColor: c => { for (let i = 0; i < n; i++) st.root.buf[start + i] = c; flush(); },
        setPixelColor: (i, c) => { if (i >= 0 && i < n) st.root.buf[start + i] = c; },
        showRainbow: (h1, h2) => {
          h1 = h1 === undefined ? 1 : h1; h2 = h2 === undefined ? 360 : h2;
          for (let i = 0; i < n; i++) st.root.buf[start + i] = neopixel.hsl(Math.round(h1 + (h2 - h1) * i / n), 99, 50);
          flush();
        },
        showBarGraph: (v, high) => {
          const k = high > 0 ? Math.round(clamp(v / high, 0, 1) * n) : 0;
          for (let i = 0; i < n; i++) st.root.buf[start + i] = i < k ? neopixel.hsl(Math.round(120 - 120 * i / n), 99, 50) : 0;
          flush();
        },
        rotate: (o) => { o = o === undefined ? 1 : o; const s = st.root.buf.slice(start, start + n); for (let i = 0; i < n; i++) st.root.buf[start + ((i + o) % n + n) % n] = s[i]; },
        shift: (o) => { o = o === undefined ? 1 : o; const s = st.root.buf.slice(start, start + n); for (let i = 0; i < n; i++) { const j = i - o; st.root.buf[start + i] = j >= 0 && j < n ? s[j] : 0; } },
        setBrightness: b => { st.root.bright = clamp(b, 0, 255); },
        easeBrightness: () => {}, setPixelWhiteLED: () => {}, setMatrixWidth: () => {},
        length: () => n, power: () => 0,
        range: (s, len) => { const r = makeStrip(pin, Math.min(len, n - s), st.root.buf, start + s); r.root = st.root; return r; },
      });
      return st;
    }
    const neopixel = {
      create: (pin, n) => makeStrip(pin, n, new Array(n).fill(0), 0),
      colors: c => (typeof c === 'number' ? c : NEO[c] || 0),
      rgb: (r, g, b) => ((clamp(r, 0, 255) & 255) << 16) | ((clamp(g, 0, 255) & 255) << 8) | (clamp(b, 0, 255) & 255),
      hsl: (h, s, l) => {
        h = ((h % 360) + 360) % 360; s = clamp(s, 0, 99) / 100; l = clamp(l, 0, 99) / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return neopixel.rgb(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
      },
    };

    // OLED (pxt-oled-ssd1306)
    const OLED = {
      init: () => { O.clearBuf(); O.show(); },
      clear: () => { O.clearBuf(); O.show(); },
      writeString: s => O.mcWrite(s, false), writeNum: n => O.mcWrite(String(n), false),
      writeStringNewLine: s => O.mcWrite(s, true), writeNumNewLine: n => O.mcWrite(String(n), true),
      newLine: () => { O.mcNewLine(); O.show(); },
      drawLine: (x0, y0, x1, y1) => { O.line(x0, y0, x1, y1, 1); O.show(); },
      drawRectangle: (x0, y0, x1, y1) => { O.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1, 1, false); O.show(); },
      drawLoading: pct => { O.clearBuf(); O.rect(4, 24, 120, 16, 1, false); O.rect(6, 26, Math.round(116 * clamp(pct, 0, 100) / 100), 12, 1, true); O.show(); },
      writeNumNoSpace: n => O.mcWrite(String(n), false),
      drawCircle: (x, y, r) => { for (let a = 0; a < 360; a += 3) O.px(Math.round(x + r * Math.cos(a * Math.PI / 180)), Math.round(y + r * Math.sin(a * Math.PI / 180)), 1); O.show(); },
      drawFilledCircle: (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) O.px(x + i, y + j, 1); O.show(); },
    };

    const sonar = { ping: (trig, echo, unit) => { const cm = K.sonarCm(trig, echo); if (unit === 'Inches') return Math.round(cm / 2.54); if (unit === 'MicroSeconds') return Math.round(cm * 58); return Math.round(cm); } };

    const MathX = Object.create(Math);
    Object.assign(MathX, {
      randomRange: (a, b) => Math.floor(Math.random() * (b - a + 1)) + Math.min(a, b),
      idiv: (a, b) => (a / b) | 0, imul: Math.imul, constrain: clamp,
      map: (v, a, b, c, d) => c + (v - a) * (d - c) / (b - a), randomBoolean: () => Math.random() < 0.5,
    });

    return {
      __y, basic, led, images, input, pins, music, radio, serial, control, neopixel, OLED, sonar, game: {}, Math: MathX,
      randint: (a, b) => Math.floor(Math.random() * (b - a + 1)) + Math.min(a, b),
      convertToText: v => String(v), parseInt, parseFloat,
      Button: { A: 'a', B: 'b', AB: 'ab' }, Gesture: GESTURE, Dimension: { X: 'x', Y: 'y', Z: 'z', Strength: 's' },
      Rotation: { Pitch: 'pitch', Roll: 'roll' }, TouchPin: { P0: 0, P1: 1, P2: 2 }, TouchButtonEvent: enumOf(['Pressed', 'Touched', 'Released', 'LongPressed']),
      ButtonEvent: enumOf(['Click', 'Down', 'Up']),
      DigitalPin: pinEnum(), AnalogPin: pinEnum(), PinPullMode: { PullUp: 'up', PullDown: 'down', PullNone: 'none' },
      PulseValue: { High: 1, Low: 0 }, PinEventType: enumOf(['Edge', 'Pulse', 'Touch', 'None']),
      IconNames, ArrowNames, Note: NOTE, Melodies: enumOf(Object.keys(MELODIES)),
      MelodyOptions: enumOf(['Once', 'Forever', 'OnceInBackground', 'ForeverInBackground']),
      MelodyStopOptions: enumOf(['All', 'Background', 'Foreground']),
      BeatFraction: { Whole: 1, Half: 0.5, Quarter: 0.25, Eighth: 0.125, Sixteenth: 0.0625, Double: 2, Breve: 4 },
      NeoPixelMode: enumOf(['RGB', 'RGBW', 'RGB_RGB']), NeoPixelColors: NEO,
      PingUnit: enumOf(['Centimeters', 'Inches', 'MicroSeconds']),
      RadioPacketProperty: enumOf(['SignalStrength', 'Time', 'SerialNumber']),
      SerialPin: pinEnum(), BaudRate: { BaudRate115200: 115200, BaudRate9600: 9600 },
      Delimiters: { NewLine: '\n', Comma: ',', Dollar: '$', Colon: ':', Fullstop: '.', Hash: '#' },
      TemperatureUnit: enumOf(['Celsius', 'Fahrenheit']), DetectedSound: enumOf(['Loud', 'Quiet']),
      EventBusSource: {}, EventBusValue: {},
    };
  }

  // ---------- 실행 / 정지 ----------
  M.run = async function (code) {
    await M.stop(true);
    if (MB.runtime.running) await MB.runtime.stop();
    const id = ++runId;
    M.code = code;
    let js;
    try { js = await compile(code); } catch (e) {
      MB.emit('serial', '\r\n[MakeCode] ' + e.message + '\r\n');
      MB.emit('status', 'error'); MB.emit('error', { text: e.message, short: e.message });
      return;
    }
    if (id !== runId) return;
    MB.runtime.resetDevice();
    MB.audio.ensure();
    if (/soundLevel/.test(code)) MB.mic.start();
    stopped = false; M.running = true;
    abortP = new Promise(r => { abortResolve = r; });
    lastYield = performance.now();
    MB.emit('status', 'running');
    const env = buildEnv();
    let fn;
    try {
      fn = new Function('__env', 'with (__env) { return (async () => {\n' + js + '\n})(); }');
    } catch (e) { fail(new Error('변환 오류: ' + e.message)); return; }
    try {
      await fn(env);
    } catch (e) { fail(e); }
  };

  M.stop = async function (silent) {
    const was = !stopped;
    stopped = true; M.running = false;
    if (abortResolve) abortResolve();
    for (const [ev, fn] of subs) MB.off(ev, fn);
    subs = [];
    if (was) { MB.audio.stop(); MB.display.reset && MB.display.set(MB.display.leds); if (!silent) MB.emit('status', 'stopped'); }
  };
})();
