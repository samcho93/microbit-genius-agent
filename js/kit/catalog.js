// 마이크로비트 지니어스 키트 구성품 카탈로그 · 핀 배정 규칙
// 출처: 에듀집 "마이크로비트 지니어스 키트" 구성품 (센서 14종 + 확장보드)
(function () {
  // iface: analog(아날로그 입력) · digital(디지털 입력) · pwm(출력) · servo · neopixel · i2c · sonar · none
  const PARTS = [
    {
      id: 'crash', name: '충돌 센서', en: 'Crash sensor', group: 'input', iface: 'digital', pins: ['sig'],
      desc: '레버가 달린 마이크로 스위치. 풀업으로 읽어 눌리면 0, 떼면 1.',
      keywords: ['충돌', '스위치', '버튼', '누르', '범퍼', '터치', '문', '도어'],
      mc: 'pins.setPull(DigitalPin.P8, PinPullMode.PullUp); if (pins.digitalReadPin(DigitalPin.P8) == 0) { /* 눌림 */ }',
      py: 'pin8.set_pull(pin8.PULL_UP)\nif pin8.read_digital() == 0:  # 눌림',
    },
    {
      id: 'pot', name: '가변 저항', en: 'Potentiometer', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '돌리는 손잡이. 아날로그 값 0~1023.',
      keywords: ['가변', '저항', '다이얼', '볼륨', '손잡이', '조절', '포텐'],
      mc: 'let v = pins.analogReadPin(AnalogPin.P1)  // 0~1023',
      py: 'v = pin1.read_analog()  # 0~1023',
    },
    {
      id: 'tmp36', name: 'TMP36 온도 센서', en: 'TMP36 temperature', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '아날로그 온도 센서. 온도(°C) = (값 × 3300 / 1023 − 500) / 10. 25°C 일 때 약 232.',
      keywords: ['온도', '기온', '날씨', '더위', '추위', '난방', '냉방', '체온', 'tmp36'],
      mc: 'let t = Math.round((pins.analogReadPin(AnalogPin.P1) * 3300 / 1023 - 500) / 10)',
      py: 't = round((pin1.read_analog() * 3300 / 1023 - 500) / 10)',
    },
    {
      id: 'led', name: 'LED', en: 'LED module', group: 'output', iface: 'pwm', pins: ['sig'],
      desc: '빨간 LED. 디지털 1/0 으로 켜고 끄거나 아날로그 0~1023 으로 밝기 조절.',
      keywords: ['led', '불빛', '전등', '가로등', '램프', '조명', '경고등', '신호'],
      mc: 'pins.digitalWritePin(DigitalPin.P13, 1)  // 또는 pins.analogWritePin(AnalogPin.P13, 512)',
      py: 'pin13.write_digital(1)  # 또는 pin13.write_analog(512)',
    },
    {
      id: 'light', name: '조도 센서', en: 'Light sensor', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '포토레지스터. 밝을수록 값이 커짐 (0~1023, 어두운 방 약 100, 밝은 곳 약 800).',
      keywords: ['조도', '빛', '밝기', '어두', '낮', '밤', '햇빛', '가로등', '블라인드', '커튼', '날씨'],
      mc: 'let light = pins.analogReadPin(AnalogPin.P2)',
      py: 'light = pin2.read_analog()',
    },
    {
      id: 'soil', name: '토양 수분 센서', en: 'Soil moisture', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '두 갈래 전극. 흙이 젖을수록 값이 커짐 (마른 흙 < 300, 촉촉 300~700, 물 > 700).',
      keywords: ['토양', '수분', '화분', '식물', '물주기', '흙', '습도', '비', '농장', '정원'],
      mc: 'let soil = pins.analogReadPin(AnalogPin.P1)',
      py: 'soil = pin1.read_analog()',
    },
    {
      id: 'oled', name: 'OLED 디스플레이', en: 'OLED 128x64', group: 'display', iface: 'i2c', pins: ['scl', 'sda'],
      desc: 'SSD1306 128×64 OLED. I2C 단자(P19=SCL, P20=SDA)에 연결. 한 줄 21글자 × 8줄.',
      keywords: ['oled', '화면', '디스플레이', '표시', '글자', '출력', '모니터', '시계', '계기판'],
      mc: 'OLED.init(128, 64); OLED.clear(); OLED.writeStringNewLine("Temp"); OLED.writeNumNewLine(25)',
      py: 'import oled\noled.init(); oled.clear(); oled.text("Temp", 0, 0); oled.text(25, 0, 16, 2); oled.show()',
    },
    {
      id: 'motor', name: 'DC 모터(팬)', en: 'DC motor fan', group: 'output', iface: 'pwm', pins: ['sig'],
      desc: '프로펠러가 달린 DC 모터 모듈. 아날로그 0~1023 으로 속도 조절 (0 = 정지).',
      keywords: ['모터', '팬', '선풍기', '바람', '환풍', '드라이기', '회전', '프로펠러', '냉방'],
      mc: 'pins.analogWritePin(AnalogPin.P14, 700)  // 0~1023',
      py: 'pin14.write_analog(700)  # 0~1023',
    },
    {
      id: 'servo', name: '서보 모터', en: 'Servo SG90', group: 'output', iface: 'servo', pins: ['sig'],
      desc: '0~180° 로 각도를 정하는 SG90 서보. 문, 차단기, 급식기, 블라인드 등에 사용.',
      keywords: ['서보', '각도', '문', '차단기', '급식기', '블라인드', '로봇', '팔', '열리', '닫히', '쓰레기통'],
      mc: 'pins.servoWritePin(AnalogPin.P15, 90)',
      py: 'pin15.set_analog_period(20)\npin15.write_analog(int(26 + angle * 102 / 180))  # angle 0~180',
    },
    {
      id: 'keypad', name: 'AD 키패드', en: 'AD keypad', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '버튼 5개(A~E)를 아날로그 핀 하나로 읽음. A<10, B 40~60, C 80~110, D 130~150, E 530~560, 안 누름 ≈1023.',
      keywords: ['키패드', '키보드', '피아노', '계산기', '비밀번호', '버튼', '선택', '메뉴', '게임', '도어락'],
      mc: 'let k = pins.analogReadPin(AnalogPin.P2); if (k < 10) { /* A */ } else if (k >= 40 && k <= 60) { /* B */ }',
      py: 'k = pin2.read_analog()\nif k < 10:  # A\n    pass\nelif 40 <= k <= 60:  # B\n    pass',
    },
    {
      id: 'ring', name: '레인보우 LED 링', en: 'NeoPixel ring x8', group: 'output', iface: 'neopixel', pins: ['sig'],
      desc: 'WS2812 RGB LED 8개가 둥글게 배치된 링. neopixel 로 색 지정.',
      keywords: ['레인보우', '무지개', 'rgb', '네오픽셀', '색', '컬러', '무드등', '링', '조명', '파티'],
      mc: 'let strip = neopixel.create(DigitalPin.P16, 8, NeoPixelMode.RGB); strip.showColor(neopixel.colors(NeoPixelColors.Red))',
      py: 'import neopixel\nnp = neopixel.NeoPixel(pin16, 8)\nnp[0] = (255, 0, 0); np.show()',
    },
    {
      id: 'pir', name: 'PIR 인체 감지 센서', en: 'PIR motion', group: 'input', iface: 'digital', pins: ['sig'],
      desc: '사람·동물의 움직임(적외선)을 감지하면 1, 없으면 0.',
      keywords: ['pir', '인체', '움직임', '감지', '사람', '동작', '보안', '경보', '침입', '자동문'],
      mc: 'if (pins.digitalReadPin(DigitalPin.P12) == 1) { /* 움직임 */ }',
      py: 'if pin12.read_digital() == 1:  # 움직임',
    },
    {
      id: 'mq3', name: 'MQ3 가스 센서', en: 'MQ3 gas (alcohol)', group: 'input', iface: 'analog', pins: ['sig'],
      desc: '알코올·가스 농도가 높을수록 값이 커짐 (깨끗한 공기 약 100, 가스 > 400).',
      keywords: ['가스', '알코올', '음주', '공기', '냄새', '연기', '화재', '누출', 'mq3', '미세먼지'],
      mc: 'let gas = pins.analogReadPin(AnalogPin.P0)',
      py: 'gas = pin0.read_analog()',
    },
    {
      id: 'sonar', name: '초음파 센서', en: 'HC-SR04 ultrasonic', group: 'input', iface: 'sonar', pins: ['trig', 'echo'],
      desc: 'HC-SR04 거리 센서 (2~400cm). Trig 에 10µs 펄스를 주고 Echo 펄스 길이(µs) ÷ 58 = cm.',
      keywords: ['초음파', '거리', '주차', '장애물', '가까이', '다가', '멀어', '키', '측정', '밀당', '쓰레기통'],
      mc: 'let d = sonar.ping(DigitalPin.P14, DigitalPin.P15, PingUnit.Centimeters)',
      py: 'pin14.write_digital(1); utime.sleep_us(10); pin14.write_digital(0)\nd = machine.time_pulse_us(pin15, 1) / 58  # cm',
    },
    {
      id: 'battery', name: 'AAA 배터리 홀더', en: 'AAA battery holder', group: 'accessory', iface: 'none', pins: [],
      desc: 'AAA 건전지 2개 홀더. 확장보드 전원 단자에 연결 (코드 없음).',
      keywords: ['배터리', '건전지', '전원'],
    },
  ];

  const byId = Object.fromEntries(PARTS.map(p => [p.id, p]));

  // 확장보드 3핀 단자(G V S) — micro:bit LED 화면 핀(P3,4,6,7,10)과 버튼 핀(P5,P11)은 피함
  const HEADER_PINS = ['P0', 'P1', 'P2', 'P8', 'P12', 'P13', 'P14', 'P15', 'P16'];
  const ANALOG_PINS = ['P1', 'P2', 'P0'];               // 아날로그 입력 가능 (P0 는 V2 스피커와 공유 → 마지막)
  const DIGITAL_PINS = ['P8', 'P12', 'P13', 'P14', 'P15', 'P16', 'P0', 'P1', 'P2'];
  const PREF = {
    sonar: { trig: 'P14', echo: 'P15' },
    ring: { sig: 'P16' },
    servo: { sig: 'P15' },
    motor: { sig: 'P13' },
    led: { sig: 'P8' },
    pir: { sig: 'P12' },
    crash: { sig: 'P8' },
  };

  const normPin = p => {
    if (p === undefined || p === null) return null;
    const m = String(p).toUpperCase().match(/(\d+)/);
    return m ? 'P' + (+m[1]) : null;
  };

  // components: [{ type, pins? }] → 유효한 핀으로 정리. 겹치거나 맞지 않으면 다시 배정
  function assignPins(list) {
    const used = new Set(['P19', 'P20']);
    const out = [];
    const seen = new Set();
    const items = (list || []).map(c => (typeof c === 'string' ? { type: c } : Object.assign({}, c)))
      .filter(c => byId[c.type] && !seen.has(c.type) && seen.add(c.type));
    const take = (cands) => { const p = cands.find(x => !used.has(x)); if (p) used.add(p); return p || null; };
    const ok = (part, role, pin) => {
      if (!pin || used.has(pin)) return false;
      if (part.iface === 'i2c') return false;
      if (part.iface === 'analog') return ANALOG_PINS.includes(pin);
      return HEADER_PINS.includes(pin);
    };
    // 1차: 요청된 핀 중 유효한 것 확정
    for (const c of items) {
      const part = byId[c.type];
      const pins = {};
      if (part.iface === 'i2c') { pins.scl = 'P19'; pins.sda = 'P20'; }
      else for (const role of part.pins) {
        const want = normPin(c.pins && (c.pins[role] || (part.pins.length === 1 ? (c.pins.pin || c.pins.sig || Object.values(c.pins)[0]) : null)));
        if (ok(part, role, want)) { pins[role] = want; used.add(want); }
      }
      out.push({ type: c.type, label: c.label || part.name, pins, part });
    }
    // 2차: 빠진 핀 배정 (초음파 → 네오픽셀 → 아날로그 → 나머지)
    const order = ['sonar', 'ring', 'analog', 'rest'];
    for (const phase of order) {
      for (const c of out) {
        const part = c.part;
        const isPhase = phase === part.id || (phase === 'analog' && part.iface === 'analog') ||
          (phase === 'rest' && part.id !== 'sonar' && part.id !== 'ring' && part.iface !== 'analog');
        if (!isPhase) continue;
        for (const role of part.pins) {
          if (c.pins[role]) continue;
          const pref = PREF[part.id] && PREF[part.id][role];
          if (part.iface === 'analog') c.pins[role] = take(ANALOG_PINS);
          else c.pins[role] = take((pref ? [pref] : []).concat(DIGITAL_PINS));
        }
      }
    }
    return out.map(c => ({ type: c.type, label: c.label, pins: c.pins }));
  }

  // 코드에서 쓰는 핀 찾기 (생성된 코드 ↔ 배치 일치 검사용)
  function pinsInCode(code) {
    const s = new Set();
    const re = /(?:DigitalPin|AnalogPin)\.P(\d+)|\bpin(\d+)\b/g;
    let m;
    while ((m = re.exec(code || ''))) s.add('P' + (m[1] || m[2]));
    return s;
  }

  // 프롬프트에 넣을 카탈로그 설명
  function promptCatalog() {
    return PARTS.filter(p => p.group !== 'accessory').map(p =>
      `- type "${p.id}" — ${p.name} (${p.en}), 인터페이스: ${p.iface}, 핀 역할: ${p.pins.join(', ') || '없음'}\n` +
      `  설명: ${p.desc}\n  MakeCode: ${p.mc}\n  MicroPython: ${p.py.replace(/\n/g, ' ⏎ ')}`).join('\n');
  }

  window.KIT = { PARTS, byId, HEADER_PINS, ANALOG_PINS, DIGITAL_PINS, assignPins, pinsInCode, promptCatalog, normPin };
})();
