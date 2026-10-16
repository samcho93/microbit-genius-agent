// 지니어스 키트 구성품 SVG 그림 — 실물 사진(흰색 퍼즐형 모듈 + 검은 3핀 커넥터)을 본떠 그림
// 각 그림: { w, h, anchor: {x, y, dir}, svg }  — anchor 는 케이블이 연결되는 커넥터 위치
(function () {
  const DEFS = `
  <linearGradient id="k-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f4"/><stop offset=".45" stop-color="#c3c6ca"/><stop offset="1" stop-color="#8d9196"/></linearGradient>
  <linearGradient id="k-metalh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9da1a6"/><stop offset=".35" stop-color="#eef0f2"/><stop offset="1" stop-color="#8a8e93"/></linearGradient>
  <linearGradient id="k-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8892b"/><stop offset=".5" stop-color="#f1d27b"/><stop offset="1" stop-color="#a87b1e"/></linearGradient>
  <radialGradient id="k-red" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".5" stop-color="#e11d1d"/><stop offset="1" stop-color="#8b0b0b"/></radialGradient>
  <radialGradient id="k-blue" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#8fc2ff"/><stop offset=".5" stop-color="#1f6fe0"/><stop offset="1" stop-color="#0c3b8a"/></radialGradient>
  <radialGradient id="k-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff4a2a" stop-opacity=".95"/><stop offset=".5" stop-color="#ff2a10" stop-opacity=".35"/><stop offset="1" stop-color="#ff2a10" stop-opacity="0"/></radialGradient>
  <radialGradient id="k-dome" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e9ecef"/><stop offset="1" stop-color="#b9bfc6"/></radialGradient>
  <radialGradient id="k-mesh" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#f6b37c"/><stop offset=".7" stop-color="#d9773a"/><stop offset="1" stop-color="#8c4519"/></radialGradient>
  <pattern id="k-meshp" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M5 0L0 5" stroke="#7a3a12" stroke-width=".7" opacity=".55"/></pattern>
  <linearGradient id="k-servo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e40af"/></linearGradient>
  <linearGradient id="k-sonar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fd6"/><stop offset="1" stop-color="#1b4aa0"/></linearGradient>
  <radialGradient id="k-trans" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2b2b2b"/><stop offset=".55" stop-color="#555"/><stop offset=".62" stop-color="#d9dbde"/><stop offset="1" stop-color="#8f949a"/></radialGradient>
  <linearGradient id="k-fan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe46b"/><stop offset="1" stop-color="#f2b705"/></linearGradient>
  <filter id="k-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-opacity=".28"/></filter>`;

  // 흰색 퍼즐형 모듈 기판 (옥토퍼스 모듈 모양): 몸통 + 양쪽 귀(나사 구멍) + 아래 3핀 커넥터
  function octo(w, h, opt) {
    opt = opt || {};
    const earY = opt.earY || 34;
    const b = 16; // 몸통 좌우 여백 (귀가 튀어나옴)
    return `
    <g filter="url(#k-shadow)">
      <circle cx="${b}" cy="${earY}" r="15" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
      <circle cx="${w - b}" cy="${earY}" r="15" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
      <rect x="${b}" y="4" width="${w - 2 * b}" height="${h - 30}" rx="9" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
      <circle cx="${b}" cy="${earY}" r="13.6" fill="#f7f7f4"/><circle cx="${w - b}" cy="${earY}" r="13.6" fill="#f7f7f4"/>
      <circle cx="${b - 2}" cy="${earY}" r="6.5" fill="#dfe2e6" stroke="#a9adb2" stroke-width="1.2"/>
      <circle cx="${w - b + 2}" cy="${earY}" r="6.5" fill="#dfe2e6" stroke="#a9adb2" stroke-width="1.2"/>
    </g>
    ${connector(w / 2, h - 30)}`;
  }

  // 검은 3핀 커넥터 (위쪽 가운데가 (cx, top))
  function connector(cx, top, labels) {
    labels = labels || ['G', 'V', 'S'];
    return `
    <g class="k-conn">
      <text x="${cx}" y="${top - 5}" text-anchor="middle" font-size="8" fill="#8a8f96" font-family="monospace" letter-spacing="3">${labels.join(' ')}</text>
      <rect x="${cx - 21}" y="${top}" width="42" height="28" rx="3" fill="#1d1d1f"/>
      <rect x="${cx - 16}" y="${top + 6}" width="32" height="16" rx="2" fill="#0b0b0c"/>
      <rect x="${cx - 12}" y="${top + 11}" width="4" height="6" fill="#c9a24a"/><rect x="${cx - 2}" y="${top + 11}" width="4" height="6" fill="#c9a24a"/><rect x="${cx + 8}" y="${top + 11}" width="4" height="6" fill="#c9a24a"/>
    </g>`;
  }

  const SMD = (x, y) => `<rect x="${x}" y="${y}" width="9" height="5" rx="1" fill="#2b2b2b"/><rect x="${x}" y="${y}" width="2" height="5" fill="#c9c9c9"/><rect x="${x + 7}" y="${y}" width="2" height="5" fill="#c9c9c9"/>`;

  const D = {};

  D.crash = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <rect x="34" y="34" width="52" height="30" rx="3" fill="#202022"/>
      <circle cx="45" cy="49" r="3.2" fill="#e8e8e8"/><circle cx="75" cy="49" r="3.2" fill="#e8e8e8"/>
      <g class="k-lever" style="transform-origin:38px 32px;transition:transform .08s">
        <path d="M38 32 L98 14" stroke="url(#k-metal)" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="98" cy="14" r="5" fill="#d7d9dc" stroke="#7d8186"/>
      </g>
      ${SMD(40, 78)}${SMD(64, 78)}
      <circle cx="60" cy="98" r="3" fill="#d8dbe0" stroke="#a9adb2"/>`,
  });

  D.pot = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <rect x="36" y="22" width="48" height="48" rx="5" fill="url(#k-blue)" stroke="#0c3b8a"/>
      <g class="k-knob" style="transform-origin:60px 46px">
        <circle cx="60" cy="46" r="15" fill="#f1f3f6" stroke="#9aa3ad" stroke-width="1.5"/>
        <rect x="57.5" y="34" width="5" height="24" rx="1.5" fill="#9aa3ad"/><rect x="48" y="43.5" width="24" height="5" rx="1.5" fill="#9aa3ad"/>
      </g>
      ${SMD(40, 82)}${SMD(64, 82)}`,
  });

  D.tmp36 = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <path d="M43 52 L43 36 A17 17 0 0 1 77 36 L77 52 Z" fill="#1f1f22"/>
      <text x="60" y="47" text-anchor="middle" font-size="7" fill="#9a9a9a" font-family="monospace">TMP36</text>
      <rect x="49" y="52" width="3" height="14" fill="#b9bcc0"/><rect x="58.5" y="52" width="3" height="14" fill="#b9bcc0"/><rect x="68" y="52" width="3" height="14" fill="#b9bcc0"/>
      ${SMD(40, 80)}${SMD(64, 80)}`,
  });

  D.led = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <circle class="k-led-glow" cx="60" cy="40" r="44" fill="url(#k-glow)" opacity="0"/>
      <ellipse cx="60" cy="56" rx="17" ry="5" fill="#b4111a"/>
      <path d="M45 56 L45 36 A15 15 0 0 1 75 36 L75 56 Z" fill="url(#k-red)"/>
      <path class="k-led-core" d="M45 56 L45 36 A15 15 0 0 1 75 36 L75 56 Z" fill="#ffd2c8" opacity="0"/>
      <ellipse cx="54" cy="32" rx="4" ry="7" fill="#fff" opacity=".45"/>
      ${SMD(40, 80)}${SMD(64, 80)}`,
  });

  D.light = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <circle cx="60" cy="42" r="15" fill="#e8b46b" stroke="#a46a24" stroke-width="1.5"/>
      <path d="M50 36 h20 M50 36 v4 h20 v4 h-20 v4 h20" fill="none" stroke="#7a3c10" stroke-width="2"/>
      <circle cx="60" cy="42" r="15" fill="#fff" opacity=".18"/>
      ${SMD(40, 78)}${SMD(64, 78)}
      <text x="60" y="104" text-anchor="middle" font-size="8" fill="#8a8f96" font-family="monospace">LIGHT</text>`,
  });

  D.soil = () => ({
    w: 100, h: 210, anchor: { x: 50, y: 0, dir: 'up' }, svg: `
      <g filter="url(#k-shadow)">
        <rect x="14" y="20" width="72" height="70" rx="8" fill="#f7f7f4" stroke="#cfd2cc"/>
        <path d="M22 88 L22 196 Q22 206 30 206 L38 206 Q42 206 42 196 L42 88 Z" fill="url(#k-gold)" stroke="#8d6a1c"/>
        <path d="M58 88 L58 196 Q58 206 66 206 L74 206 Q78 206 78 196 L78 88 Z" fill="url(#k-gold)" stroke="#8d6a1c"/>
        <rect x="18" y="86" width="64" height="10" fill="#f7f7f4"/>
      </g>
      <rect x="29" y="0" width="42" height="28" rx="3" fill="#1d1d1f"/><rect x="34" y="6" width="32" height="16" rx="2" fill="#0b0b0c"/>
      ${SMD(30, 56)}${SMD(60, 56)}
      <text x="50" y="80" text-anchor="middle" font-size="7.5" fill="#8a8f96" font-family="monospace">SOIL</text>
      <g class="k-soil-wet" opacity="0"><rect x="16" y="150" width="68" height="58" rx="6" fill="#6b4a2b" opacity=".55"/><path d="M16 160 Q50 150 84 160" stroke="#4aa3ff" stroke-width="3" fill="none" opacity=".8"/></g>`,
  });

  D.oled = () => ({
    w: 150, h: 120, anchor: { x: 75, y: 0, dir: 'up' }, svg: `
      <g filter="url(#k-shadow)">
        <rect x="2" y="12" width="146" height="106" rx="6" fill="#1b3a70" stroke="#0f2448"/>
        <circle cx="10" cy="20" r="3.5" fill="#d8dbe0"/><circle cx="140" cy="20" r="3.5" fill="#d8dbe0"/><circle cx="10" cy="110" r="3.5" fill="#d8dbe0"/><circle cx="140" cy="110" r="3.5" fill="#d8dbe0"/>
        <rect x="9" y="34" width="132" height="70" rx="2" fill="#0b0d12" stroke="#c9b26a" stroke-width="1.2"/>
      </g>
      ${[0, 1, 2, 3].map(i => `<rect x="${51 + i * 14}" y="0" width="6" height="16" fill="#c9a24a"/>`).join('')}
      <text x="75" y="28" text-anchor="middle" font-size="6.5" fill="#cfd8e8" font-family="monospace" letter-spacing="1.5">GND VCC SCL SDA</text>
      <g class="k-oled" transform="translate(11 37) scale(1.0)"><rect width="128" height="64" fill="#03060c"/><path class="k-oled-px" d="" fill="#7fd7ff"/></g>`,
  });

  D.motor = () => ({
    w: 170, h: 150, anchor: { x: 105, y: 150, dir: 'down' }, svg: `
      <g filter="url(#k-shadow)">
        <circle cx="66" cy="34" r="15" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
        <circle cx="152" cy="34" r="15" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
        <rect x="66" y="4" width="86" height="116" rx="9" fill="#f7f7f4" stroke="#cfd2cc" stroke-width="1.2"/>
        <circle cx="66" cy="34" r="13.6" fill="#f7f7f4"/><circle cx="152" cy="34" r="13.6" fill="#f7f7f4"/>
        <circle cx="152" cy="34" r="6.5" fill="#dfe2e6" stroke="#a9adb2" stroke-width="1.2"/>
      </g>
      <rect x="44" y="42" width="72" height="44" rx="6" fill="url(#k-metal)" stroke="#7d8186"/>
      <rect x="40" y="52" width="8" height="24" fill="#c9ccd0" stroke="#7d8186"/>
      <rect x="112" y="50" width="10" height="28" fill="#c9a24a"/>
      <text x="80" y="68" text-anchor="middle" font-size="7" fill="#555" font-family="monospace">DC MOTOR</text>
      <rect x="24" y="61" width="18" height="6" fill="#b9bcc0"/>
      <g class="k-fan" style="transform-origin:22px 64px">
        <ellipse cx="22" cy="40" rx="9" ry="22" fill="url(#k-fan)" stroke="#c79400" opacity=".95"/>
        <ellipse cx="22" cy="88" rx="9" ry="22" fill="url(#k-fan)" stroke="#c79400" opacity=".95"/>
        <circle cx="22" cy="64" r="7" fill="#f5c400" stroke="#b78900"/>
      </g>
      ${connector(105, 120)}`,
  });

  D.servo = () => ({
    w: 160, h: 150, anchor: { x: 80, y: 150, dir: 'down' }, svg: `
      <g filter="url(#k-shadow)">
        <rect x="6" y="40" width="148" height="12" rx="3" fill="url(#k-servo)" stroke="#173a8c"/>
        <rect x="30" y="20" width="100" height="62" rx="5" fill="url(#k-servo)" stroke="#173a8c"/>
        <circle cx="16" cy="46" r="3.5" fill="#0d235a"/><circle cx="144" cy="46" r="3.5" fill="#0d235a"/>
      </g>
      <text x="85" y="66" text-anchor="middle" font-size="8" fill="#dbe7ff" font-family="sans-serif" font-weight="700">micro servo</text>
      <circle cx="58" cy="34" r="11" fill="#2f63d6" stroke="#173a8c"/>
      <g class="k-horn" style="transform-origin:58px 34px;transition:transform .25s">
        <path d="M58 28 L100 31 Q104 34 100 37 L58 40 Z" fill="#f4f4f2" stroke="#b9bcc0"/>
        <circle cx="58" cy="34" r="8" fill="#f4f4f2" stroke="#b9bcc0"/><circle cx="58" cy="34" r="2.5" fill="#999"/>
      </g>
      <path d="M118 82 C120 104 90 100 80 120" stroke="#8b4513" stroke-width="3" fill="none"/>
      <path d="M122 82 C124 108 94 104 84 120" stroke="#e53935" stroke-width="3" fill="none"/>
      <path d="M126 82 C128 112 98 108 88 120" stroke="#fb8c00" stroke-width="3" fill="none"/>
      <rect x="66" y="118" width="28" height="32" rx="3" fill="#1d1d1f"/>`,
  });

  D.keypad = () => {
    const keys = [['A', 34, 32, 'red'], ['B', 92, 32, 'blue'], ['C', 92, 80, 'blue'], ['D', 34, 128, 'red'], ['E', 92, 128, 'blue']];
    return {
      w: 126, h: 160, anchor: { x: 34, y: 80, dir: 'left' }, svg: `
      <g filter="url(#k-shadow)"><rect x="4" y="4" width="118" height="152" rx="9" fill="#f7f7f4" stroke="#cfd2cc"/></g>
      <rect x="18" y="66" width="32" height="28" rx="3" fill="#1d1d1f"/><rect x="23" y="72" width="22" height="16" rx="2" fill="#0b0b0c"/>
      ${keys.map(([k, x, y, c]) => `
        <g class="k-key" data-key="${k}" style="cursor:pointer">
          <rect x="${x - 20}" y="${y - 20}" width="40" height="40" rx="4" fill="#2a2a2c"/>
          <circle class="k-cap" cx="${x}" cy="${y}" r="15" fill="url(#k-${c})" stroke="#111"/>
          <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" pointer-events="none">${k}</text>
        </g>`).join('')}`,
    };
  };

  D.ring = () => {
    const px = [];
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4;
      const x = 70 + Math.cos(a) * 46, y = 62 + Math.sin(a) * 46;
      px.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(i * 45)})">
        <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#fbfbf8" stroke="#c9ccd0"/>
        <circle class="k-px" data-i="${i}" r="5.5" fill="#e9e3d6" stroke="#bcb6a8"/></g>`);
    }
    return {
      w: 140, h: 160, anchor: { x: 70, y: 160, dir: 'down' }, svg: `
      <g filter="url(#k-shadow)">
        <circle cx="70" cy="62" r="60" fill="#f7f7f4" stroke="#cfd2cc"/>
        <circle cx="70" cy="62" r="32" style="fill:var(--stage-bg,#eef2f6)" stroke="#cfd2cc"/>
        <rect x="52" y="114" width="36" height="22" fill="#f7f7f4" stroke="#cfd2cc"/>
      </g>
      <circle class="k-ring-glow" cx="70" cy="62" r="70" fill="none" opacity="0"/>
      ${px.join('')}
      <rect x="49" y="132" width="42" height="28" rx="3" fill="#1d1d1f"/><rect x="54" y="138" width="32" height="16" rx="2" fill="#0b0b0c"/>`,
    };
  };

  D.pir = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <circle class="k-pir-ring" cx="60" cy="46" r="27" fill="none" stroke="#ffb020" stroke-width="4" opacity="0"/>
      <circle cx="60" cy="46" r="22" fill="url(#k-dome)" stroke="#c6cbd1"/>
      <path d="M44 38 Q60 30 76 38 M40 48 Q60 40 80 48 M44 58 Q60 50 76 58 M52 26 Q48 46 52 66 M68 26 Q72 46 68 66" stroke="#c6cbd1" fill="none" stroke-width="1.2"/>
      ${SMD(40, 80)}${SMD(64, 80)}
      <text x="60" y="104" text-anchor="middle" font-size="8" fill="#8a8f96" font-family="monospace">PIR</text>`,
  });

  D.mq3 = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `${octo(120, 150)}
      <circle cx="60" cy="46" r="24" fill="#c0c4c9" stroke="#8d9196"/>
      <circle cx="60" cy="46" r="19" fill="url(#k-mesh)"/>
      <circle cx="60" cy="46" r="19" fill="url(#k-meshp)"/>
      <circle class="k-gas-haze" cx="60" cy="46" r="34" fill="#9be15d" opacity="0"/>
      ${SMD(36, 82)}${SMD(52, 82)}${SMD(68, 82)}
      <text x="60" y="104" text-anchor="middle" font-size="8" fill="#8a8f96" font-family="monospace">MQ-3</text>`,
  });

  D.sonar = () => ({
    w: 200, h: 120, anchor: { x: 100, y: 120, dir: 'down' }, svg: `
      <g filter="url(#k-shadow)"><rect x="2" y="8" width="196" height="88" rx="4" fill="url(#k-sonar)" stroke="#123a85"/></g>
      <circle cx="12" cy="18" r="4" fill="#d8dbe0"/><circle cx="188" cy="18" r="4" fill="#d8dbe0"/><circle cx="12" cy="86" r="4" fill="#d8dbe0"/><circle cx="188" cy="86" r="4" fill="#d8dbe0"/>
      <circle cx="50" cy="52" r="34" fill="url(#k-trans)"/><circle cx="150" cy="52" r="34" fill="url(#k-trans)"/>
      <circle cx="50" cy="52" r="19" fill="#3a3a3a" stroke="#666"/><circle cx="150" cy="52" r="19" fill="#3a3a3a" stroke="#666"/>
      <rect x="86" y="14" width="28" height="12" rx="5" fill="url(#k-metalh)" stroke="#777"/>
      <text x="50" y="98" text-anchor="middle" font-size="9" fill="#dbe7ff" font-family="monospace">T</text><text x="150" y="98" text-anchor="middle" font-size="9" fill="#dbe7ff" font-family="monospace">R</text>
      <text x="100" y="42" text-anchor="middle" font-size="8" fill="#dbe7ff" font-family="monospace">HC-SR04</text>
      <text x="100" y="92" text-anchor="middle" font-size="6.2" fill="#dbe7ff" font-family="monospace" letter-spacing=".5">VCC TRIG ECHO GND</text>
      ${[0, 1, 2, 3].map(i => `<rect x="${80 + i * 12}" y="96" width="5" height="24" fill="#c9a24a"/>`).join('')}
      <g class="k-sonar-wave" opacity="0">
        <path d="M100 0 m-24 -4 q24 -14 48 0" stroke="#5eead4" stroke-width="2.5" fill="none"/>
        <path d="M100 0 m-36 -12 q36 -18 72 0" stroke="#5eead4" stroke-width="2" fill="none" opacity=".6"/>
      </g>`,
  });

  D.battery = () => ({
    w: 120, h: 150, anchor: { x: 60, y: 150, dir: 'down' }, svg: `
      <g filter="url(#k-shadow)"><rect x="12" y="8" width="96" height="120" rx="6" fill="#eef3f6" stroke="#b8c2cc" opacity=".95"/></g>
      <rect x="22" y="18" width="34" height="100" rx="5" fill="#f08a1c"/><rect x="22" y="18" width="34" height="18" rx="5" fill="#9aa0a6"/>
      <rect x="64" y="18" width="34" height="100" rx="5" fill="#f08a1c"/><rect x="64" y="100" width="34" height="18" rx="5" fill="#9aa0a6"/>
      <text x="39" y="80" text-anchor="middle" font-size="9" fill="#fff" font-weight="700" transform="rotate(-90 39 80)">AAA</text>
      <text x="81" y="80" text-anchor="middle" font-size="9" fill="#fff" font-weight="700" transform="rotate(-90 81 80)">AAA</text>
      <path d="M60 128 C60 138 60 142 60 150" stroke="#e53935" stroke-width="3" fill="none"/>`,
  });

  function draw(id) { return (D[id] || D.led)(); }

  // 단독 썸네일 SVG 문자열 (구성품 선택 카드용)
  function thumb(id) {
    const d = draw(id);
    const pad = 6;
    return `<svg viewBox="${-pad} ${-pad} ${d.w + pad * 2} ${d.h + pad * 2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${d.svg}</svg>`;
  }

  // 문서에 그라디언트 정의를 한 번만 넣음
  function installDefs() {
    if (document.getElementById('kit-defs')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('id', 'kit-defs');
    s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.setAttribute('aria-hidden', 'true');
    s.style.position = 'absolute';
    s.innerHTML = `<defs>${DEFS}</defs>`;
    document.body.prepend(s);
  }

  window.KitDraw = { draw, thumb, installDefs };
})();
