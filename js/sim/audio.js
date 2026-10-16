// 스피커(음악 · 효과음 · 음성)와 마이크 — 스마트폰/PC 의 오디오 장치 사용
(function () {
  const A = MB.audio = { ctx: null, master: null, nodes: [], timer: null, resolve: null, playing: false };

  A.ensure = function () {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      A.ctx = new C();
      A.master = A.ctx.createGain();
      A.master.connect(A.ctx.destination);
      A.setVolume(MB.volume);
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };

  A.setVolume = function (v) {
    MB.volume = Math.max(0, Math.min(255, v | 0));
    if (A.master) A.master.gain.value = MB.speakerOn ? (MB.volume / 255) * 0.22 : 0;
  };
  A.setSpeaker = function (on) { MB.speakerOn = on; A.setVolume(MB.volume); };

  function setPlaying(p) { if (A.playing !== p) { A.playing = p; MB.emit('sound', p); } }

  // 현재 소리를 멈추고 대기 중인 Promise 를 끝냄
  A.stop = function () {
    for (const n of A.nodes) { try { n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} }
    A.nodes = [];
    clearTimeout(A.timer);
    const r = A.resolve; A.resolve = null;
    setPlaying(false);
    if (r) r();
  };

  let noiseBuf = null;
  function source(wave) {
    const ctx = A.ctx;
    if (wave === 'noise') {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      s.frequency = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
      return s;
    }
    const o = ctx.createOscillator();
    o.type = wave || 'square';
    return o;
  }

  // segs: [{f0, f1, ms, wave, v0, v1}] 를 순서대로 재생
  function schedule(segs, startAt) {
    const ctx = A.ctx;
    let t = startAt;
    for (const s of segs) {
      const dur = Math.max(0.005, s.ms / 1000);
      if (s.f0 > 0) {
        const o = source(s.wave);
        const g = ctx.createGain();
        const v0 = s.v0 == null ? 1 : s.v0, v1 = s.v1 == null ? v0 : s.v1;
        o.frequency.setValueAtTime(s.f0, t);
        if (s.f1 && s.f1 !== s.f0) {
          if (s.log) o.frequency.exponentialRampToValueAtTime(Math.max(1, s.f1), t + dur);
          else o.frequency.linearRampToValueAtTime(s.f1, t + dur);
        }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v0, t + 0.004);
        g.gain.linearRampToValueAtTime(v1, t + Math.max(0.005, dur - 0.006));
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(A.master);
        o.start(t); o.stop(t + dur + 0.01);
        A.nodes.push(o);
      }
      t += dur;
    }
    return t - startAt;
  }

  // 구간 목록 재생. loop 이면 계속 반복, Promise 는 끝나거나 중단될 때 완료
  A.playSegs = function (segs, loop) {
    A.stop();
    if (!A.ensure()) return Promise.resolve();
    setPlaying(true);
    return new Promise(resolve => {
      A.resolve = resolve;
      const run = () => {
        A.nodes = [];
        const len = schedule(segs, A.ctx.currentTime + 0.02);
        A.timer = setTimeout(() => {
          if (loop) run();
          else { A.nodes = []; A.resolve = null; setPlaying(false); resolve(); }
        }, len * 1000 + 25);
      };
      run();
    });
  };

  A.tone = function (freq, ms) {
    if (ms < 0) return A.playSegs([{ f0: freq, ms: 3600 * 1000 }], false);
    return A.playSegs([{ f0: freq, ms }], false);
  };

  // ---------- music ----------
  const music = A.music = { bpm: 120, ticks: 4, octave: 4, duration: 4 };
  const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  A.parseNote = function (note) {
    const m = /^([a-gr])(#|b)?(-?\d)?(?::(\d+))?$/i.exec(String(note).trim());
    if (!m) throw new Error('잘못된 음표: ' + note);
    if (m[3] !== undefined) music.octave = +m[3];
    if (m[4] !== undefined) music.duration = +m[4];
    const ms = music.duration * 60000 / music.bpm / music.ticks;
    const n = m[1].toLowerCase();
    if (n === 'r') return { f0: 0, ms };
    let semi = SEMI[n] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const midi = (music.octave + 1) * 12 + semi;
    return { f0: 440 * Math.pow(2, (midi - 69) / 12), ms: ms * 0.97, gap: ms * 0.03 };
  };
  A.playNotes = function (notes, loop) {
    const segs = [];
    for (const n of notes) {
      const s = A.parseNote(n);
      segs.push(s);
      if (s.gap) segs.push({ f0: 0, ms: s.gap });
    }
    return A.playSegs(segs, loop);
  };
  A.resetMusic = function () { Object.assign(music, { bpm: 120, ticks: 4, octave: 4, duration: 4 }); };

  // ---------- 내장 효과음 (micro:bit V2 Sound.*) ----------
  const r = (f0, f1, ms, wave, v0, v1) => ({ f0, f1, ms, wave: wave || 'square', v0, v1 });
  const rep = (arr, n) => Array.from({ length: n }, () => arr).flat();
  A.SOUNDS = {
    giggle: rep([r(700, 1100, 70, 'triangle'), r(1100, 650, 70, 'triangle')], 4),
    happy: [r(420, 760, 140, 'triangle'), r(760, 1200, 200, 'triangle', 1, 0.2)],
    hello: [r(320, 720, 160, 'triangle'), r(720, 520, 110, 'triangle'), r(520, 980, 240, 'triangle', 1, 0.1)],
    mysterious: [r(300, 520, 450, 'sine'), r(520, 340, 650, 'sine', 1, 0)],
    sad: [r(620, 420, 320, 'triangle'), r(420, 230, 600, 'triangle', 1, 0)],
    slide: [r(300, 1300, 600, 'sawtooth', 0.7, 0.2)],
    soaring: [r(380, 1700, 1100, 'sine', 0.3, 1)],
    spring: [r(220, 950, 110), r(950, 300, 110), r(300, 900, 110), r(900, 380, 160, 'square', 1, 0)],
    twinkle: rep([r(1500, 1850, 70, 'sine'), r(1850, 1400, 70, 'sine')], 5),
    yawn: [r(760, 300, 1100, 'sine', 1, 0)],
  };

  const WAVES = ['sine', 'sawtooth', 'triangle', 'square', 'noise'];
  // SoundEffect(freq_start, freq_end, duration, vol_start, vol_end, waveform, fx, shape)
  A.effectSegs = function (e) {
    const seg = r(e.freq_start, e.freq_end, e.duration, WAVES[e.waveform] || 'square', e.vol_start / 255, e.vol_end / 255);
    seg.log = e.shape === 18;
    if (e.fx === 1 || e.fx === 2 || e.fx === 3) {
      // 비브라토/트레몰로/워블: 짧은 조각으로 흔들기
      const n = Math.max(2, Math.round(e.duration / 40)), out = [];
      for (let i = 0; i < n; i++) {
        const k = i / n, k2 = (i + 1) / n;
        const f = x => e.freq_start + (e.freq_end - e.freq_start) * x;
        const wob = (i % 2 ? 1 : -1) * (e.fx === 3 ? 0.08 : 0.03);
        const v = x => (e.vol_start + (e.vol_end - e.vol_start) * x) / 255;
        out.push(r(f(k) * (1 + (e.fx !== 2 ? wob : 0)), f(k2) * (1 + (e.fx !== 2 ? wob : 0)), e.duration / n, seg.wave,
          v(k) * (e.fx === 2 && i % 2 ? 0.4 : 1), v(k2) * (e.fx === 2 && i % 2 ? 0.4 : 1)));
      }
      return out;
    }
    return [seg];
  };

  // ---------- speech ----------
  A.say = function (text, opts) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = /[가-힣]/.test(text) ? 'ko-KR' : 'en-US';
      if (opts && opts.speed) u.rate = Math.max(0.3, Math.min(3, opts.speed / 72));
      if (opts && opts.pitch) u.pitch = Math.max(0, Math.min(2, opts.pitch / 64));
      u.volume = MB.speakerOn ? MB.volume / 255 : 0;
      u.onend = u.onerror = () => { setPlaying(false); resolve(); };
      setPlaying(true);
      speechSynthesis.speak(u);
    });
  };

  // ---------- 마이크 ----------
  const M = MB.mic = {
    on: false, level: 0, state: null, seen: new Set(), history: [],
    loud: 150, quiet: 64, stream: null, analyser: null, starting: null,
  };
  M.start = function () {
    if (M.on) return Promise.resolve(true);
    if (M.starting) return M.starting;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
    M.starting = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then(stream => {
        const ctx = A.ensure();
        M.stream = stream;
        const src = ctx.createMediaStreamSource(stream);
        M.analyser = ctx.createAnalyser();
        M.analyser.fftSize = 1024;
        src.connect(M.analyser);
        const buf = new Float32Array(M.analyser.fftSize);
        M.on = true; MB.emit('mic', true);
        M.timer = setInterval(() => {
          M.analyser.getFloatTimeDomainData(buf);
          let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
          const rms = Math.sqrt(s / buf.length);
          const db = 20 * Math.log10(rms + 1e-8);            // 약 -70 ~ 0 dB
          const lvl = Math.max(0, Math.min(255, Math.round((db + 62) / 55 * 255)));
          M.level = Math.round(M.level * 0.4 + lvl * 0.6);
          if (M.level >= M.loud && M.state !== 'loud') M.fire('loud');
          else if (M.level <= M.quiet && M.state !== 'quiet') M.fire('quiet');
          MB.emit('miclevel', M.level);
        }, 40);
        return true;
      })
      .catch(() => false)
      .finally(() => { M.starting = null; });
    return M.starting;
  };
  M.fire = function (ev) {
    M.state = ev; M.seen.add(ev); M.history.push(ev);
    if (M.history.length > 8) M.history.shift();
  };
  M.stop = function () {
    if (!M.on) return;
    clearInterval(M.timer);
    M.stream.getTracks().forEach(t => t.stop());
    M.on = false; M.level = 0; MB.emit('mic', false);
  };
  M.resetEvents = function () { M.state = null; M.seen.clear(); M.history.length = 0; };
})();
