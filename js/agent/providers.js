// LLM 제공자: Claude CLI(로컬 브리지) · Anthropic API · OpenAI · Google Gemini · 오프라인(내장 예제)
// API 키는 이 브라우저의 localStorage 에만 저장되고, 각 제공자 서버로만 직접 전송됨
(function () {
  const KEY = 'mgka.settings';
  const DEFAULTS = {
    provider: 'claude-cli',
    bridgeUrl: 'http://127.0.0.1:8787',
    cliModel: '',
    anthropicKey: '', anthropicModel: 'claude-opus-5-5', effort: 'medium',
    openaiKey: '', openaiModel: 'gpt-5',
    geminiKey: '', geminiModel: 'gemini-2.5-flash',
  };

  const Settings = {
    load() {
      try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return Object.assign({}, DEFAULTS); }
    },
    save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} },
    clearKeys() {
      const s = Settings.load();
      s.anthropicKey = s.openaiKey = s.geminiKey = '';
      Settings.save(s);
      return s;
    },
    DEFAULTS,
  };

  const P = {};

  // ---------- Claude CLI (로컬 브리지: bridge/claude-bridge.mjs) ----------
  // 브리지가 웹앱도 함께 열어 주므로, 그 주소(127.0.0.1:8787)에서 열었으면 같은 출처로 바로 연결
  // (https 공개 사이트 → http 로컬 주소 요청은 브라우저가 막거나 권한을 물음)
  const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
  let sameOrigin = null; // null: 아직 모름
  async function bridgeBase(s) {
    if (LOOPBACK && sameOrigin === null) {
      try { const r = await fetch('/health', { cache: 'no-store' }); sameOrigin = r.ok && !!(await r.json()).bridge; } catch (_) { sameOrigin = false; }
    }
    return sameOrigin ? location.origin : s.bridgeUrl.replace(/\/$/, '');
  }
  P['claude-cli'] = {
    label: 'Claude CLI (내 컴퓨터의 Claude 로그인)',
    isLocalPage: () => LOOPBACK,
    async health(s) {
      const r = await fetch((await bridgeBase(s)) + '/health', { method: 'GET', cache: 'no-store' });
      if (!r.ok) throw new Error('브리지 응답 ' + r.status);
      return r.json();
    },
    async generate({ system, user, onText, signal }, s) {
      let r;
      try {
        r = await fetch((await bridgeBase(s)) + '/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
          body: JSON.stringify({ system, prompt: user, model: s.cliModel || undefined }),
        });
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        throw new Error('Claude CLI 브리지에 연결할 수 없습니다. 터미널에서 "npx -y github:samcho93/microbit-genius-agent" 를 실행해 브리지를 켜 주세요. (사용법 메뉴 참고)');
      }
      if (!r.ok) throw new Error('브리지 오류 ' + r.status + ': ' + (await r.text()).slice(0, 300));
      // NDJSON 스트림: {type:'text', text} … {type:'done', text} | {type:'error', message}
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', final = null, acc = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line) continue;
          let m; try { m = JSON.parse(line); } catch (_) { continue; }
          if (m.type === 'text') { acc += m.text; onText && onText(m.text); }
          else if (m.type === 'done') final = m.text;
          else if (m.type === 'error') throw new Error(m.message || 'Claude CLI 오류');
        }
      }
      return final !== null ? final : acc;
    },
  };

  // ---------- Anthropic API (공식 TypeScript SDK, 브라우저에서 직접 호출) ----------
  let anthropicMod = null;
  P.anthropic = {
    label: 'Anthropic API 키',
    async generate({ system, user, onText, signal }, s) {
      if (!s.anthropicKey) throw new Error('설정에서 Anthropic API 키를 입력해 주세요.');
      if (!anthropicMod) anthropicMod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.130.0/+esm');
      const Anthropic = anthropicMod.default || anthropicMod.Anthropic;
      const client = new Anthropic({ apiKey: s.anthropicKey, dangerouslyAllowBrowser: true });
      const model = s.anthropicModel || 'claude-opus-5-5';
      const params = {
        model, max_tokens: 32000,
        system, messages: [{ role: 'user', content: user }],
      };
      if (!/haiku/.test(model)) params.output_config = { effort: s.effort || 'medium' };
      // 안전 분류기가 거절하면 다른 모델로 서버에서 다시 시도 (Opus 5.5 / Sonnet 5.5)
      const withFallback = /claude-(opus-5-5|sonnet-5-5|opus-5|fable)/.test(model);
      const run = async useFallback => {
        const req = useFallback ? Object.assign({}, params, { fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] }) : params;
        const stream = useFallback ? client.beta.messages.stream(req, { signal }) : client.messages.stream(req, { signal });
        stream.on('text', t => onText && onText(t));
        return stream.finalMessage();
      };
      let msg;
      try {
        msg = await run(withFallback);
      } catch (e) {
        if (withFallback && e && e.status === 400 && /fallback/i.test(e.message || '')) msg = await run(false);
        else if (e instanceof Anthropic.AuthenticationError) throw new Error('Anthropic API 키가 올바르지 않습니다.');
        else if (e instanceof Anthropic.RateLimitError) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도하세요.');
        else throw e;
      }
      if (msg.stop_reason === 'refusal') throw new Error('모델이 요청을 거절했습니다. 다른 표현으로 요청해 보세요.');
      if (msg.stop_reason === 'max_tokens') throw new Error('응답이 너무 길어 잘렸습니다. 요청을 더 간단히 해 보세요.');
      return msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    },
  };

  // ---------- OpenAI ----------
  P.openai = {
    label: 'OpenAI API 키',
    async generate({ system, user, signal }, s) {
      if (!s.openaiKey) throw new Error('설정에서 OpenAI API 키를 입력해 주세요.');
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.openaiKey },
        body: JSON.stringify({
          model: s.openaiModel || 'gpt-5',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_object' },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('OpenAI 오류 ' + r.status + ': ' + ((j.error && j.error.message) || ''));
      return j.choices[0].message.content;
    },
  };

  // ---------- Google Gemini ----------
  P.gemini = {
    label: 'Google Gemini API 키',
    async generate({ system, user, signal }, s) {
      if (!s.geminiKey) throw new Error('설정에서 Gemini API 키를 입력해 주세요.');
      const model = encodeURIComponent(s.geminiModel || 'gemini-2.5-flash');
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Gemini 오류 ' + r.status + ': ' + ((j.error && j.error.message) || ''));
      return j.candidates[0].content.parts.map(p => p.text || '').join('');
    },
  };

  // ---------- 오프라인 (내장 예제) ----------
  P.offline = { label: '오프라인 (내장 예제 · 키 없이)' };

  // 예제 만들기: req = { prompt, selected, lang, current }
  async function generate(req, hooks) {
    const s = Settings.load();
    hooks = hooks || {};
    const provider = req.provider || s.provider;
    if (provider === 'offline') {
      const ex = KitTemplates.generate(req.prompt, req.selected, req.skip);
      ex.warnings = AgentPrompt.check(ex, []);
      ex.source = 'offline';
      return ex;
    }
    const p = P[provider];
    if (!p) throw new Error('알 수 없는 제공자: ' + provider);
    const system = AgentPrompt.systemPrompt();
    const user = AgentPrompt.userPrompt(req);
    const text = await p.generate({ system, user, onText: hooks.onText, signal: hooks.signal }, s);
    const obj = AgentPrompt.extractJson(text);
    const ex = AgentPrompt.normalize(obj, req.selected);
    ex.source = provider;
    return ex;
  }

  window.Agent = { Settings, providers: P, generate };
})();
