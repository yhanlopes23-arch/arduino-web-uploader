import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BOARDS, STK500, WebSerialTransport } from 'webserial-flasher';

test('webserial-flasher seleciona porta pelo método estático', async () => {
  assert.equal(typeof WebSerialTransport.requestPort, 'function');
  assert.equal(typeof WebSerialTransport.prototype.requestPort, 'undefined');
  assert.equal(typeof WebSerialTransport.prototype.open, 'function');
  assert.equal(typeof WebSerialTransport.prototype.close, 'function');
});

test('Arduino Uno R3 usa protocolo STK500v1 e configura baud rate', () => {
  const board = BOARDS['arduino-uno-r3'];
  assert.ok(board);
  assert.equal(board.protocol, 'stk500v1');
  assert.equal(board.baudRate, 115200);
  assert.equal(typeof STK500.prototype.bootload, 'function');
});

test('fluxo de upload chama seletor de porta corretamente', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /await WebSerialTransport\.requestPort\(\)/);
  assert.doesNotMatch(source, /transport\.requestPort\(/);
});
