// 앱: 화면 전환 · 에이전트 · 코드 편집기 · 시뮬레이터 연결
(function () {
  const $ = id => document.getElementById(id);
  const RT = MB.runtime;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };

  const state = {
    ex: null,                                   // 현재 예제
    lang: store.get('mgka.lang', 'makecode'),   // 'makecode' | 'python'
    tab: 'blocks',                              // MakeCode: 'blocks' | 'js'
    selected: new Set(store.get('mgka.selected', [])),
    busy: null,
  };

  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 2800);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- 테마 ----------
  const theme = store.get('mgka.theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  $('btn-theme').onclick = () => {
    const dark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    store.set('mgka.theme', document.documentElement.dataset.theme);
  };

  // ---------- 화면 전환 ----------
  const VIEWS = ['workspace', 'guide', 'tutorial'];
  function route() {
    const h = location.hash.slice(1) || 'workspace';
    if (VIEWS.includes(h)) {
      for (const v of VIEWS) $('view-' + v).hidden = v !== h;
      document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.view === h));
      window.scrollTo(0, 0);
      if (h === 'workspace') { refreshEditors(); Stage.fit(); }
    } else {
      const el = document.getElementById(h);
      if (el) { const v = el.closest('.view'); if (v && v.hidden) { location.hash = v.id.replace('view-', ''); return; } el.scrollIntoView({ behavior: 'smooth' }); }
    }
  }
  window.addEventListener('hashchange', route);

  // ---------- 구성품 카드 ----------
  KitDraw.installDefs();
  function buildParts() {
    const g = $('parts-grid');
    g.innerHTML = '';
    for (const p of KIT.PARTS) {
      const b = document.createElement('button');
      b.className = 'part' + (p.group === 'accessory' ? ' acc' : '') + (state.selected.has(p.id) ? ' on' : '');
      b.type = 'button';
      b.title = p.desc;
      b.setAttribute('aria-pressed', state.selected.has(p.id));
      b.innerHTML = KitDraw.thumb(p.id) + `<span>${p.name}</span>`;
      if (p.group !== 'accessory') b.onclick = () => {
        state.selected.has(p.id) ? state.selected.delete(p.id) : state.selected.add(p.id);
        store.set('mgka.selected', [...state.selected]);
        b.classList.toggle('on'); b.setAttribute('aria-pressed', state.selected.has(p.id));
      };
      g.appendChild(b);
    }
  }
  $('btn-clear-parts').onclick = () => { state.selected.clear(); store.set('mgka.selected', []); buildParts(); };

  const SUGGEST = ['날씨에 관한 예제', '똑똑이 화분', '다가가면 열리는 쓰레기통', '키패드 전자 피아노', '가스 누출 경보기', '주차 거리 경고기', '비밀번호 도어락', '자동 블라인드'];
  $('suggest').innerHTML = SUGGEST.map(s => `<button type="button">${s}</button>`).join('');
  $('suggest').onclick = e => { if (e.target.tagName === 'BUTTON') { $('prompt').value = e.target.textContent; $('prompt').focus(); } };

  // ---------- 코드 편집기 ----------
  const cmOpts = { lineNumbers: true, matchBrackets: true, autoCloseBrackets: true, indentUnit: 4, tabSize: 4, lineWrapping: false, extraKeys: { Tab: cm => cm.replaceSelection('    ') } };
  const edMC = CodeMirror($('editor-mc'), Object.assign({ mode: 'javascript' }, cmOpts));
  const edPY = CodeMirror($('editor-py'), Object.assign({ mode: 'python' }, cmOpts));
  const darkCM = () => (document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)) ? 'material-darker' : 'default';
  function refreshEditors() { [edMC, edPY].forEach(e => { e.setOption('theme', darkCM()); e.refresh(); }); }
  let blocksDirty = true, blocksTimer = 0;
  edMC.on('change', (cm, ch) => { if (ch.origin === 'setValue' || !state.ex) return; state.ex.makecode = cm.getValue(); blocksDirty = true; saveCurrent(); });
  edPY.on('change', (cm, ch) => { if (ch.origin === 'setValue' || !state.ex) return; state.ex.micropython = cm.getValue(); saveCurrent(); });
  new MutationObserver(refreshEditors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function showCodeView() {
    const mc = state.lang === 'makecode';
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
    $('code-tabs').querySelectorAll('[data-tab]').forEach(b => { b.hidden = !mc; b.classList.toggle('on', b.dataset.tab === state.tab); });
    $('blocks-view').hidden = !(mc && state.tab === 'blocks');
    $('editor-mc').hidden = !(mc && state.tab === 'js');
    $('editor-py').hidden = mc;
    $('btn-open-editor').textContent = mc ? 'MakeCode 에서 열기 ↗' : 'Python 편집기 ↗';
    if (mc && state.tab === 'blocks' && blocksDirty) renderBlocks();
    setTimeout(refreshEditors, 0);
  }
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    if (state.lang === b.dataset.lang) return;
    stopAll();
    state.lang = b.dataset.lang; store.set('mgka.lang', state.lang);
    showCodeView();
  });
  $('code-tabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; showCodeView(); });

  async function renderBlocks() {
    if (!state.ex) return;
    blocksDirty = false;
    const view = $('blocks-view');
    const code = state.ex.makecode;
    view.innerHTML = '<div class="muted center pad"><span class="spin"></span>블록 그리는 중… (makecode.microbit.org)</div>';
    clearTimeout(blocksTimer);
    try {
      const r = await MCBlocks.render(code);
      if (state.ex.makecode !== code) return;
      const img = new Image();
      img.alt = 'MakeCode 블록';
      img.src = r.uri || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg));
      if (r.width) img.width = Math.min(r.width, 1600);
      view.innerHTML = '';
      view.appendChild(img);
    } catch (e) {
      view.innerHTML = `<div class="muted center pad">블록을 그릴 수 없습니다: ${esc(e.message)}<br>JavaScript 탭에서 코드를 확인하세요.</div>`;
    }
  }

  // ---------- 예제 적용 ----------
  function saveCurrent() { if (state.ex) store.set('mgka.current', state.ex); }

  function renderInfo(ex) {
    const w = (ex.warnings || []).map(x => `<p class="warn">⚠ ${esc(x)}</p>`).join('');
    const oledPy = ex.components.some(c => c.type === 'oled');
    $('ex-info').innerHTML = `
      <p><b>${esc(ex.title)}</b> — ${esc(ex.summary)}</p>
      ${ex.howToTest && ex.howToTest.length ? `<p><b>시험 방법</b></p><ol style="margin:0 0 4px;padding-left:18px">${ex.howToTest.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
      ${w}
      <div class="tags">${(ex.learn || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      ${oledPy && state.lang === 'python' ? '<a class="tag" href="device/oled.py" download>실제 장치용 oled.py 받기</a>' : ''}</div>`;
  }

  function applyExample(ex, opts) {
    opts = opts || {};
    stopAll();
    state.ex = ex;
    $('ex-title').textContent = ex.title;
    edMC.setValue(ex.makecode || ''); edPY.setValue(ex.micropython || '');
    blocksDirty = true;
    Stage.setup($('stage'), $('kit-controls'), ex.components);
    renderInfo(ex);
    showCodeView();
    saveCurrent();
    if (opts.run) setTimeout(runCode, 200);
  }

  // ---------- 실행 ----------
  function stopAll() { MCRT.stop(); RT.stop(); }
  async function runCode() {
    if (!state.ex) return;
    $('serial').textContent = '';
    if (state.lang === 'makecode') await MCRT.run(edMC.getValue());
    else { MCRT.stop(); await RT.run(edPY.getValue()); }
  }
  $('btn-run').onclick = runCode;
  $('btn-stop').onclick = () => { stopAll(); setStatus('stopped'); };

  function setStatus(s) {
    const el = $('run-status');
    const map = { running: '실행 중', done: '끝남', stopped: '멈춤', error: '오류', repl: 'REPL' };
    el.textContent = map[s] || s;
    el.className = 'status ' + (s === 'running' ? 'running' : s === 'error' ? 'error' : '');
  }
  MB.on('status', setStatus);

  // 시리얼
  let serialBuf = '';
  MB.on('serial', t => {
    serialBuf += String(t).replace(/\r\n/g, '\n').replace(/\r/g, '');
    if (serialBuf.length > 20000) serialBuf = serialBuf.slice(-15000);
    const el = $('serial');
    el.textContent = serialBuf;
    el.scrollTop = el.scrollHeight;
  });
  $('btn-serial-clear').onclick = () => { serialBuf = ''; $('serial').textContent = ''; };
  $('serial-form').onsubmit = e => {
    e.preventDefault();
    const v = $('serial-input').value;
    RT.sendSerial(v + '\n');
    MB.emit('serial', '> ' + v + '\r\n');
    $('serial-input').value = '';
  };

  // micro:bit 내장 센서
  const bindRange = (id, fmt, fn) => { const r = $(id), o = $(id + '-v'); r.oninput = () => { o.textContent = fmt(r.value); fn(+r.value); }; };
  bindRange('mb-temp', v => v + '°C', v => { MB.temperature = v; });
  bindRange('mb-light', v => v, v => { MB.light = v; });
  bindRange('mb-roll', v => v + '°', v => MB.sensors.setManual({ roll: v }));
  bindRange('mb-pitch', v => v + '°', v => MB.sensors.setManual({ pitch: v }));
  $('mb-shake').onclick = () => MB.sensors.shake(800);
  $('mb-ab').onpointerdown = () => { MB.input('a', true); MB.input('b', true); };
  $('mb-ab').onpointerup = $('mb-ab').onpointerleave = () => { if (MB.buttons.a.down) { MB.input('a', false); MB.input('b', false); } };

  // ---------- 복사 · 저장 · 편집기 ----------
  const curCode = () => (state.lang === 'makecode' ? edMC.getValue() : edPY.getValue());
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
  }
  $('btn-copy').onclick = async () => toast((await copy(curCode())) ? '코드를 복사했습니다' : '복사하지 못했습니다');
  $('btn-download').onclick = () => {
    const mc = state.lang === 'makecode';
    const blob = new Blob([curCode()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = mc ? 'main.ts' : 'main.py';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (!mc && /\bimport oled\b/.test(curCode())) toast('OLED 를 쓰는 코드입니다. 실제 장치에는 oled.py 도 함께 넣으세요 (예제 정보의 링크)', 5000);
  };
  $('btn-open-editor').onclick = async () => {
    const code = curCode();
    await copy(code);
    if (state.lang === 'makecode') MCBlocks.openEditor(code, state.ex && state.ex.title);
    else { window.open('https://python.microbit.org/v/3', '_blank', 'noopener'); toast('코드를 복사했습니다. Python 편집기에 붙여 넣으세요', 4500); }
  };

  // ---------- 에이전트 ----------
  const log = $('agent-log');
  function addMsg(cls, html) {
    const d = document.createElement('div');
    d.className = 'msg ' + (cls || '');
    d.innerHTML = html;
    log.appendChild(d);
    d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return d;
  }
  function providerLabel(p) { return (Agent.providers[p] && Agent.providers[p].label) || p; }

  // 만든 예제 카드 (여러 개일 때는 「열기」 버튼으로 바꿔 볼 수 있음)
  function resultCard(el, ex, i, n) {
    el.className = 'msg';
    el.innerHTML = `<h4>✅ ${n > 1 ? `${i + 1}/${n} · ` : ''}${esc(ex.title)}</h4><div>${esc(ex.summary)}</div>
      <div class="small muted">구성품: ${ex.components.map(c => `${KIT.byId[c.type].name}(${Object.values(c.pins).join('/') || 'I2C'})`).join(', ')} · ${esc(providerLabel(ex.source))}</div>
      ${(ex.warnings || []).map(w => `<div class="small warn">⚠ ${esc(w)}</div>`).join('')}
      ${n > 1 ? '<div class="row" style="margin-top:6px"><button class="btn sm" data-open>▶ 이 예제 열기</button></div>' : ''}`;
    const b = el.querySelector('[data-open]');
    if (b) b.onclick = () => { applyExample(ex, { run: true }); markOpen(el); };
  }
  function markOpen(el) {
    log.querySelectorAll('.msg.open').forEach(m => m.classList.remove('open'));
    el.classList.add('open');
  }

  async function generate() {
    if (state.busy) return;
    const prompt = $('prompt').value.trim();
    const selected = [...state.selected];
    if (!prompt && !selected.length) { toast('만들고 싶은 것을 적거나 구성품을 골라 주세요'); $('prompt').focus(); return; }
    const modify = $('chk-modify').checked && state.ex;
    const n = Math.max(1, Math.min(5, parseInt($('gen-count').value, 10) || 1));
    $('gen-count').value = n; store.set('mgka.count', n);
    const s = Agent.Settings.load();
    addMsg('user', esc(prompt || '(선택한 구성품으로 만들기)') + (n > 1 ? ` <span class="small muted">· ${n}개</span>` : '') +
      (selected.length ? `<br><span class="small muted">구성품: ${selected.map(t => KIT.byId[t].name).join(', ')}</span>` : '') + (modify ? '<br><span class="small muted">↳ 현재 예제 고치기</span>' : ''));
    const ctrl = new AbortController();
    state.busy = ctrl;
    $('btn-generate').disabled = true; $('btn-cancel').hidden = false;
    const made = [];
    const current = modify ? state.ex : null;
    try {
      for (let i = 0; i < n; i++) {
        const work = addMsg('', `<span class="spin"></span>${n > 1 ? `<b>${i + 1}/${n}</b> ` : ''}${esc(providerLabel(s.provider))} 로 예제를 만드는 중… <div class="stream"></div>`);
        const stream = work.querySelector('.stream');
        try {
          const ex = await Agent.generate({
            prompt, selected, lang: state.lang, current,
            variant: { i, n }, avoid: made.map(e => e.title), skip: made.map(e => e.recipe || 'compose'),
          }, {
            signal: ctrl.signal,
            onText: t => { stream.textContent = (stream.textContent + t).slice(-400); },
          });
          ex.prompt = prompt;
          ex.created = Date.now();
          made.push(ex);
          resultCard(work, ex, i, n);
          addHistory(ex);
          // 첫 예제는 바로 열어 실행, 나머지는 카드에서 골라 열기
          if (i === 0) { applyExample(ex, { run: true }); if (n > 1) markOpen(work); }
        } catch (e) {
          work.className = 'msg err';
          if (e.name === 'AbortError') { work.innerHTML = '취소했습니다.'; break; }
          work.innerHTML = `⚠ ${n > 1 ? `${i + 1}/${n}: ` : ''}${esc(e.message || e)}` +
            (s.provider !== 'offline' ? '<br><button class="btn sm" data-offline>오프라인 내장 예제로 만들기</button> <button class="btn sm" data-settings>설정 열기</button>' : '');
          const off = work.querySelector('[data-offline]');
          if (off) off.onclick = async () => {
            const exs = KitTemplates.generateMany(prompt, selected, n - made.length);
            exs.forEach((ex, k) => {
              ex.prompt = prompt; ex.created = Date.now(); ex.source = 'offline';
              ex.warnings = AgentPrompt.check(ex, []);
              const el = addMsg('', '');
              resultCard(el, ex, k, exs.length);
              addHistory(ex);
              if (k === 0) { applyExample(ex, { run: true }); if (exs.length > 1) markOpen(el); }
            });
          };
          const st = work.querySelector('[data-settings]');
          if (st) st.onclick = openSettings;
          break; // 같은 오류가 반복될 가능성이 높으므로 남은 예제는 만들지 않음
        }
      }
      if (made.length) $('chk-modify').checked = false;
    } finally {
      state.busy = null;
      $('btn-generate').disabled = false; $('btn-cancel').hidden = true;
    }
  }
  $('gen-count').value = store.get('mgka.count', 1);
  $('btn-generate').onclick = generate;
  $('btn-cancel').onclick = () => state.busy && state.busy.abort();
  $('prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate(); });

  // 기록
  function addHistory(ex) {
    const h = store.get('mgka.history', []);
    h.unshift(ex);
    store.set('mgka.history', h.slice(0, 30));
    renderHistory();
  }
  function renderHistory() {
    const h = store.get('mgka.history', []);
    $('history-count').textContent = h.length ? `(${h.length})` : '';
    $('history').innerHTML = h.length ? '' : '<li class="muted small">아직 없습니다</li>';
    h.forEach((ex, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = `${esc(ex.title)}<small>${esc(ex.prompt || ex.components.map(c => KIT.byId[c.type].name).join(', '))} · ${new Date(ex.created || 0).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>`;
      b.onclick = () => applyExample(h[i], { run: true });
      li.appendChild(b);
      $('history').appendChild(li);
    });
  }
  function renderGallery() {
    $('gallery').innerHTML = '';
    for (const r of KitTemplates.RECIPES) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = `${esc(r.title)}<small>${r.parts.map(t => KIT.byId[t].name).join(' + ')}</small>`;
      b.onclick = () => applyExample(KitTemplates.fromRecipe(r), { run: true });
      li.appendChild(b);
      $('gallery').appendChild(li);
    }
  }

  // ---------- 설정 ----------
  const dlg = $('settings'), form = $('settings-form');
  function fillSettings() {
    const s = Agent.Settings.load();
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') el.checked = el.value === s.provider;
      else if (s[el.name] !== undefined) el.value = s[el.name];
    }
    showPv(s.provider);
  }
  function showPv(p) { form.querySelectorAll('.pv').forEach(d => { d.hidden = d.dataset.pv !== p; }); }
  form.addEventListener('change', e => { if (e.target.name === 'provider') showPv(e.target.value); });
  function readForm() {
    const s = Agent.Settings.load();
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) s.provider = el.value; } else s[el.name] = el.value.trim();
    }
    return s;
  }
  function openSettings() { fillSettings(); $('bridge-state').textContent = ''; dlg.showModal(); }
  $('btn-settings').onclick = openSettings;
  $('provider-chip').onclick = openSettings;
  dlg.addEventListener('close', () => {
    if (dlg.returnValue === 'save') { Agent.Settings.save(readForm()); toast('설정을 저장했습니다'); updateProviderChip(); }
  });
  $('btn-clear-keys').onclick = () => { Agent.Settings.clearKeys(); fillSettings(); toast('저장된 API 키를 모두 지웠습니다'); };
  form.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => toast((await copy(b.dataset.copy)) ? '명령을 복사했습니다' : '복사하지 못했습니다'));
  $('btn-test-bridge').onclick = async () => {
    const st = $('bridge-state');
    st.textContent = '확인 중…';
    try {
      const h = await Agent.providers['claude-cli'].health(readForm());
      st.innerHTML = h.ok ? `✅ 연결됨 — ${esc(h.claude)}` : `⚠ ${esc(h.error)}`;
    } catch (e) { st.textContent = '❌ 연결 안 됨 — 브리지를 실행했는지 확인하세요'; }
  };

  // 상단 상태 칩 + Claude CLI 브리지 안내. 브리지가 꺼져 있으면 켜질 때까지 몇 초마다 다시 확인
  let cliPoll = 0;
  async function updateProviderChip() {
    const s = Agent.Settings.load();
    const name = { 'claude-cli': 'Claude CLI', anthropic: 'Claude API · ' + s.anthropicModel.replace('claude-', ''), openai: 'OpenAI · ' + s.openaiModel, gemini: 'Gemini · ' + s.geminiModel, offline: '오프라인 예제' }[s.provider];
    const dot = $('provider-chip').querySelector('.dot');
    let label = name, ok = null;
    clearTimeout(cliPoll);
    if (s.provider === 'claude-cli') {
      try {
        const h = await Agent.providers['claude-cli'].health(s);
        ok = !!h.ok;
        label = ok ? 'Claude CLI · 연결됨' : 'Claude CLI · 오류';
        $('provider-chip').title = ok ? 'Claude CLI 브리지 연결됨: ' + h.claude : h.error;
      } catch (_) {
        ok = false;
        label = 'Claude CLI · 브리지 꺼짐';
        $('provider-chip').title = 'Claude CLI 브리지가 꺼져 있습니다 — 에이전트 칸의 안내를 확인하세요';
      }
      if (!ok) cliPoll = setTimeout(updateProviderChip, document.hidden ? 15000 : 4000);
    } else if (s.provider === 'offline') ok = 'warn';
    else ok = !!(s.provider === 'anthropic' ? s.anthropicKey : s.provider === 'openai' ? s.openaiKey : s.geminiKey);
    if (ok === false && s.provider !== 'claude-cli') label = name + ' · 키 없음';
    dot.className = 'dot ' + (ok === 'warn' ? 'warn' : ok ? 'ok' : 'bad');
    $('provider-name').textContent = label;
    $('agent-provider-note').textContent = label;
    const local = Agent.providers['claude-cli'].isLocalPage();
    $('cli-banner').querySelectorAll('[data-remote-only]').forEach(e => { e.hidden = local; });
    const wasHidden = $('cli-banner').hidden;
    $('cli-banner').hidden = !(s.provider === 'claude-cli' && !ok);
    if (!wasHidden && $('cli-banner').hidden && ok) toast('Claude CLI 브리지에 연결되었습니다');
  }
  $('cli-banner').querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => toast((await copy(b.dataset.copy)) ? '명령을 복사했습니다. 터미널에 붙여 넣고 Enter' : '복사하지 못했습니다'));
  $('btn-cli-retry').onclick = async () => {
    $('cli-retry-state').textContent = '확인 중…';
    await updateProviderChip();
    $('cli-retry-state').textContent = $('cli-banner').hidden ? '' : '아직 연결되지 않았습니다';
  };
  $('btn-cli-offline').onclick = () => {
    const st = Agent.Settings.load(); st.provider = 'offline'; Agent.Settings.save(st);
    updateProviderChip(); toast('오프라인 예제로 바꿨습니다. 설정에서 언제든 Claude CLI 로 되돌릴 수 있어요');
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Agent.Settings.load().provider === 'claude-cli') updateProviderChip(); });

  // ---------- 튜토리얼 동작 ----------
  function setSensor(type, v) {
    const d = MB.kit.find(type);
    if (!d) return;
    MB.kit.set(d, v);
    Stage.buildControls($('kit-controls'));
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tut]');
    if (!b) return;
    const a = b.dataset.tut;
    const go = () => { if (location.hash !== '#workspace') location.hash = 'workspace'; };
    if (a === 'go') go();
    if (a === 'parts') {
      go(); state.selected = new Set(['light', 'led']); store.set('mgka.selected', [...state.selected]); buildParts();
      $('prompt').value = '';
      const ex = KitTemplates.generate('', ['light', 'led']); ex.created = Date.now();
      addMsg('user', '(선택한 구성품으로 만들기)<br><span class="small muted">구성품: 조도 센서, LED</span>');
      addMsg('', `<h4>✅ ${esc(ex.title)}</h4><div>${esc(ex.summary)}</div><div class="small muted">오프라인 내장 예제</div>`);
      addHistory(ex); applyExample(ex, { run: true });
    }
    if (a === 'dark' || a === 'day') { go(); setSensor('light', a === 'dark' ? 100 : 800); }
    if (a === 'python' || a === 'makecode') {
      go(); state.lang = a; state.tab = 'blocks'; store.set('mgka.lang', a); showCodeView(); runCode();
    }
    if (a === 'weather') {
      go(); $('prompt').value = '날씨에 관한 예제';
      const s = Agent.Settings.load();
      if (s.provider === 'offline' || s.provider === 'claude-cli') {
        const ex = KitTemplates.generate('날씨에 관한 예제', []); ex.prompt = '날씨에 관한 예제'; ex.created = Date.now();
        addMsg('user', '날씨에 관한 예제');
        addMsg('', `<h4>✅ ${esc(ex.title)}</h4><div>${esc(ex.summary)}</div><div class="small muted">오프라인 내장 예제 (LLM 으로 만들려면 「예제 만들기」)</div>`);
        addHistory(ex); applyExample(ex, { run: true });
      } else generate();
    }
    if (a === 'settings') openSettings();
    if (a === 'modify') { go(); $('chk-modify').checked = true; $('prompt').value = 'OLED 에 토양 수분 값도 함께 보여 줘'; $('prompt').focus(); }
    if (a === 'guide-real') location.hash = 'g-real';
  });

  // ---------- 다른 앱에서 프롬프트 넘기기: #prompt=... ----------
  function readHashPrompt() {
    const m = location.hash.match(/^#prompt=(.+)$/);
    if (m) { $('prompt').value = decodeURIComponent(m[1]); location.hash = 'workspace'; }
  }

  // ---------- 시작 ----------
  async function init() {
    Docs.render();
    buildParts();
    renderHistory();
    renderGallery();
    readHashPrompt();
    route();
    updateProviderChip();
    try { await RT.loadLibs(); } catch (e) { toast('MicroPython 라이브러리를 불러오지 못했습니다: ' + e.message, 6000); }
    const saved = store.get('mgka.current', null);
    const ex = saved && saved.components ? saved : KitTemplates.fromRecipe(KitTemplates.RECIPES[0]);
    applyExample(ex);
    addMsg('', '안녕하세요! 만들고 싶은 것을 적거나 <b>구성품</b>을 골라 「✨ 예제 만들기」를 누르세요. 처음이라면 상단 <a href="#tutorial">튜토리얼</a>부터 따라 해 보세요.');
  }
  window.App = { state, applyExample, runCode, stopAll };
  init();
})();
