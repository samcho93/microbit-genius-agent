// 가속도 · 지자기(나침반) · 제스처 — 스마트폰 센서 또는 수동 조정
(function () {
  const G = 1024; // 1g = 1024 mg
  const S = MB.sensors = {
    live: false,          // 스마트폰 센서 사용 중
    pitch: 0, roll: 0,    // 수동 기울기(도): pitch>0 = 로고가 위로, roll>0 = 오른쪽이 아래로
    faceDown: false,
    heading: 0,           // 0 = 로고 방향이 북쪽
    acc: { x: 0, y: 0, z: -G },
    linear: 0,            // 중력 제외 가속도 크기 (m/s²)
    shakeUntil: 0,
    gesture: 'face up',
    history: [],
    seen: new Set(),
    calibrated: false,
    hasCompass: false,
  };
  try { S.calibrated = localStorage.getItem('mbsim.compassCal') === '1'; } catch (_) {}

  const rad = d => d * Math.PI / 180;

  // 기울기(beta, gamma) → micro:bit 가속도(mg). 축: x 오른쪽, y 로고 쪽, z 화면 밖 (중력 방향 값)
  function tiltToAcc(beta, gamma) {
    const b = rad(beta), g = rad(gamma);
    return {
      x: G * Math.sin(g) * Math.cos(b),
      y: -G * Math.sin(b),
      z: -G * Math.cos(g) * Math.cos(b),
    };
  }

  function updateManual() {
    if (S.live) return;
    const a = tiltToAcc(S.pitch, S.roll);
    if (S.faceDown) { a.x = -a.x; a.z = -a.z; }
    S.acc = a;
    MB.emit('sensors');
  }
  S.setManual = function (o) { Object.assign(S, o); updateManual(); };

  // 현재 자세 판정
  function posture() {
    const { x, y, z } = S.acc;
    const mag = Math.sqrt(x * x + y * y + z * z);
    if (performance.now() < S.shakeUntil) return 'shake';
    if (mag < 400) return 'freefall';
    if (mag > 8 * G) return '8g';
    if (mag > 6 * G) return '6g';
    if (mag > 3 * G) return '3g';
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    if (az >= ax && az >= ay && az > 600) return z < 0 ? 'face up' : 'face down';
    if (ax >= ay) return x < 0 ? 'left' : 'right';
    return y < 0 ? 'up' : 'down';
  }

  setInterval(() => {
    const g = posture();
    if (g !== S.gesture) {
      S.gesture = g;
      S.history.push(g);
      if (S.history.length > 8) S.history.shift();
      S.seen.add(g);
      MB.emit('gesture', g);
    }
  }, 30);

  S.values = function () {
    let { x, y, z } = S.acc;
    if (performance.now() < S.shakeUntil) {
      x += (Math.random() - 0.5) * 3000; y += (Math.random() - 0.5) * 3000; z += (Math.random() - 0.5) * 1500;
    }
    const c = v => Math.max(-2048, Math.min(2047, Math.round(v)));
    return [c(x), c(y), c(z)];
  };

  S.shake = function (ms) {
    S.shakeUntil = performance.now() + (ms || 700);
    MB.emit('sensors');
  };

  S.wasGesture = function (name) { const r = S.seen.has(name); S.seen.delete(name); return r; };
  S.getGestures = function () { const h = S.history.slice(); S.history.length = 0; S.seen.clear(); return h; };

  // 지자기: 한국 부근 수평 30µT, 수직(아래) 40µT 를 기기 좌표로 변환 (nT)
  S.magnetic = function () {
    const H = 30000, V = 40000;
    const h = rad(S.heading);
    // 수평 자세 기준 벡터 (x 오른쪽, y 로고 쪽, z 화면 밖)
    const v = [-H * Math.sin(h), H * Math.cos(h), -V];
    let b = rad(S.pitch), g = rad(S.roll);
    // Rx(beta)^T 후 Ry(gamma)^T
    const y1 = v[1] * Math.cos(b) + v[2] * Math.sin(b);
    const z1 = -v[1] * Math.sin(b) + v[2] * Math.cos(b);
    const x1 = v[0];
    const x2 = x1 * Math.cos(g) - z1 * Math.sin(g);
    const z2 = x1 * Math.sin(g) + z1 * Math.cos(g);
    return [Math.round(x2), Math.round(y1), Math.round(z2)];
  };

  // ---------- 스마트폰 센서 ----------
  let lastShakeA = 0;
  function onOrientation(e) {
    if (e.beta == null) return;
    S.pitch = e.beta; S.roll = e.gamma;
    const a = tiltToAcc(e.beta, e.gamma);
    S.acc = { x: a.x, y: a.y, z: a.z };
    if (typeof e.webkitCompassHeading === 'number') {
      S.heading = e.webkitCompassHeading; S.hasCompass = true;
    } else if (e.absolute && e.alpha != null) {
      S.heading = (360 - e.alpha) % 360; S.hasCompass = true;
    }
    MB.emit('sensors');
  }
  function onMotion(e) {
    const a = e.acceleration;
    let lin = 0;
    if (a && a.x != null) lin = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    else if (e.accelerationIncludingGravity) {
      const g = e.accelerationIncludingGravity;
      lin = Math.abs(Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z) - 9.81);
    }
    S.linear = lin;
    if (lin > 13 && performance.now() - lastShakeA > 80) { lastShakeA = performance.now(); S.shakeUntil = performance.now() + 500; }
    const gi = e.accelerationIncludingGravity;
    if (gi && gi.x != null) {
      const total = Math.sqrt(gi.x * gi.x + gi.y * gi.y + gi.z * gi.z) / 9.81;
      // 자유낙하 / 큰 충격: 크기만 반영
      if (total < 0.35 || total > 2.8) {
        const k = total / Math.max(0.001, Math.sqrt(S.acc.x ** 2 + S.acc.y ** 2 + S.acc.z ** 2) / G);
        S.acc = { x: S.acc.x * k, y: S.acc.y * k, z: S.acc.z * k };
      }
    }
  }

  S.enablePhone = async function () {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') throw new Error('센서 권한이 거부되었습니다.');
      }
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try { await DeviceMotionEvent.requestPermission(); } catch (_) {}
      }
    } catch (e) { throw e; }
    if (!('DeviceOrientationEvent' in window)) throw new Error('이 기기는 방향 센서를 지원하지 않습니다.');
    S.live = true;
    window.addEventListener('deviceorientation', onOrientation);
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrientation);
    window.addEventListener('devicemotion', onMotion);
    // 데스크톱처럼 이벤트가 오지 않으면 일정 시간 후 알림
    return new Promise(resolve => {
      let got = false;
      const chk = () => { got = true; window.removeEventListener('deviceorientation', chk); };
      window.addEventListener('deviceorientation', chk);
      setTimeout(() => {
        if (!got) S.disablePhone();
        resolve(got);
      }, 1500);
    });
  };

  S.disablePhone = function () {
    S.live = false;
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('deviceorientationabsolute', onOrientation);
    window.removeEventListener('devicemotion', onMotion);
    updateManual();
  };

  S.setCalibrated = function (v) {
    S.calibrated = v;
    try { localStorage.setItem('mbsim.compassCal', v ? '1' : '0'); } catch (_) {}
  };

  updateManual();
})();
