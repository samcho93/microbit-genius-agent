#!/usr/bin/env node
// Claude CLI 브리지 — 배포된 웹앱(브라우저)이 내 컴퓨터의 Claude Code CLI 로그인으로 예제를 만들 수 있게 해 줌
//
// 실행:  npx -y github:samcho93/microbit-genius-agent          (설치 없이 바로)
//        node bridge/claude-bridge.mjs [--port 8787] [--origin https://example.com] [--no-open]
//
// 웹앱도 같은 주소(http://127.0.0.1:8787/)에서 함께 열어 줌 → 브라우저의 "공개 사이트 → 로컬 주소" 차단
// (Chrome 로컬 네트워크 접근 제한, Safari 혼합 콘텐츠 차단)을 피할 수 있음. 시작하면 브라우저를 자동으로 엶.
//
// - 127.0.0.1 에서만 열림 (다른 컴퓨터에서 접근 불가)
// - 허용한 웹 주소(Origin)에서 온 요청만 처리
// - claude -p 를 도구 없이(--tools "") 실행하므로 파일을 읽거나 명령을 실행하지 않음
// - 의존 패키지 없음 (Node.js 18+ 내장 모듈만 사용)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // 웹앱 파일이 있는 저장소 루트
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.py': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

// 정적 파일 (웹앱). 저장소 밖 경로와 bridge·숨김 파일은 막음
function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(ROOT, '.' + path);
  if (!file.startsWith(ROOT + sep) || /[\/]\./.test(path) || path.startsWith('/bridge/') || path.startsWith('/node_modules/')) { res.writeHead(404); res.end('not found'); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('dir');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(file));
  } catch (_) { res.writeHead(404); res.end('not found'); }
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PORT = +opt('port', process.env.MGKA_PORT || 8787);
const EXTRA = (opt('origin', process.env.MGKA_ORIGIN || '')).split(',').filter(Boolean);
const ALLOWED = ['https://samcho93.github.io', ...EXTRA];
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const isWin = process.platform === 'win32';

const originOk = o => !o || ALLOWED.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

function cors(req, res) {
  const o = req.headers.origin;
  if (o && originOk(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
}

// 따옴표 처리 (Windows 는 shell 로 실행하므로)
const q = s => (isWin ? `"${String(s).replace(/"/g, '\\"')}"` : s);

function runClaude(args, input, onLine) {
  return new Promise((resolve, reject) => {
    // Windows 의 claude 는 .cmd 이므로 셸로 실행 (인자는 직접 따옴표 처리한 한 줄 명령)
    const p = isWin
      ? spawn([CLAUDE, ...args.map(q)].join(' '), { shell: true, windowsHide: true })
      : spawn(CLAUDE, args, { windowsHide: true });
    let err = '', buf = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) onLine(l); }
    });
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => { if (buf.trim()) onLine(buf); code === 0 ? resolve() : reject(new Error(err.trim() || 'claude 종료 코드 ' + code)); });
    if (input !== null) { p.stdin.write(input); p.stdin.end(); }
    return p;
  });
}

let version = null;
async function claudeVersion() {
  if (version) return version;
  let out = '';
  await runClaude(['--version'], null, l => { out += l; });
  version = out.trim();
  return version;
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const o = req.headers.origin;
  if (o && !originOk(o)) { res.writeHead(403); res.end('origin not allowed'); return; }
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/health') {
    try {
      const v = await claudeVersion();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, claude: v, bridge: '1.0.0' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'claude CLI 를 찾지 못했습니다: ' + e.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.setEncoding('utf8');
    for await (const c of req) { body += c; if (body.length > 2e6) { res.writeHead(413); res.end(); return; } }
    let j;
    try { j = JSON.parse(body); } catch (_) { res.writeHead(400); res.end('bad json'); return; }
    if (!j.prompt) { res.writeHead(400); res.end('prompt required'); return; }

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
    const send = m => res.write(JSON.stringify(m) + '\n');
    const dir = mkdtempSync(join(tmpdir(), 'mgka-'));
    const sysFile = join(dir, 'system.txt');
    writeFileSync(sysFile, String(j.system || ''), 'utf8');
    const cliArgs = ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
      '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--system-prompt-file', sysFile];
    if (j.model && /^[\w.\-[\]]+$/.test(j.model)) cliArgs.push('--model', j.model);
    let result = null, streamed = '';
    const started = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] 예제 생성 요청 (${String(j.prompt).length}자)`);
    try {
      await runClaude(cliArgs, String(j.prompt), line => {
        let m; try { m = JSON.parse(line); } catch (_) { return; }
        if (m.type === 'stream_event' && m.event && m.event.type === 'content_block_delta' && m.event.delta && m.event.delta.type === 'text_delta') {
          streamed += m.event.delta.text; send({ type: 'text', text: m.event.delta.text });
        } else if (m.type === 'result') {
          if (m.is_error) send({ type: 'error', message: String(m.result || m.subtype || 'error') });
          else result = m.result;
        }
      });
      send({ type: 'done', text: result !== null ? result : streamed });
      console.log(`  → 완료 ${((Date.now() - started) / 1000).toFixed(1)}초`);
    } catch (e) {
      send({ type: 'error', message: e.message });
      console.log('  → 오류: ' + e.message);
    } finally {
      try { unlinkSync(sysFile); } catch (_) {}
      res.end();
    }
    return;
  }

  if (req.method === 'GET') { serveStatic(req, res); return; }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log('마이크로비트 지니어스 키트 에이전트 — Claude CLI 브리지');
  console.log(`  주소: http://127.0.0.1:${PORT}`);
  console.log(`  허용 웹앱: ${ALLOWED.join(', ')}, http://localhost:*`);
  try { console.log(`  Claude CLI: ${await claudeVersion()}`); } catch (e) {
    console.log('  ⚠ claude CLI 를 찾지 못했습니다. https://claude.com/claude-code 에서 설치하고 "claude" 로 로그인하세요.');
  }
  const url = `http://127.0.0.1:${PORT}/`;
  console.log('');
  console.log(`  ▶ 웹앱 열기: ${url}   ← 이 주소에서 쓰면 브라우저 권한 문제 없이 바로 연결됩니다`);
  console.log('  이 창을 닫거나 Ctrl+C 를 누르면 브리지가 꺼집니다.');
  if (!args.includes('--no-open')) {
    const opener = isWin ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    try { spawn(opener, { shell: true, stdio: 'ignore', detached: true }).unref(); } catch (_) {}
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`포트 ${PORT} 를 이미 쓰고 있습니다. 브리지가 이미 켜져 있다면 http://127.0.0.1:${PORT}/ 를 여세요. 다른 포트: --port 8788`);
  else console.log('오류: ' + e.message);
  process.exit(1);
});
