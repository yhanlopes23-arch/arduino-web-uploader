import test from 'node:test';
import assert from 'node:assert/strict';
import { describePort, convertControlSignals } from '../src/serial-utils.js';
import { UnoTransport } from '../src/uno-transport.js';

test('traduz corretamente DTR e RTS para Web Serial', async () => {
  const calls = [];
  const port = { setSignals: async (signals) => { calls.push(signals); } };
  const adapter = new UnoTransport(port);
  await adapter.setSignals({ dtr: false });
  await adapter.setSignals({ dtr: true });
  await adapter.setSignals({ rts: false });
  assert.deepEqual(calls, [
    { dataTerminalReady: false },
    { dataTerminalReady: true },
    { requestToSend: false }
  ]);
});
test('não oculta sinais de controle inválidos', () => {
  assert.throws(() => convertControlSignals({ foo: true }), /Nenhum sinal/);
});
test('identificação de USB não afirma modelo comprovado', () => {
  assert.match(describePort({ getInfo: () => ({ usbVendorId: 0x2341, usbProductId: 0x0043 }) }), /placa não verificada/);
  assert.match(describePort({ getInfo: () => ({ usbVendorId: 0x1a86, usbProductId: 0x7523 }) }), /CH340/);
  assert.match(describePort({ getInfo: () => ({}) }), /não identificado/);
});
