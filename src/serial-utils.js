// Web Serial identifica portas por IDs USB; não confirma o modelo Arduino.
const id = (n) => Number(n).toString(16).toUpperCase().padStart(4, '0');
export function describePort(port) {
  const info = port?.getInfo?.() || {};
  const vid = info.usbVendorId;
  const pid = info.usbProductId;
  if (!Number.isInteger(vid) || !Number.isInteger(pid)) {
    return 'Porta serial autorizada (modelo não identificado)';
  }
  const pairs = new Set(['2341:0043','2341:0001','2A03:0043','2A03:0001']);
  const key = id(vid) + ':' + id(pid);
  let label = 'Dispositivo serial USB';
  if (pairs.has(key)) label = 'USB Arduino compatível com Uno';
  else if (key === '1A86:7523') label = 'Adaptador CH340 (comum em clones)';
  else if (key === '1A86:55D4') label = 'Adaptador CH9102 (comum em clones)';
  else if (key === '10C4:EA60') label = 'Adaptador CP210x';
  else if (key === '0403:6001') label = 'Adaptador FTDI';
  return label + ' — VID ' + id(vid) + ' / PID ' + id(pid) + ' (placa não verificada)';
}

export function convertControlSignals(signals = {}) {
  const out = {};
  if (typeof signals.dtr === 'boolean') out.dataTerminalReady = signals.dtr;
  else if (typeof signals.dataTerminalReady === 'boolean') out.dataTerminalReady = signals.dataTerminalReady;
  if (typeof signals.rts === 'boolean') out.requestToSend = signals.rts;
  else if (typeof signals.requestToSend === 'boolean') out.requestToSend = signals.requestToSend;
  if (typeof signals.break === 'boolean') out.break = signals.break;
  if (!Object.keys(out).length) throw new TypeError('Nenhum sinal DTR/RTS válido recebido.');
  return out;
}
