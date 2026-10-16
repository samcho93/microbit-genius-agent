// radio 모듈: 같은 브라우저의 다른 시뮬레이터와 통신 + 스마트폰 블루투스(BLE UART)로 실제 장치와 연결
(function () {
  const R = MB.radio = {
    on: false,
    cfg: { length: 32, queue: 3, channel: 7, power: 6, group: 0, data_rate: 1 },
    queue: [],
    id: Math.random().toString(36).slice(2),
  };
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mbsim-radio') : null;

  R.config = function (o) { Object.assign(R.cfg, o); };
  R.reset = function () { R.cfg = { length: 32, queue: 3, channel: 7, power: 6, group: 0, data_rate: 1 }; R.queue = []; };

  function push(msg) {
    if (!R.on) return;
    if (R.queue.length >= R.cfg.queue) return; // 큐가 차면 버림 (실제 micro:bit 와 동일)
    R.queue.push(msg);
    MB.emit('radio', { dir: 'rx', msg });
  }

  // msg: { kind: 'str'|'bytes', data: string | number[] }
  R.send = function (msg) {
    if (!R.on) throw new Error('radio is not enabled');
    const len = msg.kind === 'str' ? new TextEncoder().encode(msg.data).length + 3 : msg.data.length;
    if (len > R.cfg.length) msg = msg.kind === 'str' ? msg : { kind: 'bytes', data: msg.data.slice(0, R.cfg.length) };
    if (bc) bc.postMessage({ from: R.id, channel: R.cfg.channel, group: R.cfg.group, msg, t: Date.now() });
    if (MB.bt.connected) MB.bt.write(msg.kind === 'str' ? msg.data : String.fromCharCode(...msg.data));
    MB.emit('radio', { dir: 'tx', msg });
  };

  R.receive = function () { return R.queue.shift() || null; };

  if (bc) bc.onmessage = e => {
    const d = e.data;
    if (!d || d.from === R.id) return;
    if (d.channel !== R.cfg.channel || d.group !== R.cfg.group) return;
    push(Object.assign({ rssi: -40 - Math.floor(Math.random() * 30), time: MB.now() }, d.msg));
  };

  // ---------- Web Bluetooth: BLE UART (Nordic UART / micro:bit UART 서비스) ----------
  const UART = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const BT = MB.bt = { connected: false, device: null, tx: null, buf: '' };

  BT.supported = () => !!(navigator.bluetooth && navigator.bluetooth.requestDevice);

  BT.connect = async function () {
    if (!BT.supported()) throw new Error('이 브라우저는 Web Bluetooth 를 지원하지 않습니다. (Android/PC 의 Chrome · Edge 사용)');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'BBC micro:bit' }, { services: [UART] }],
      optionalServices: [UART],
    });
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(UART);
    const chars = await svc.getCharacteristics();
    let rx = null, tx = null;
    for (const c of chars) {
      if (c.properties.notify || c.properties.indicate) rx = rx || c;
      if (c.properties.write || c.properties.writeWithoutResponse) tx = tx || c;
    }
    if (!rx || !tx) throw new Error('UART 특성을 찾지 못했습니다.');
    await rx.startNotifications();
    rx.addEventListener('characteristicvaluechanged', ev => {
      BT.buf += new TextDecoder().decode(ev.target.value);
      let i;
      while ((i = BT.buf.search(/[\n#]/)) >= 0) {
        const line = BT.buf.slice(0, i).replace(/\r$/, '');
        BT.buf = BT.buf.slice(i + 1);
        if (line) { push({ kind: 'str', data: line, rssi: -60, time: MB.now() }); MB.emit('bt', { dir: 'rx', text: line }); }
      }
    });
    device.addEventListener('gattserverdisconnected', () => { BT.connected = false; MB.emit('bt', { state: 'disconnected' }); });
    Object.assign(BT, { device, tx, connected: true });
    MB.emit('bt', { state: 'connected', name: device.name });
    return device.name;
  };

  BT.write = async function (text) {
    if (!BT.connected) return;
    const data = new TextEncoder().encode(text + '\n');
    for (let i = 0; i < data.length; i += 20) {
      const chunk = data.slice(i, i + 20);
      try {
        if (BT.tx.writeValueWithoutResponse) await BT.tx.writeValueWithoutResponse(chunk);
        else await BT.tx.writeValue(chunk);
      } catch (e) { console.warn(e); }
    }
    MB.emit('bt', { dir: 'tx', text });
  };

  BT.disconnect = function () { if (BT.device && BT.device.gatt.connected) BT.device.gatt.disconnect(); };
})();
