// 제공자별 사용 가능한 모델 목록: 사용자 키로 각 회사의 "모델 목록" API 를 불러와 드롭다운에 씀
// (모델은 자주 바뀌므로 고정 목록 대신 실제 목록을 우선, 키가 없을 때만 기본 목록)
(function () {
  const FALLBACK = {
    anthropic: [
      ['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (빠름)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (가장 빠름·저렴)'],
      ['claude-fable-5-1', 'Claude Fable 5.1 (최고 성능·고가)'], ['claude-opus-5', 'Claude Opus 5'], ['claude-sonnet-5', 'Claude Sonnet 5'], ['claude-opus-4-8', 'Claude Opus 4.8'],
    ],
    'claude-cli': [
      ['', 'CLI 기본값 (claude 설정을 따름)'], ['opus', 'opus (최신 Opus)'], ['sonnet', 'sonnet (최신 Sonnet)'], ['haiku', 'haiku (최신 Haiku)'],
      ['claude-opus-5-5', 'claude-opus-5-5'], ['claude-sonnet-5-5', 'claude-sonnet-5-5'], ['claude-haiku-5-5', 'claude-haiku-5-5'], ['claude-fable-5-1', 'claude-fable-5-1'],
    ],
    openai: [['gpt-5', 'gpt-5'], ['gpt-5-mini', 'gpt-5-mini'], ['gpt-4.1', 'gpt-4.1']],
    gemini: [['gemini-2.5-flash', 'Gemini 2.5 Flash'], ['gemini-2.5-pro', 'Gemini 2.5 Pro'], ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite']],
  };
  const KEY = p => 'mgka.models.' + p;
  const cacheGet = p => { try { return JSON.parse(localStorage.getItem(KEY(p)) || 'null'); } catch (_) { return null; } };
  const cacheSet = (p, list) => { try { localStorage.setItem(KEY(p), JSON.stringify({ at: Date.now(), list })); } catch (_) {} };

  // ---------- 실제 목록 불러오기 ----------
  let anthropicMod = null;
  async function fetchAnthropic(key) {
    if (!anthropicMod) anthropicMod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.130.0/+esm');
    const Anthropic = anthropicMod.default || anthropicMod.Anthropic;
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    const out = [];
    for await (const m of client.models.list({ limit: 100 })) out.push({ id: m.id, label: m.display_name || m.id, created: Date.parse(m.created_at) || 0 });
    return out.sort((a, b) => b.created - a.created);
  }
  async function fetchOpenAI(key) {
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + key } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('OpenAI ' + r.status + ': ' + ((j.error && j.error.message) || ''));
    // 글을 쓰는 채팅 모델만 (음성·이미지·임베딩·검색 전용 등 제외)
    const ok = id => /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|tts|transcribe|whisper|image|dall|embedding|moderation|search|instruct|codex|computer|-preview-\d{4})/.test(id);
    return (j.data || []).filter(m => ok(m.id)).map(m => ({ id: m.id, label: m.id, created: (m.created || 0) * 1000 })).sort((a, b) => b.created - a.created);
  }
  async function fetchGemini(key) {
    const out = [];
    let page = '';
    for (let i = 0; i < 5; i++) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { headers: { 'x-goog-api-key': key } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + ((j.error && j.error.message) || ''));
      for (const m of j.models || []) {
        const id = String(m.name || '').replace(/^models\//, '');
        if (!(m.supportedGenerationMethods || []).includes('generateContent')) continue;
        if (!/^gemini/.test(id) || /(embedding|aqa|image|tts|audio|live|vision|robotics|computer)/.test(id)) continue;
        out.push({ id, label: `${m.displayName || id} (${id})`, created: 0 });
      }
      page = j.nextPageToken;
      if (!page) break;
    }
    // 번호가 큰(최신) 모델 먼저, 같은 세대에서는 정식판 먼저
    const ver = id => { const m = id.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
    return out.sort((a, b) => ver(b.id) - ver(a.id) || /preview|exp/.test(a.id) - /preview|exp/.test(b.id) || a.id.localeCompare(b.id));
  }

  // 추천 모델: 목록에 있는 것 중 품질·속도 균형이 좋은 것
  function recommended(provider, list) {
    const ids = list.map(m => m.id);
    const pick = (...cands) => cands.find(c => ids.includes(c));
    if (provider === 'anthropic') return pick('claude-opus-5-5', 'claude-sonnet-5-5') || (ids.find(i => /opus/.test(i)) || ids[0]);
    if (provider === 'openai') return ids.find(i => /^gpt-\d/.test(i) && !/(mini|nano)/.test(i)) || ids[0];
    if (provider === 'gemini') return ids.find(i => /flash/.test(i) && !/(lite|preview|exp)/.test(i)) || ids.find(i => /flash/.test(i)) || ids[0];
    return ids[0];
  }

  const fallbackList = p => (FALLBACK[p] || []).map(([id, label]) => ({ id, label, created: 0 }));

  // 저장된 목록(있으면) 또는 기본 목록
  function current(provider) {
    const c = cacheGet(provider);
    return c && c.list && c.list.length ? { list: c.list, live: true, at: c.at } : { list: fallbackList(provider), live: false };
  }

  async function refresh(provider, key) {
    if (!key) throw new Error('API 키를 먼저 입력하세요');
    const f = { anthropic: fetchAnthropic, openai: fetchOpenAI, gemini: fetchGemini }[provider];
    if (!f) return fallbackList(provider);
    const list = await f(key);
    if (!list.length) throw new Error('사용할 수 있는 모델이 없습니다');
    cacheSet(provider, list);
    return list;
  }

  window.Models = { FALLBACK, current, refresh, recommended, fallbackList };
})();
