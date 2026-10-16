// MakeCode 블록 그림 렌더러(makecode.microbit.org 문서 렌더러) · MakeCode 편집기로 가져오기
(function () {
  const ORIGIN = 'https://makecode.microbit.org';
  const EXT = [
    [/\bneopixel\./, 'neopixel', 'github:microsoft/pxt-neopixel#v0.7.6'],
    [/\bOLED\./, 'SSD1306_OLED', 'github:Tinkertanker/pxt-oled-ssd1306#v2.0.18'],
    [/\bsonar\./, 'sonar', 'github:microsoft/pxt-sonar#v0.0.6'],
  ];
  const extsFor = code => EXT.filter(([re]) => re.test(code));

  const B = window.MCBlocks = { ready: false };
  let frame = null, queue = [], pending = {}, seq = 0, readyTimer = null;

  function ensureFrame() {
    if (frame) return;
    frame = document.getElementById('mc-renderer');
    frame.src = ORIGIN + '/--docs?render=1&lang=ko';
    readyTimer = setTimeout(() => { if (!B.ready) for (const id in pending) { pending[id].reject(new Error('블록 렌더러 응답 없음')); delete pending[id]; } }, 45000);
  }

  window.addEventListener('message', ev => {
    const m = ev.data;
    if (!m || m.source !== 'makecode') return;
    if (m.type === 'renderready') {
      B.ready = true; clearTimeout(readyTimer);
      const q = queue; queue = [];
      q.forEach(send);
    } else if (m.type === 'renderblocks') {
      const p = pending[m.id];
      if (!p) return;
      delete pending[m.id];
      if (m.error || (!m.uri && !m.svg)) p.reject(new Error(m.error || '블록으로 바꿀 수 없는 코드입니다'));
      else p.resolve(m);
    }
  });

  function send(req) {
    frame.contentWindow.postMessage({
      type: 'renderblocks', id: req.id, code: req.code,
      // layout 1 = 맨 위 블록 묶음(시작하면 · 무한반복 …)을 세로로 정렬 → 좁은 칸·교안에서 읽기 쉬움
      options: { package: extsFor(req.code).map(([, n, v]) => `${n}=${v}`).join(','), snippetMode: false, layout: 1 },
    }, ORIGIN);
  }

  // 코드 → 블록 그림 {uri, svg, width, height}
  B.render = function (code) {
    ensureFrame();
    return new Promise((resolve, reject) => {
      const id = 'r' + (++seq);
      pending[id] = { resolve, reject };
      const req = { id, code };
      if (B.ready) send(req); else queue.push(req);
      setTimeout(() => { if (pending[id]) { delete pending[id]; reject(new Error('블록 그리기 시간 초과')); } }, 60000);
    });
  };

  // ---------- MakeCode 편집기로 열기 (controller 모드 iframe) ----------
  let mcFrame = null, mcPending = null, mcLoaded = false;
  function project(code, name) {
    const deps = { core: '*', radio: '*', microphone: '*' };
    for (const [, n, v] of extsFor(code)) deps[n] = v;
    return {
      text: {
        'main.ts': code, 'main.blocks': '', 'README.md': ' ',
        'pxt.json': JSON.stringify({ name: name || 'genius-kit', dependencies: deps, description: '', files: ['main.blocks', 'main.ts', 'README.md'], preferredEditor: 'blocksprj' }),
      },
    };
  }
  function postImport() {
    if (!mcPending || !mcFrame) return;
    mcFrame.contentWindow.postMessage({ type: 'pxteditor', action: 'importproject', id: 'imp' + Date.now(), response: true, project: mcPending }, ORIGIN);
    mcPending = null;
  }
  window.addEventListener('message', ev => {
    if (ev.origin !== ORIGIN || !mcFrame || ev.source !== mcFrame.contentWindow) return;
    const m = ev.data || {};
    if (m.type === 'pxthost') {
      // 편집기가 저장소 동기화를 요청하면 빈 작업공간으로 응답
      if (m.action === 'workspacesync') mcFrame.contentWindow.postMessage({ type: 'pxthost', id: m.id, success: true, projects: [] }, ORIGIN);
      else if (m.id) mcFrame.contentWindow.postMessage({ type: 'pxthost', id: m.id, success: true }, ORIGIN);
    }
    if (m.type === 'pxteditor' && (m.action === 'importproject' || /^imp/.test(m.id || ''))) {
      document.getElementById('mc-note').textContent = m.success === false ? '가져오기에 실패했습니다. 코드를 복사해 두었으니 JavaScript 탭에 붙여 넣으세요.' : '불러왔습니다. 「다운로드」로 .hex 를 받아 micro:bit 드라이브에 복사하세요.';
    }
    if (m.type === 'pxthost' && /editorcontentloaded|workspaceloaded/.test(m.action || '')) { mcLoaded = true; postImport(); }
  });

  B.openEditor = function (code, name) {
    const dlg = document.getElementById('mc-dialog');
    mcFrame = document.getElementById('mc-frame');
    mcPending = project(code, name);
    document.getElementById('mc-note').textContent = '편집기를 불러오는 중… (처음에는 시간이 걸립니다)';
    if (!mcFrame.src) {
      mcFrame.src = ORIGIN + '/?controller=1&lang=ko';
      mcFrame.onload = () => setTimeout(() => postImport(), mcLoaded ? 0 : 6000);
    } else postImport();
    dlg.showModal();
  };
  document.getElementById('mc-close').onclick = () => document.getElementById('mc-dialog').close();

  B.extsFor = extsFor;
})();
