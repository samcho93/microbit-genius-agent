// log 모듈: micro:bit 데이터 로깅 (MY_DATA.HTM)
(function () {
  const KEY = 'mbsim.mydata';
  const TS_NAME = { 1: 'milliseconds', 10: 'seconds', 600: 'minutes', 36000: 'hours', 864000: 'days' };
  const TS_DIV = { 1: 1, 10: 1000, 600: 60000, 36000: 3600000, 864000: 86400000 };
  const MAX_BYTES = 1024 * 1024; // micro:bit V2 로그 영역 약 1MB

  const L = MB.datalog = {
    lines: [],          // CSV 줄 (헤더 줄 포함)
    labels: [],         // 현재 열 이름 (타임스탬프 제외)
    ts: 10,             // 기본: 초 단위 타임스탬프
    headerDirty: true,
    mirroring: false,
    t0: 0,
  };

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ lines: L.lines, labels: L.labels, ts: L.ts })); } catch (_) {}
    MB.emit('datalog');
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d) { L.lines = d.lines || []; L.labels = d.labels || []; L.ts = d.ts == null ? 10 : d.ts; }
    } catch (_) {}
  }
  load();

  L.bytes = () => L.lines.reduce((s, l) => s + l.length + 1, 0);

  const csvCell = v => {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  function header() {
    const cols = L.labels.slice();
    if (L.ts) cols.unshift('Time (' + TS_NAME[L.ts] + ')');
    return cols.map(csvCell).join(',');
  }

  // 프로그램 시작 시 호출
  L.startProgram = function () { L.t0 = MB.now(); L.mirroring = false; L.ts = 10; L.headerDirty = true; L.labels = []; };

  L.setLabels = function (labels, ts) {
    if (ts !== undefined) L.ts = ts;
    const same = labels.length === L.labels.length && labels.every((v, i) => v === L.labels[i]);
    L.labels = labels.slice();
    if (!same || ts !== undefined) L.headerDirty = true;
    if (L.headerDirty && L.labels.length) writeLine(header(), true);
  };

  function writeLine(line, isHeader) {
    if (L.bytes() + line.length + 1 > MAX_BYTES) { const e = new Error('log full'); e.full = true; throw e; }
    if (isHeader) {
      L._headers.add(line);
      // 바로 앞 줄과 같은 헤더면 중복 기록하지 않음
      const last = L.lastHeader();
      if (last === line) { L.headerDirty = false; return; }
      L.headerDirty = false;
    }
    L.lines.push(line);
    save();
    if (L.mirroring) MB.emit('serial', line + '\r\n');
  }

  L.lastHeader = function () {
    for (let i = L.lines.length - 1; i >= 0; i--) if (L.isHeaderLine(L.lines[i], i)) return L.lines[i];
    return null;
  };

  L.isHeaderLine = function (line, idx) {
    if (idx === 0) return true;
    return /^"?Time \(/.test(line) || L._headers.has(line);
  };
  L._headers = new Set();

  // data: [[key, value], ...]
  L.add = function (pairs) {
    let changed = false;
    for (const [k] of pairs) if (!L.labels.includes(k)) { L.labels.push(k); changed = true; }
    if (changed || L.headerDirty || !L.lines.length) {
      writeLine(header(), true);
    }
    const map = new Map(pairs);
    const row = L.labels.map(k => (map.has(k) ? fmt(map.get(k)) : ''));
    if (L.ts) {
      const t = (MB.now() - L.t0) / TS_DIV[L.ts];
      row.unshift(L.ts === 1 ? String(Math.round(t)) : t.toFixed(2));
    }
    writeLine(row.map(csvCell).join(','), false);
  };

  function fmt(v) {
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    return String(v);
  }

  L.delete = function (full) {
    L.lines = []; L.labels = []; L.headerDirty = true; L._headers.clear();
    save();
  };

  L.csv = () => L.lines.join('\n') + (L.lines.length ? '\n' : '');

  // ---------- 보기 (앱과 MY_DATA.HTM 이 함께 쓰는 코드) ----------
  function viewer(root, csv, opts) {
    opts = opts || {};
    function splitCsv(line) {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q) {
          if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (c === '"') q = false;
          else cur += c;
        } else if (c === '"') q = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
      out.push(cur);
      return out;
    }
    const isNum = s => s !== '' && !isNaN(+s);
    const lines = csv.split(/\r?\n/).filter(l => l.length);
    const cols = []; const rows = [];
    let hdr = null;
    lines.forEach((l, i) => {
      const cells = splitCsv(l);
      const isHdr = i === 0 || /^Time \(/.test(cells[0]) || (cells.every(c => !isNum(c) && c !== '') && hdr && cells.join() !== hdr.join() && cells.some(c => hdr.includes(c)));
      if (isHdr) { hdr = cells; cells.forEach(c => { if (!cols.includes(c)) cols.push(c); }); return; }
      const r = {}; (hdr || []).forEach((h, j) => { if (cells[j] !== undefined && cells[j] !== '') r[h] = cells[j]; });
      rows.push(r);
    });
    root.innerHTML = '';
    const el = (t, a, p) => { const e = document.createElement(t); Object.assign(e, a || {}); if (p) p.appendChild(e); return e; };
    const info = el('p', { className: 'mblog-info', textContent: rows.length + ' rows · ' + cols.length + ' columns' }, root);
    if (!rows.length) { info.textContent = '기록된 데이터가 없습니다. (No data logged)'; return { rows, cols }; }

    // 그래프
    const timeCols = cols.filter(c => /^Time \(/.test(c));
    const UNIT = { milliseconds: 0.001, seconds: 1, minutes: 60, hours: 3600, days: 86400 };
    const tsec = r => {
      for (const c of timeCols) if (isNum(r[c] || '')) return +r[c] * (UNIT[(/\((\w+)\)/.exec(c) || [])[1]] || 1);
      return null;
    };
    const series = cols.filter(c => !timeCols.includes(c) && rows.some(r => isNum(r[c] || '')));
    if (series.length && opts.chart !== false) {
      const wrap = el('div', { className: 'mblog-chart' }, root);
      const cv = el('canvas', {}, wrap);
      const legend = el('div', { className: 'mblog-legend' }, wrap);
      const COLORS = ['#e4572e', '#2e86de', '#17a589', '#f1a208', '#8e44ad', '#d81b60', '#5d6d7e', '#00897b'];
      series.forEach((s, i) => { const sp = el('span', {}, legend); sp.innerHTML = '<i style="background:' + COLORS[i % 8] + '"></i>' + s.replace(/</g, '&lt;'); });
      const draw = () => {
        const W = wrap.clientWidth || 600, H = Math.max(180, Math.min(320, W * 0.45));
        const dpr = window.devicePixelRatio || 1;
        cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
        const g = cv.getContext('2d'); g.scale(dpr, dpr);
        const xs = rows.map((r, i) => { const t = tsec(r); return t === null ? i : t; });
        let ymin = Infinity, ymax = -Infinity;
        series.forEach(s => rows.forEach(r => { if (isNum(r[s] || '')) { ymin = Math.min(ymin, +r[s]); ymax = Math.max(ymax, +r[s]); } }));
        if (ymin === ymax) { ymin -= 1; ymax += 1; }
        const xmin = Math.min(...xs), xmax = Math.max(...xs) === xmin ? xmin + 1 : Math.max(...xs);
        const L = 46, R = 12, T = 10, B = 28;
        const px = x => L + (x - xmin) / (xmax - xmin) * (W - L - R);
        const py = y => T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B);
        const css = getComputedStyle(root);
        const fg = css.getPropertyValue('--mblog-fg') || '#555', grid = css.getPropertyValue('--mblog-grid') || '#ddd';
        g.font = '11px system-ui, sans-serif'; g.fillStyle = fg; g.strokeStyle = grid; g.lineWidth = 1;
        for (let k = 0; k <= 4; k++) {
          const y = ymin + (ymax - ymin) * k / 4;
          g.beginPath(); g.moveTo(L, py(y)); g.lineTo(W - R, py(y)); g.stroke();
          g.textAlign = 'right'; g.fillText(+y.toFixed(2), L - 6, py(y) + 4);
        }
        g.textAlign = 'center';
        for (let k = 0; k <= 4; k++) { const x = xmin + (xmax - xmin) * k / 4; g.fillText(+x.toFixed(2), px(x), H - 8); }
        series.forEach((s, i) => {
          g.strokeStyle = COLORS[i % 8]; g.lineWidth = 2; g.beginPath();
          let started = false;
          rows.forEach((r, j) => {
            if (!isNum(r[s] || '')) return;
            const X = px(xs[j]), Y = py(+r[s]);
            if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y);
          });
          g.stroke();
        });
      };
      draw();
      window.addEventListener('resize', draw);
    }

    // 표
    const tw = el('div', { className: 'mblog-table' }, root);
    const t = el('table', {}, tw);
    const tr = el('tr', {}, el('thead', {}, t));
    cols.forEach(c => el('th', { textContent: c }, tr));
    const tb = el('tbody', {}, t);
    const max = opts.maxRows || 2000;
    rows.slice(-max).forEach(r => { const row = el('tr', {}, tb); cols.forEach(c => el('td', { textContent: r[c] == null ? '' : r[c] }, row)); });
    if (rows.length > max) el('p', { className: 'mblog-info', textContent: '마지막 ' + max + '줄만 표시합니다.' }, root);
    return { rows, cols };
  }
  L.viewer = viewer;

  // ---------- MY_DATA.HTM 만들기 ----------
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  L.toHTM = function (csv) {
    csv = csv == null ? L.csv() : csv;
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>micro:bit data log</title>
<style>
:root{--mblog-fg:#4a4a4a;--mblog-grid:#e3e3e3;color-scheme:light}
body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#fff;color:#222}
header{background:#00a091;color:#fff;padding:14px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
header h1{font-size:20px;margin:0 auto 0 0}
button{font:inherit;border:0;border-radius:20px;padding:7px 16px;background:#fff;color:#00786d;font-weight:600;cursor:pointer}
button:disabled{opacity:.55;cursor:not-allowed}
main{padding:16px 20px;max-width:1100px;margin:auto}
.note{background:#f3f7f6;border-left:4px solid #00a091;padding:10px 14px;border-radius:4px;font-size:14px}
.mblog-info{color:#666;font-size:13px}
.mblog-chart{margin:14px 0}
.mblog-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}
.mblog-legend i{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.mblog-table{overflow:auto;max-height:60vh;border:1px solid #ddd;border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;white-space:nowrap}
th{position:sticky;top:0;background:#f6f6f6}
</style></head>
<body>
<header><h1>micro:bit data log</h1>
<button id="dl">Download</button><button id="cp">Copy</button>
<button disabled title="Simulator file">Update data…</button><button disabled title="Simulator file">Clear log…</button>
<button id="vp">Visual preview</button></header>
<main>
<p class="note">This file was saved by the micro:bit simulator (MY_DATA.HTM). It contains the data your program logged with the <code>log</code> module.
Download saves the data as CSV for spreadsheets. 이 파일은 micro:bit 시뮬레이터가 저장한 데이터 로그입니다.</p>
<div id="view"></div>
</main>
<pre id="mbsim-log" hidden>${esc(csv)}</pre>
<script>
${viewer.toString()}
var csv=document.getElementById('mbsim-log').textContent, chart=false;
function show(){viewer(document.getElementById('view'),csv,{chart:chart});}
show();
document.getElementById('vp').onclick=function(){chart=!chart;show();};
document.getElementById('cp').onclick=function(){navigator.clipboard.writeText(csv);this.textContent='Copied';};
document.getElementById('dl').onclick=function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='microbit.csv';a.click();};
</script>
</body></html>
`;
  };

  // MY_DATA.HTM(또는 CSV) 읽기 → CSV 문자열
  L.parseFile = function (text) {
    if (/<html|<!doctype/i.test(text)) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const pre = doc.getElementById('mbsim-log');
      if (pre) return pre.textContent;
      // 실제 micro:bit 의 MY_DATA.HTM: 본문 텍스트에서 CSV 형태의 줄을 찾음
      const raw = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      const body = new DOMParser().parseFromString(raw, 'text/html').body.textContent || '';
      const lines = body.split(/\r?\n/).map(s => s.trim()).filter(s => s.includes(',') && !/[<>{};]/.test(s));
      return lines.join('\n');
    }
    return text;
  };

  L.importCSV = function (csv) {
    L.lines = csv.split(/\r?\n/).filter(l => l.length);
    L._headers = new Set(L.lines.filter((l, i) => i === 0 || /^"?Time \(/.test(l)));
    L.headerDirty = true;
    save();
  };
})();
