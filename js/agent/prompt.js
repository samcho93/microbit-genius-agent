// 에이전트 시스템 프롬프트 · 응답(JSON) 해석 · 검증
(function () {
  function systemPrompt() {
    return `너는 "마이크로비트 지니어스 키트 예제 생성 에이전트"다. 한국 초·중학생과 선생님이 쓰는 웹앱 안에서 동작한다.
사용자의 요청(주제 또는 선택한 구성품)을 받아, 지니어스 키트 구성품을 활용하는 micro:bit V2 예제를 만든다.
같은 동작을 하는 MakeCode(JavaScript) 코드와 MicroPython 코드를 둘 다 만들고, 사용할 구성품과 핀 배치를 함께 정한다.
웹앱은 이 정보로 구성품을 자동 배치·배선하고 두 코드를 시뮬레이터에서 실행한다.

# 키트 구성품 (이 목록의 type 만 사용)
${KIT.promptCatalog()}
- micro:bit 내장: 5x5 LED 화면, 버튼 A/B, 터치 로고, 스피커(music), 가속도(기울기·흔들기), 온도, 빛 센서, 무선(radio), 시리얼.

# 확장보드 핀 규칙
- 3핀(G·V·S) 단자: ${KIT.HEADER_PINS.join(', ')}. OLED 는 I2C 단자(P19=SCL, P20=SDA) 고정.
- 아날로그 입력(analog: pot, tmp36, light, soil, mq3, keypad)은 P0, P1, P2 에만. 최대 3개. P0 는 스피커와 공유되므로 마지막에 사용.
- 디지털 입력/출력·서보·네오픽셀은 P8, P12, P13, P14, P15, P16 을 우선 사용 (P0~P2 도 가능).
- 초음파(sonar)는 trig, echo 두 핀 (예: trig P14, echo P15).
- 구성품 하나에 하나씩, 핀이 겹치면 안 된다. 같은 type 은 한 번만 쓴다 (키트에 1개씩).
- P3, P4, P5, P6, P7, P9, P10, P11 은 LED 화면·버튼과 겹치므로 쓰지 않는다.

# MakeCode 코드 규칙 (makecode.microbit.org 의 JavaScript 탭에 그대로 붙여 넣을 수 있게)
- 사용 가능한 API: basic, input, pins, led, music, radio, serial, control, images, Math, randint,
  neopixel (확장: neopixel.create(DigitalPin.Px, 8, NeoPixelMode.RGB), strip.showColor/showRainbow/setPixelColor/show/clear/showBarGraph/rotate, neopixel.colors/rgb/hsl),
  OLED (확장 Tinkertanker/pxt-oled-ssd1306: OLED.init(128, 64), OLED.clear(), OLED.writeString, OLED.writeStringNewLine, OLED.writeNum, OLED.writeNumNewLine, OLED.newLine, OLED.drawLine, OLED.drawRectangle),
  sonar (확장 pxt-sonar: sonar.ping(DigitalPin.Ptrig, DigitalPin.Pecho, PingUnit.Centimeters)).
- 서보는 pins.servoWritePin(AnalogPin.Px, 각도). 충돌 센서는 pins.setPull(DigitalPin.Px, PinPullMode.PullUp) 후 0 이면 눌림.
- 반복은 basic.forever, 이벤트는 input.onButtonPressed 등. 블록으로 바뀔 수 있게 단순한 문장 위주로 쓴다.
- 타입 표기(: number 등), 클래스, 화살표 함수는 쓰지 않는다. 배열 콜백(forEach, map 등) 안에서 micro:bit API 를 부르지 말고 for 문을 쓴다.
- 함수는 function 이름() {} 형태로 위쪽에 선언한다.

# MicroPython 코드 규칙 (python.microbit.org V3 의 micro:bit V2 MicroPython)
- from microbit import * 로 시작. 사용 가능: microbit(display, Image, button_a/b, pinN, accelerometer, temperature, sleep), music, neopixel, radio, machine, utime, random, math.
- OLED 는 키트 전용 모듈 "import oled" 를 사용: oled.init(), oled.clear(), oled.text(문자열, x, y, scale=1), oled.pixel(x, y), oled.line(x0, y0, x1, y1), oled.rect(x, y, w, h, fill=False), oled.show(), oled.print_line(문자열).
  oled.text 등은 버퍼에 그리므로 마지막에 oled.show() 를 꼭 부른다. 글자 크기 6x8px(scale 배).
- 서보: pinN.set_analog_period(20) 후 pinN.write_analog(int(26 + angle * 102 / 180)).
- 초음파: trig 핀에 write_digital(1) → utime.sleep_us(10) → write_digital(0) 후 machine.time_pulse_us(echo핀, 1, 30000) / 58 = cm (음수면 측정 실패).
- 메인 반복은 while True: 와 sleep(ms). 이벤트 대신 button_a.was_pressed() 등을 확인한다.

# 공통 규칙
- 두 코드는 같은 구성품·같은 핀·같은 동작이어야 한다. components 의 핀과 코드의 핀이 반드시 일치.
- LED 화면과 OLED 에는 영어/숫자만 표시한다 (5x5·OLED 글꼴은 한글 불가). 주석과 설명은 한국어.
- 코드는 학생이 읽기 쉽게 짧게 (각 80줄 이하), 의미 있는 변수 이름과 한국어 주석.
- 시뮬레이터에서 바로 시험할 수 있어야 한다: 센서 값은 조절 패널 슬라이더/버튼으로 바꾼다.
  임계값은 기본값과 슬라이더 범위 안에서 바뀌는 지점이 생기도록 정한다 (예: 조도 기본 520, 온도 기본 25°C, 토양 420, 가스 110, 거리 80cm).
- 요청에 키트에 없는 부품이 필요하면 가장 비슷한 키트 부품으로 바꾸고 summary 에 그 사실을 적는다.
- 사용자가 이미 만든 예제를 고쳐 달라고 하면(현재 예제가 함께 주어짐) 그 예제를 바탕으로 수정한다.

# 출력 형식
설명 문장이나 마크다운 없이 JSON 객체 하나만 출력한다.
{
  "title": "예제 제목 (한국어, 20자 이내)",
  "summary": "무엇을 하는 예제인지 2~3문장",
  "components": [ { "type": "tmp36", "pins": { "sig": "P1" } }, { "type": "sonar", "pins": { "trig": "P14", "echo": "P15" } }, { "type": "oled" } ],
  "makecode": "MakeCode JavaScript 코드",
  "micropython": "MicroPython 코드",
  "howToTest": ["시뮬레이터에서 시험하는 방법 1", "..."],
  "learn": ["배우는 개념", "..."]
}`;
  }

  function userPrompt(req) {
    const parts = (req.selected || []).map(t => `${t}(${KIT.byId[t].name})`);
    let s = '';
    if (req.current) {
      s += '# 현재 예제 (이것을 고쳐 줘)\n' + JSON.stringify({
        title: req.current.title, components: req.current.components.map(c => ({ type: c.type, pins: c.pins })),
        makecode: req.current.makecode, micropython: req.current.micropython,
      }) + '\n\n';
    }
    s += '# 요청\n' + (req.prompt || '(주제 없음 — 선택한 구성품을 모두 활용하는 재미있는 생활 속 예제를 만들어 줘)') + '\n';
    if (parts.length) s += '\n# 반드시 사용할 구성품\n' + parts.join(', ') + '\n';
    if (req.variant && req.variant.n > 1) {
      s += `\n# 여러 예제 중 ${req.variant.i + 1}/${req.variant.n} 번째\n같은 요청으로 예제 ${req.variant.n} 개를 만드는 중이다.`;
      if (req.avoid && req.avoid.length) s += ` 이미 만든 예제: ${req.avoid.map(t => '"' + t + '"').join(', ')} — 이것들과 주제·동작·구성품 조합이 겹치지 않는 다른 아이디어로 만든다.`;
      s += '\n';
    }
    s += `\n# 우선 언어\n${req.lang === 'python' ? 'MicroPython' : 'MakeCode'} 코드를 특히 정성껏 (두 언어 모두 출력)\n`;
    return s;
  }

  // 모델 응답에서 JSON 꺼내기 (코드 펜스·앞뒤 설명이 있어도 처리)
  function extractJson(text) {
    let t = String(text || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence && fence[1].trim().startsWith('{')) t = fence[1].trim();
    const start = t.indexOf('{');
    if (start < 0) throw new Error('응답에서 JSON 을 찾지 못했습니다.');
    // 문자열 안의 중괄호를 고려해 짝 맞추기
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) throw new Error('JSON 이 끝까지 오지 않았습니다 (응답이 잘렸을 수 있음).');
    return JSON.parse(t.slice(start, end + 1));
  }

  // 응답 → 앱에서 쓰는 예제 객체
  function normalize(obj, selected) {
    if (!obj || typeof obj !== 'object') throw new Error('예제 형식이 아닙니다.');
    const strip = s => String(s || '').replace(/^```[a-z]*\n?|```\s*$/g, '').trim() + '\n';
    let comps = Array.isArray(obj.components) ? obj.components : [];
    comps = comps.map(c => (typeof c === 'string' ? { type: c } : c)).filter(c => c && KIT.byId[c.type]);
    for (const t of selected || []) if (!comps.some(c => c.type === t)) comps.push({ type: t });
    const assigned = KIT.assignPins(comps);
    const ex = {
      title: String(obj.title || '새 예제').slice(0, 40),
      summary: String(obj.summary || ''),
      components: assigned,
      makecode: strip(obj.makecode),
      micropython: strip(obj.micropython),
      howToTest: Array.isArray(obj.howToTest) ? obj.howToTest.map(String) : [],
      learn: Array.isArray(obj.learn) ? obj.learn.map(String) : [],
    };
    ex.warnings = check(ex, comps);
    return ex;
  }

  // 배치된 핀과 코드 속 핀 비교
  function check(ex, requested) {
    const w = [];
    const assignedPins = new Set();
    for (const c of ex.components) for (const p of Object.values(c.pins)) if (p) assignedPins.add(p);
    for (const c of ex.components) for (const [r, p] of Object.entries(c.pins)) if (!p) w.push(`${KIT.byId[c.type].name}: 남는 핀이 없어 연결하지 못했습니다 (${r}).`);
    for (const [lang, code] of [['MakeCode', ex.makecode], ['MicroPython', ex.micropython]]) {
      const used = KIT.pinsInCode(code);
      for (const p of used) if (!assignedPins.has(p) && !['P19', 'P20'].includes(p)) w.push(`${lang} 코드가 배치에 없는 핀 ${p} 를 사용합니다.`);
    }
    for (const r of requested || []) {
      const a = ex.components.find(c => c.type === r.type);
      if (a && r.pins) for (const [role, p] of Object.entries(r.pins)) {
        const want = KIT.normPin(p);
        if (want && a.pins[role] && a.pins[role] !== want) w.push(`${KIT.byId[r.type].name} 핀을 ${want} → ${a.pins[role]} 로 바꿔 배치했습니다. 코드의 핀도 확인하세요.`);
      }
    }
    if (!ex.makecode.trim()) w.push('MakeCode 코드가 비어 있습니다.');
    if (!ex.micropython.trim()) w.push('MicroPython 코드가 비어 있습니다.');
    return w;
  }

  window.AgentPrompt = { systemPrompt, userPrompt, extractJson, normalize, check };
})();
