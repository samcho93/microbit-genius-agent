// 강의 교안 PDF 만들기: 예제마다 회로 구성 · 블록 코드 · 파이썬 코드 · 예제/프로그램 설명 · 실습 · 확인 문제 슬라이드
// 교안 글은 LLM(설정한 제공자)이 쓰고, 오프라인이거나 실패하면 코드에서 직접 만든 기본 교안을 씀
// 슬라이드(1280x720 HTML) → html2canvas → jsPDF 로 한 개의 PDF
(function () {
  const LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  };
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('라이브러리를 불러오지 못했습니다: ' + src));
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const W = 1280, H = 720;

  // ---------- 1. 교안 글 ----------
  function lessonSystem() {
    return `너는 초등 고학년~중학생 대상 micro:bit 피지컬 컴퓨팅 수업 교안을 쓰는 정보 교사 도우미다.
주어진 지니어스 키트 예제(구성품·핀·MakeCode·MicroPython 코드)로 40분 수업용 교안 내용을 만든다.
학생 눈높이의 쉬운 한국어로, 실제 코드와 정확히 맞게 쓴다. 코드 인용은 원본 MicroPython 코드에서 그대로 가져온다.
설명이나 마크다운 없이 JSON 객체 하나만 출력한다:
{
  "target": "대상 학년 (예: 초5~중1)",
  "duration": "수업 시간 (예: 40분)",
  "objectives": ["학습 목표 3개, ~할 수 있다 형태"],
  "hook": "도입: 생활 속 장면으로 호기심을 여는 질문 1~2문장",
  "concepts": [{"term": "핵심 개념", "desc": "1~2문장 설명"}],
  "circuitNotes": ["회로 연결 방법과 주의할 점 2~4개 (단자·케이블 색 포함)"],
  "blockNotes": ["MakeCode 블록에서 눈여겨볼 점 2~3개"],
  "programSteps": [{"title": "단계 제목", "desc": "이 부분이 하는 일 2~3문장", "py": "해당 MicroPython 코드 (최대 7줄, 원본 그대로)"}],
  "activities": ["시뮬레이터와 실제 키트로 해 보는 실습 순서 3~5개"],
  "quiz": [{"q": "확인 문제", "a": "정답"}],
  "extensions": ["더 해 보기 과제 2~3개"],
  "teacherTips": ["지도 팁 2~3개"]
}
concepts 는 3~4개, programSteps 는 4~6개, quiz 는 3개.`;
  }
  function lessonUser(ex) {
    return JSON.stringify({
      title: ex.title, summary: ex.summary,
      components: ex.components.map(c => ({ type: c.type, name: KIT.byId[c.type].name, pins: c.pins })),
      howToTest: ex.howToTest, learn: ex.learn, makecode: ex.makecode, micropython: ex.micropython,
    });
  }

  const CONCEPTS = {
    analog: ['아날로그 입력', '센서 값을 0~1023 사이의 숫자로 읽는 방법. 밝기·온도처럼 연속으로 변하는 양을 잴 때 씁니다.'],
    digital: ['디지털 입력', '0 또는 1 두 가지 값만 읽는 방법. 눌렸는지, 움직임이 있는지처럼 예/아니오를 알 때 씁니다.'],
    pwm: ['PWM(아날로그 출력)', '전기를 아주 빠르게 켰다 껐다 하는 비율로 LED 밝기나 모터 속도를 0~1023 단계로 조절합니다.'],
    servo: ['서보 모터 각도', '20ms 마다 보내는 펄스 길이(0.5~2.5ms)로 0~180° 각도를 정합니다.'],
    neopixel: ['RGB LED (네오픽셀)', '빨강·초록·파랑(0~255)을 섞어 원하는 색을 만들고, LED 마다 다른 색을 줄 수 있습니다.'],
    i2c: ['I2C 통신', '선 두 개(SCL·SDA)로 OLED 같은 장치에 데이터를 보내는 통신 방법입니다.'],
    sonar: ['초음파 거리 측정', '소리가 물체에 부딪혀 돌아오는 시간(µs)을 재고 58 로 나누면 거리(cm)가 됩니다.'],
    if: ['조건문 (if)', '센서 값이 기준보다 큰지 작은지에 따라 다른 동작을 하게 합니다.'],
    loop: ['무한 반복', '센서를 계속 확인하려면 while True / 무한반복 블록 안에서 읽고 판단합니다.'],
  };
  const QUIZ = {
    light: ['조도 센서 값이 커지면 주변은 밝아진 것일까요, 어두워진 것일까요?', '밝아진 것 (밝을수록 값이 커짐)'],
    tmp36: ['TMP36 의 값이 232 일 때 온도는 약 몇 °C 일까요? (전압 = 값 × 3300 / 1023)', '약 25°C ((750 − 500) ÷ 10)'],
    soil: ['토양 수분 센서 값이 작으면 흙은 마른 상태일까요, 젖은 상태일까요?', '마른 상태'],
    mq3: ['MQ3 센서 값이 크게 올라가는 것은 어떤 상황일까요?', '알코올·가스 농도가 높아졌을 때'],
    pot: ['가변 저항을 끝까지 돌렸을 때 읽히는 가장 큰 값은?', '1023'],
    crash: ['충돌 센서를 풀업으로 읽을 때 눌리면 값은 0 일까요, 1 일까요?', '0'],
    pir: ['PIR 센서가 움직임을 감지하면 읽히는 값은?', '1'],
    sonar: ['초음파 펄스가 돌아오는 데 580µs 걸렸다면 거리는 몇 cm 일까요?', '10cm (580 ÷ 58)'],
    servo: ['서보 모터를 가운데(90°)로 두려면 어떤 블록/값을 써야 할까요?', 'servoWritePin(핀, 90) / servo(90)'],
    motor: ['DC 모터 속도를 절반쯤으로 하려면 아날로그 출력 값을 얼마로 할까요?', '약 512'],
    led: ['LED 를 켜는 디지털 출력 값은?', '1'],
    ring: ['레인보우 링을 빨간색으로 켜는 RGB 값은?', '(255, 0, 0)'],
    keypad: ['AD 키패드는 버튼 5개를 핀 몇 개로 읽을까요?', '1개 (버튼마다 다른 아날로그 값)'],
    oled: ['OLED 에 글자를 쓴 뒤 화면에 보이게 하려면 MicroPython 에서 무엇을 불러야 할까요?', 'oled.show()'],
  };

  function offlineLesson(ex) {
    const parts = ex.components.map(c => KIT.byId[c.type]);
    const ifaces = new Set(parts.map(p => (p.iface === 'pwm' ? 'pwm' : p.iface)));
    const concepts = [];
    for (const k of ['analog', 'digital', 'pwm', 'servo', 'neopixel', 'i2c', 'sonar']) if (ifaces.has(k)) concepts.push(CONCEPTS[k]);
    if (/\bif\b/.test(ex.micropython)) concepts.push(CONCEPTS.if);
    concepts.push(CONCEPTS.loop);
    const quiz = parts.map(p => QUIZ[p.id]).filter(Boolean).slice(0, 3);
    while (quiz.length < 3) quiz.push(['이 예제에서 센서 값을 읽는 코드는 어느 부분일까요?', 'while True 반복 안에서 read_analog / read_digital 로 읽는 부분'].slice(0, 2));
    return {
      target: '초5~중1', duration: '40분',
      objectives: [
        `${parts.map(p => p.name).join(', ')} 의 동작 원리를 설명할 수 있다.`,
        `${(ex.learn && ex.learn[0]) || '센서 입력과 출력'} 을(를) 이용해 프로그램을 만들 수 있다.`,
        '시뮬레이터와 실제 micro:bit 에서 프로그램을 실행하고 고칠 수 있다.',
      ],
      hook: `"${ex.title}" — 우리 주변에서 이렇게 스스로 판단하고 움직이는 장치를 본 적이 있나요? 어떤 센서가 무엇을 알아낼지 함께 생각해 봅시다.`,
      concepts: concepts.slice(0, 4).map(([term, desc]) => ({ term, desc })),
      circuitNotes: ex.components.map(c => {
        const p = KIT.byId[c.type];
        if (p.iface === 'i2c') return `${p.name}: 확장보드 I2C 단자에 GND·VCC·SCL(P19)·SDA(P20) 순서로 연결합니다.`;
        if (p.iface === 'sonar') return `${p.name}: VCC·GND 는 전원, Trig 는 ${c.pins.trig}, Echo 는 ${c.pins.echo} 의 S(노랑) 핀에 연결합니다.`;
        if (p.iface === 'none') return `${p.name}: 확장보드 전원 단자에 연결합니다.`;
        return `${p.name}: 3핀 케이블을 ${c.pins.sig} 단자에 꽂습니다 — 검정 G, 빨강 V, 노랑 S 색을 맞춥니다.`;
      }).concat(['케이블은 micro:bit 전원을 끈 상태에서 연결하고, 색이 단자 색과 맞는지 다시 확인합니다.']).slice(0, 5),
      blockNotes: ['「시작하면」 블록에서 장치를 준비하고, 「무한반복」 안에서 센서를 읽어 판단합니다.', '핀 번호(P0, P1 …)가 회로와 같은지 확인합니다.'],
      programSteps: stepsFromCode(ex.micropython),
      activities: (ex.howToTest || []).concat(['실제 키트로 같은 회로를 만들고 코드를 micro:bit 에 넣어 확인합니다.']).slice(0, 5),
      quiz: quiz.map(([q, a]) => ({ q, a })),
      extensions: ['기준값(임계값)을 바꿔 보고 동작이 어떻게 달라지는지 기록해 봅시다.', '소리(music)나 LED 화면 표시를 더해 상태를 더 잘 알려 주도록 바꿔 봅시다.', '다른 구성품을 하나 더 연결해 기능을 확장해 봅시다.'],
      teacherTips: ['먼저 시뮬레이터에서 슬라이더로 센서 값을 바꿔 보며 기준값을 정하게 하면 실물 실습이 빨라집니다.', '케이블 색(G 검정 · V 빨강 · S 노랑)을 단자 색과 맞추는 습관을 들이게 합니다.'],
      source: 'offline',
    };
  }

  // 파이썬 코드를 빈 줄·주석 단위로 나눠 프로그램 설명 단계 만들기
  function stepsFromCode(py) {
    const blocks = [];
    let cur = [];
    for (const line of String(py || '').split('\n')) {
      if (!line.trim()) { if (cur.length) blocks.push(cur); cur = []; continue; }
      cur.push(line);
    }
    if (cur.length) blocks.push(cur);
    const merged = [];
    for (const b of blocks) {
      const last = merged[merged.length - 1];
      if (last && (last.length + b.length <= 7) && !/^(def|while|class)\b/.test(b[0].trim())) last.push(...b); else merged.push(b.slice());
    }
    return merged.slice(0, 6).map((b, i) => {
      const first = b.find(l => !l.trim().startsWith('#')) || b[0];
      const comment = (b.find(l => l.trim().startsWith('#')) || '').replace(/^\s*#\s*/, '');
      const t = first.trim();
      let title = '코드 살펴보기', desc = comment;
      if (/^(from|import)\b/.test(t)) { title = '모듈 불러오기와 준비'; desc = desc || 'micro:bit 기능과 필요한 모듈을 불러오고, 사용할 장치를 준비합니다.'; }
      else if (/^def\s+(\w+)/.test(t)) { const n = t.match(/^def\s+(\w+)/)[1]; title = `함수 만들기: ${n}()`; desc = desc || `${n}() 함수로 자주 쓰는 동작을 한 곳에 모아 둡니다. 필요할 때 이름만 불러 씁니다.`; }
      else if (/^while\s+True/.test(t)) { title = '계속 반복하기'; desc = desc || '센서 값을 계속 읽고, 조건에 따라 출력 장치를 제어합니다.'; }
      else if (/=/.test(t)) { title = '값 정하기'; desc = desc || '프로그램에서 쓸 기준값과 변수를 정합니다.'; }
      return { title: `${i + 1}. ${title}`, desc: desc || '이 부분의 코드를 한 줄씩 읽어 봅시다.', py: b.slice(0, 7).join('\n') };
    });
  }

  async function buildLesson(ex, hooks) {
    const s = Agent.Settings.load();
    if (s.provider !== 'offline') {
      try {
        const text = await Agent.complete(lessonSystem(), lessonUser(ex), hooks);
        const o = AgentPrompt.extractJson(text);
        if (o && Array.isArray(o.objectives)) { o.source = s.provider; return o; }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (hooks && hooks.onNote) hooks.onNote('LLM 교안 작성 실패 → 기본 교안 사용 (' + e.message + ')');
      }
    }
    return offlineLesson(ex);
  }

  // ---------- 2. 그림 ----------
  function imgFromUrl(url) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('그림을 불러오지 못했습니다')); i.src = url; });
  }
  async function toPng(url, maxW) {
    const img = await imgFromUrl(url);
    const k = Math.min(1, (maxW || 2000) / (img.naturalWidth || img.width));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/png'), w: c.width, h: c.height, canvas: c };
  }
  const svgUrl = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

  // 지금 무대(회로)를 독립 SVG → PNG 로
  async function captureStage() {
    const src = Stage.svg;
    const clone = src.cloneNode(true);
    const vb = Stage.fitVB || Stage.vb;
    if (vb) clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', 1600);
    clone.setAttribute('height', vb ? Math.round(1600 * vb.h / vb.w) : 1350);
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = KitDraw.DEFS;
    clone.insertBefore(defs, clone.firstChild);
    // CSS 클래스로 정한 색을 속성으로 옮김 (독립 그림에서는 CSS 가 없으므로)
    const pairs = [['.k-label-text', '#344055', 700, 17], ['.k-value-text', '#64708a', 400, 16], ['.mb-label', '#e9e9e9', 700, 30], ['.mb-pinlabel', '#3a2a05', 700, 22]];
    for (const [sel, fill, weight, size] of pairs) clone.querySelectorAll(sel).forEach(t => { t.setAttribute('fill', fill); t.setAttribute('font-weight', weight); t.setAttribute('font-size', size); t.setAttribute('font-family', 'Malgun Gothic, Apple SD Gothic Neo, sans-serif'); });
    clone.querySelectorAll('.stage-gridline').forEach(p => p.setAttribute('stroke', '#e3e8ef'));
    clone.querySelectorAll('.stage-bg').forEach(r => r.setAttribute('style', 'fill:#f3f6fa'));
    clone.querySelectorAll('[style*="var(--stage-bg"]').forEach(e => e.setAttribute('style', 'fill:#f3f6fa'));
    const text = new XMLSerializer().serializeToString(clone);
    return toPng(svgUrl(text), 1600);
  }

  async function blocksImage(code) {
    try {
      const r = await MCBlocks.render(code);
      return await toPng(r.uri || svgUrl(r.svg), 2400);
    } catch (_) { return null; }
  }

  // 키가 큰 그림을 여러 장으로 자름
  function slicePng(p, maxH) {
    if (p.h <= maxH) return [p];
    const out = [];
    for (let y = 0; y < p.h; y += maxH) {
      const h = Math.min(maxH, p.h - y);
      const c = document.createElement('canvas'); c.width = p.w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, p.w, h); g.drawImage(p.canvas, 0, y, p.w, h, 0, 0, p.w, h);
      out.push({ url: c.toDataURL('image/png'), w: p.w, h });
    }
    return out;
  }

  const partImg = {};
  async function partPng(type) {
    if (!partImg[type]) partImg[type] = (await toPng(svgUrl(KitDraw.standalone(type)), 400)).url;
    return partImg[type];
  }

  // ---------- 3. 슬라이드 ----------
  const CSS = `
  .ls { width:${W}px; height:${H}px; background:#fff; color:#172033; font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif; position:relative; overflow:hidden; box-sizing:border-box; padding:54px 64px 60px; }
  .ls * { box-sizing:border-box; }
  .ls .bar { position:absolute; left:0; top:0; width:100%; height:12px; background:linear-gradient(90deg,#00a091,#2563eb); }
  .ls h1 { margin:0 0 6px; font-size:38px; line-height:1.25; }
  .ls h2 { margin:0 0 20px; font-size:30px; color:#0f3d63; display:flex; align-items:center; gap:12px; }
  .ls h2 .no { background:#00a091; color:#fff; border-radius:10px; padding:2px 12px; font-size:20px; }
  .ls .sub { color:#00786d; font-weight:700; font-size:18px; margin-bottom:8px; }
  .ls p, .ls li { font-size:21px; line-height:1.55; }
  .ls ul, .ls ol { margin:0; padding-left:28px; }
  .ls li { margin:4px 0; }
  .ls .foot { position:absolute; left:64px; right:64px; bottom:20px; display:flex; justify-content:space-between; font-size:13px; color:#8a93a6; border-top:1px solid #e3e8ef; padding-top:8px; }
  .ls .box { background:#f3f7fb; border:1px solid #dde5ef; border-radius:14px; padding:16px 20px; }
  .ls .note { background:#e8f7f5; border-left:6px solid #00a091; border-radius:10px; padding:12px 18px; font-size:19px; }
  .ls pre { margin:0; font-family:Consolas,"D2Coding","Courier New",monospace; font-size:16px; line-height:1.45; background:#0f1726; color:#e2e8f0; border-radius:12px; padding:14px 18px; white-space:pre; overflow:hidden; }
  .ls pre .ln { color:#5b6b85; display:inline-block; width:34px; }
  .ls pre .cm { color:#7ee2a8; } .ls pre .st { color:#ffd479; } .ls pre .kw { color:#82aaff; font-weight:700; }
  .ls .grid { display:grid; gap:16px; }
  .ls .pcard { border:1px solid #dde5ef; border-radius:14px; padding:12px; display:flex; gap:12px; align-items:center; background:#fbfcfe; }
  .ls .pcard img { width:84px; height:84px; object-fit:contain; flex:none; }
  .ls .pcard b { font-size:19px; } .ls .pcard span { font-size:15px; color:#475069; display:block; line-height:1.4; }
  .ls .pin { display:inline-block; background:#fff3bf; color:#6b5300; font:700 14px Consolas,monospace; border-radius:6px; padding:1px 8px; margin-left:6px; }
  .ls table { border-collapse:collapse; width:100%; font-size:17px; }
  .ls th, .ls td { border:1px solid #dde5ef; padding:7px 10px; text-align:left; }
  .ls th { background:#eef3f9; }
  .ls .wire { display:inline-block; width:22px; height:8px; border-radius:4px; vertical-align:middle; margin-right:4px; }
  .ls .cover { background:linear-gradient(135deg,#0f3d63,#00786d); color:#fff; }
  .ls.cover h1 { font-size:52px; color:#fff; } .ls.cover p, .ls.cover li { color:#e2f3f1; }
  .ls .tag { display:inline-block; background:#e8edf4; border-radius:999px; padding:3px 12px; font-size:15px; margin:3px 4px 3px 0; }
  .ls .imgwrap { display:flex; align-items:center; justify-content:center; background:#f6f8fb; border:1px solid #e3e8ef; border-radius:14px; overflow:hidden; }
  .ls .imgwrap img { max-width:100%; max-height:100%; object-fit:contain; }
  .ls .qa { border:1px solid #dde5ef; border-radius:12px; padding:10px 16px; margin-bottom:10px; }
  .ls .qa .a { color:#8a5a00; font-size:16px; margin-top:4px; }`;

  function hl(code, startNo) {
    return String(code).split('\n').map((l, i) => {
      let h = esc(l);
      h = h.replace(/(#.*)$/, '<span class="cm">$1</span>').replace(/(\/\/.*)$/, '<span class="cm">$1</span>');
      h = h.replace(/(&quot;[^&]*?&quot;|'[^']*')/g, '<span class="st">$1</span>');
      h = h.replace(/\b(from|import|def|while|if|elif|else|for|in|return|True|False|and|or|not|let|function|basic|input)\b(?![^<]*<\/span>)/g, '<span class="kw">$1</span>');
      return (startNo ? `<span class="ln">${startNo + i}</span>` : '') + h;
    }).join('\n');
  }

  function slidesFor(ex, L, assets, idx, total, deckTitle) {
    const out = [];
    const no = total > 1 ? `예제 ${idx + 1}` : '예제';
    const foot = p => `<div class="foot"><span>${esc(deckTitle)} · ${esc(ex.title)}</span><span>${p}</span></div>`;
    const S = (inner, cls) => out.push({ html: `<div class="ls ${cls || ''}"><div class="bar"></div>${inner}`, foot });
    const parts = ex.components.map(c => ({ c, p: KIT.byId[c.type] }));
    const pinTxt = c => (c.type === 'oled' ? 'I2C P19/P20' : Object.entries(c.pins).map(([r, v]) => (Object.keys(c.pins).length > 1 ? r + ' ' : '') + v).join(' · '));

    // 1. 제목
    S(`<div class="sub">${no} / ${total}</div><h1 style="font-size:46px">${esc(ex.title)}</h1>
      <p style="font-size:23px;max-width:1000px;margin:14px 0 26px">${esc(ex.summary)}</p>
      <div class="grid" style="grid-template-columns:repeat(${Math.min(parts.length, 5)},1fr);max-width:1100px">
        ${parts.map(({ c, p }) => `<div class="pcard" style="flex-direction:column;text-align:center"><img src="${assets.parts[c.type]}" alt=""><b>${esc(p.name)}</b><span class="pin">${esc(pinTxt(c))}</span></div>`).join('')}
      </div>
      <p style="margin-top:22px;color:#475069">대상: ${esc(L.target || '초5~중1')} · 시간: ${esc(L.duration || '40분')} · 언어: MakeCode 블록 / MicroPython</p>`);

    // 2. 학습 목표 · 도입
    S(`<h2><span class="no">${no}</span>학습 목표</h2>
      <ol>${(L.objectives || []).map(o => `<li>${esc(o)}</li>`).join('')}</ol>
      <div class="note" style="margin-top:28px"><b>🤔 생각 열기</b><br>${esc(L.hook || '')}</div>
      ${(ex.learn || []).length ? `<div style="margin-top:22px">${ex.learn.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}`);

    // 3. 준비물
    S(`<h2><span class="no">${no}</span>준비물 · 구성품</h2>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="pcard"><img src="${assets.parts.__mb}" alt=""><div><b>micro:bit V2 + 확장보드</b><span>지니어스 키트 확장보드에 micro:bit 를 꽂아 사용합니다. 3핀 단자: G(검정)·V(빨강)·S(노랑)</span></div></div>
        ${parts.map(({ c, p }) => `<div class="pcard"><img src="${assets.parts[c.type]}" alt=""><div><b>${esc(p.name)}</b><span class="pin">${esc(pinTxt(c))}</span><span>${esc(p.desc)}</span></div></div>`).join('')}
      </div>`);

    // 4. 회로 구성
    const rows = parts.map(({ c, p }) => {
      if (p.iface === 'i2c') return `<tr><td>${esc(p.name)}</td><td>I2C (SCL P19, SDA P20)</td><td><span class="wire" style="background:#262626"></span>GND <span class="wire" style="background:#e53935"></span>VCC <span class="wire" style="background:#22a06b"></span>SCL <span class="wire" style="background:#2f80ed"></span>SDA</td></tr>`;
      if (p.iface === 'sonar') return `<tr><td>${esc(p.name)}</td><td>Trig ${c.pins.trig} · Echo ${c.pins.echo}</td><td><span class="wire" style="background:#e53935"></span>VCC <span class="wire" style="background:#f5c400"></span>Trig <span class="wire" style="background:#ff8a00"></span>Echo <span class="wire" style="background:#262626"></span>GND</td></tr>`;
      return `<tr><td>${esc(p.name)}</td><td>${esc(c.pins.sig || '-')}</td><td><span class="wire" style="background:#262626"></span>G <span class="wire" style="background:#e53935"></span>V <span class="wire" style="background:#f5c400"></span>S</td></tr>`;
    }).join('');
    S(`<h2><span class="no">${no}</span>회로 구성</h2>
      <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:22px;height:560px">
        <div class="imgwrap" style="height:560px"><img src="${assets.circuit.url}" alt="회로"></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <table><tr><th>구성품</th><th>단자</th><th>케이블</th></tr>${rows}</table>
          <ul style="font-size:18px">${(L.circuitNotes || []).slice(0, 4).map(n => `<li style="font-size:18px">${esc(n)}</li>`).join('')}</ul>
        </div>
      </div>`);

    // 5. 핵심 개념
    S(`<h2><span class="no">${no}</span>핵심 개념</h2>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        ${(L.concepts || []).slice(0, 4).map(k => `<div class="box"><b style="font-size:22px;color:#00786d">${esc(k.term)}</b><p style="margin:6px 0 0">${esc(k.desc)}</p></div>`).join('')}
      </div>`);

    // 6. 블록 코드
    if (assets.blocks && assets.blocks.length) {
      assets.blocks.forEach((b, i) => S(`<h2><span class="no">${no}</span>MakeCode 블록 코드${assets.blocks.length > 1 ? ` (${i + 1}/${assets.blocks.length})` : ''}</h2>
        <div style="display:grid;grid-template-columns:900px 1fr;gap:20px;height:560px">
          <div class="imgwrap" style="height:560px;background:#fff;align-items:flex-start"><img src="${b.url}" alt="블록 코드"></div>
          ${i === 0 ? `<div><div class="sub">블록에서 볼 점</div><ul>${(L.blockNotes || []).map(n => `<li style="font-size:18px">${esc(n)}</li>`).join('')}</ul></div>` : '<div class="muted" style="color:#8a93a6;font-size:16px">앞 쪽에서 이어집니다</div>'}
        </div>`));
    } else {
      chunk(ex.makecode, 24).forEach((c, i, all) => S(`<h2><span class="no">${no}</span>MakeCode 코드 (JavaScript)${all.length > 1 ? ` (${i + 1}/${all.length})` : ''}</h2><pre>${hl(c.text, c.start)}</pre>`));
    }

    // 7. 파이썬 코드
    chunk(ex.micropython, 24).forEach((c, i, all) => S(`<h2><span class="no">${no}</span>MicroPython 코드${all.length > 1 ? ` (${i + 1}/${all.length})` : ''}</h2>
      <pre style="height:540px">${hl(c.text, c.start)}</pre>`));

    // 8. 예제 · 프로그램 설명
    S(`<h2><span class="no">${no}</span>예제 설명</h2>
      <p style="font-size:23px">${esc(ex.summary)}</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px">
        <div class="box"><div class="sub">입력 (센서)</div><ul>${parts.filter(x => x.p.group === 'input').map(x => `<li style="font-size:19px">${esc(x.p.name)} — ${esc(x.p.desc)}</li>`).join('') || '<li style="font-size:19px">micro:bit 버튼 · 내장 센서</li>'}</ul></div>
        <div class="box"><div class="sub">출력 (표시 · 동작)</div><ul>${parts.filter(x => x.p.group !== 'input' && x.p.group !== 'accessory').map(x => `<li style="font-size:19px">${esc(x.p.name)} — ${esc(x.p.desc)}</li>`).join('') || '<li style="font-size:19px">micro:bit LED 화면 · 소리</li>'}</ul></div>
      </div>`);
    const steps = (L.programSteps || []).slice(0, 6);
    for (let i = 0; i < steps.length; i += 2) {
      S(`<h2><span class="no">${no}</span>프로그램 설명${steps.length > 2 ? ` (${i / 2 + 1}/${Math.ceil(steps.length / 2)})` : ''}</h2>
        <div class="grid" style="grid-template-columns:1fr;gap:18px">
          ${steps.slice(i, i + 2).map(st => `<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:18px;align-items:start">
            <div><div class="sub" style="font-size:21px">${esc(st.title)}</div><p style="margin:0;font-size:19px">${esc(st.desc)}</p></div>
            <pre style="font-size:15px;max-height:250px">${hl(st.py || '')}</pre></div>`).join('')}
        </div>`);
    }

    // 9. 실습
    S(`<h2><span class="no">${no}</span>실습 · 시뮬레이션</h2>
      <ol>${(L.activities || ex.howToTest || []).map(a => `<li>${esc(a)}</li>`).join('')}</ol>
      <div class="note" style="margin-top:22px">시뮬레이터: 「센서 조절」 슬라이더·버튼으로 값을 바꾸며 결과를 확인 → 실제 키트에서는 같은 단자에 연결하고 MakeCode(.hex) 또는 MicroPython 으로 업로드</div>`);

    // 10. 확인 문제 · 더 해 보기
    S(`<h2><span class="no">${no}</span>확인 문제 · 더 해 보기</h2>
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:22px">
        <div>${(L.quiz || []).slice(0, 3).map((q, i) => `<div class="qa"><b style="font-size:19px">Q${i + 1}. ${esc(q.q)}</b><div class="a">정답: ${esc(q.a)}</div></div>`).join('')}</div>
        <div><div class="sub">더 해 보기</div><ul>${(L.extensions || []).map(e => `<li style="font-size:19px">${esc(e)}</li>`).join('')}</ul>
          ${(L.teacherTips || []).length ? `<div class="sub" style="margin-top:16px">지도 팁</div><ul>${L.teacherTips.map(t => `<li style="font-size:17px;color:#475069">${esc(t)}</li>`).join('')}</ul>` : ''}</div>
      </div>`);
    return out;
  }

  function chunk(code, n) {
    const lines = String(code || '').replace(/\n+$/, '').split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i += n) out.push({ text: lines.slice(i, i + n).join('\n'), start: i + 1 });
    return out.length ? out : [{ text: '', start: 1 }];
  }

  function deckSlides(examples, deckTitle) {
    const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const cover = `<div class="ls cover" style="background:linear-gradient(135deg,#0f3d63,#00786d)"><div style="position:absolute;left:64px;top:70px;right:64px">
      <div style="font-size:22px;color:#9be7dc;font-weight:700">micro:bit 지니어스 키트</div>
      <h1 style="font-size:54px;color:#fff;margin:10px 0 20px">${esc(deckTitle)}</h1>
      <p style="font-size:22px;color:#d7f0ec">피지컬 컴퓨팅 강의 교안 · 예제 ${examples.length}개 · ${date}</p>
      <ol style="margin-top:30px">${examples.map(e => `<li style="font-size:26px;color:#fff">${esc(e.title)}</li>`).join('')}</ol></div>`;
    const last = `<div class="ls"><div class="bar"></div><h2>실제 micro:bit 로 옮기기</h2>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="box"><div class="sub">MakeCode</div><ol><li style="font-size:19px">makecode.microbit.org 에서 JavaScript 를 붙여 넣거나 앱의 「MakeCode 에서 열기」</li><li style="font-size:19px">확장: neopixel · OLED(SSD1306) · sonar</li><li style="font-size:19px">「다운로드」한 .hex 를 MICROBIT 드라이브에 복사</li></ol></div>
        <div class="box"><div class="sub">MicroPython</div><ol><li style="font-size:19px">python.microbit.org 에서 main.py 열기</li><li style="font-size:19px">OLED 를 쓰면 키트 전용 oled.py 를 프로젝트 파일에 추가</li><li style="font-size:19px">「Send to micro:bit」로 업로드</li></ol></div>
      </div>
      <div class="note" style="margin-top:24px">케이블 색: <b>검정 G</b> · <b>빨강 V</b> · <b>노랑 S</b> — 확장보드 단자 색과 맞춰 연결합니다.</div>`;
    return { cover, last };
  }

  // ---------- 4. PDF ----------
  async function renderPdf(slideHtml, file, onProgress, hooks) {
    hooks = hooks || {};
    await loadScript(LIBS.html2canvas);
    await loadScript(LIBS.jspdf);
    const { jsPDF } = window.jspdf;
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-${W + 200}px;top:0;width:${W}px;z-index:-1;pointer-events:none`;
    host.innerHTML = `<style>${CSS}</style>`;
    document.body.appendChild(host);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], hotfixes: ['px_scaling'], compress: true });
    try {
      for (let i = 0; i < slideHtml.length; i++) {
        onProgress && onProgress(i, slideHtml.length);
        const wrap = document.createElement('div');
        wrap.innerHTML = slideHtml[i];
        const el = wrap.firstElementChild;
        host.appendChild(el);
        await Promise.all([...el.querySelectorAll('img')].map(im => (im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))));
        const canvas = await window.html2canvas(el, { scale: 1.5, backgroundColor: '#ffffff', logging: false, width: W, height: H, windowWidth: W });
        if (i > 0) pdf.addPage([W, H], 'landscape');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, H);
        if (hooks.onPage) hooks.onPage(canvas, i);
        el.remove();
      }
      if (hooks.onPdf) hooks.onPdf(pdf.output('blob'), file); else pdf.save(file);
    } finally { host.remove(); }
  }

  // examples: 예제 배열, hooks: { onStatus(text), signal }
  async function makeLessonPdf(examples, hooks) {
    hooks = hooks || {};
    const status = t => hooks.onStatus && hooks.onStatus(t);
    const deckTitle = examples.length > 1 ? `${examples[0].prompt || examples[0].title} 외 예제 ${examples.length}개` : examples[0].title;
    const keep = App.state.ex, keepLang = App.state.lang;
    const all = [];
    const mbPng = (await toPng(svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="166" viewBox="0 0 520 430"><rect x="2" y="2" width="516" height="426" rx="26" fill="#1f1f22"/><rect x="226" y="24" width="68" height="34" rx="17" fill="none" stroke="#d4a93c" stroke-width="6"/>${[0, 1, 2, 3, 4].map(y => [0, 1, 2, 3, 4].map(x => `<rect x="${163 + x * 46}" y="${75 + y * 46}" width="10" height="22" rx="2" fill="#ff3b1f" opacity="${(x + y) % 2 ? 0.25 : 0.9}"/>`).join('')).join('')}<circle cx="62" cy="176" r="21" fill="#111"/><circle cx="458" cy="176" r="21" fill="#111"/>${[58, 159, 260, 361, 462].map(x => `<path d="M${x - 36} 428 L${x - 36} 336 Q${x - 36} 318 ${x - 18} 318 L${x + 18} 318 Q${x + 36} 318 ${x + 36} 336 L${x + 36} 428 Z" fill="#d4a93c"/>`).join('')}</svg>`), 300)).url;
    try {
      for (let i = 0; i < examples.length; i++) {
        if (hooks.signal && hooks.signal.aborted) throw Object.assign(new Error('취소'), { name: 'AbortError' });
        const ex = examples[i];
        const tag = examples.length > 1 ? `${i + 1}/${examples.length} ` : '';
        status(`${tag}「${ex.title}」 교안 글 쓰는 중…`);
        if (!ex.lesson) ex.lesson = await buildLesson(ex, { signal: hooks.signal, onNote: t => status(t) });
        status(`${tag}회로 그림 · 블록 코드 준비 중…`);
        App.applyExample(ex, { lang: 'makecode', quiet: true });
        await MCRT.run(ex.makecode);   // 실행 중인 모습(LED·OLED·링)을 담기 위해 잠깐 실행
        await sleep(1800);
        const circuit = await captureStage();
        await MCRT.stop();
        const bimg = await blocksImage(ex.makecode);
        const blocks = bimg ? slicePng(bimg, Math.round(bimg.w * 560 / 900)) : null;
        const parts = { __mb: mbPng };
        for (const c of ex.components) parts[c.type] = await partPng(c.type);
        all.push(...slidesFor(ex, ex.lesson, { circuit, blocks, parts }, i, examples.length, deckTitle));
      }
      const { cover, last } = deckSlides(examples, deckTitle);
      const htmls = [cover, ...all.map(s => s.html), last];
      const n = htmls.length;
      // 쪽 번호 꼬리말 붙이기
      const withFoot = htmls.map((h, i) => {
        if (i === 0) return h + '</div>';
        const s = all[i - 1];
        return h + (s ? s.foot(`${i + 1} / ${n}`) : `<div class="foot"><span>${esc(deckTitle)}</span><span>${i + 1} / ${n}</span></div>`) + '</div>';
      });
      const safe = deckTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 40).trim() || '교안';
      await renderPdf(withFoot, `강의교안_${safe}.pdf`, (k, t) => status(`PDF 만드는 중… ${k + 1}/${t} 쪽`), hooks);
      status(`완료 — ${n}쪽 PDF 를 저장했습니다.`);
      return n;
    } finally {
      if (keep) App.applyExample(keep, { lang: keepLang, quiet: true });
    }
  }

  window.Lesson = { makeLessonPdf, buildLesson, offlineLesson };
})();
