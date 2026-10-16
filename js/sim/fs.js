// micro:bit 플래시 파일 시스템 (open() · os) — 브라우저 저장소에 보관
(function () {
  const KEY = 'mbsim.fs';
  const LIMIT = 30000; // micro:bit V2 파일 시스템 약 30KB
  const F = MB.fs = { files: {} };
  try { F.files = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { F.files = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(F.files)); } catch (_) {}
    MB.emit('fs');
  }
  const bytes = s => new TextEncoder().encode(s).length;
  F.used = () => Object.values(F.files).reduce((s, t) => s + bytes(t), 0);
  F.list = () => Object.keys(F.files).sort();
  F.read = name => (Object.prototype.hasOwnProperty.call(F.files, name) ? F.files[name] : null);
  F.size = name => (F.read(name) === null ? -1 : bytes(F.files[name]));

  function check(name, text) {
    const extra = bytes(text);
    if (F.used() + extra > LIMIT) { const e = new Error('ENOSPC'); e.errno = 28; throw e; }
  }
  F.write = function (name, text) {
    const old = F.read(name) || '';
    delete F.files[name];
    try { check(name, text); } catch (e) { F.files[name] = old; throw e; }
    F.files[name] = text; save();
  };
  F.append = function (name, text) {
    check(name, text);
    F.files[name] = (F.read(name) || '') + text; save();
  };
  F.remove = function (name) {
    if (F.read(name) === null) return false;
    delete F.files[name]; save(); return true;
  };
  F.clear = function () { F.files = {}; save(); };
  F.LIMIT = LIMIT;
})();
