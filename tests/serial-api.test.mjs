import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BOARDS, STK500, WebSerialTransport } from 'webserial-flasher';
import { UnoTransport } from '../src/uno-transport.js';

test('a biblioteca possui porta USB e suporte ao bootloader', () => {
  assert.equal(typeof WebSerialTransport.requestPort, 'function');
  assert.equal(typeof WebSerialTransport.prototype.open, 'function');
  assert.equal(typeof WebSerialTransport.prototype.close, 'function');
  assert.equal(typeof UnoTransport.prototype.setSignals, 'function');
});
test('Arduino Uno R3 usa STK500v1 e 115200 baud', () => {
  const board = BOARDS['arduino-uno-r3'];
  assert.ok(board);
  assert.equal(board.protocol, 'stk500v1');
  assert.equal(board.baudRate, 115200);
  assert.equal(typeof STK500.prototype.bootload, 'function');
});
test('site pede permissão ao clicar e reconhece portas autorizadas', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /navigator\.serial\.getPorts\(\)/);
  assert.match(source, /navigator\.serial\.requestPort\(\)/);
  assert.match(source, /new UnoTransport\(selectedPort\)/);
  assert.doesNotMatch(source, /transport\.requestPort\(/);
  assert.match(source, /navigator\.serial\.addEventListener\('disconnect'/);
});
