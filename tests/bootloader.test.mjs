import test from 'node:test';
import assert from 'node:assert/strict';
import { probeUno, unoBoardAtBaud, BootloaderNotRespondingError } from '../src/bootloader.js';

test('perfil mantém protocolo, assinatura e parâmetros do Uno', () => {
  for (const baud of [115200, 57600]) {
    const board = unoBoardAtBaud(baud);
    assert.equal(board.protocol, 'stk500v1');
    assert.equal(board.baudRate, baud);
    assert.deepEqual([...board.signature], [0x1e, 0x95, 0x0f]);
    assert.equal(board.pageSize, 128);
    assert.equal(board.flashSize, 32768);
    assert.equal(board.resetMethod, 'dtr');
  }
  assert.throws(() => unoBoardAtBaud(9600), /inválida/);
});

test('sonda primeiro 115200 e tenta 57600 quando não sincroniza', async () => {
  const attemptedBauds = [];
  const closedBauds = [];
  let currentBaud;
  const port = { name: 'mock-usb' };
  const result = await probeUno(port, {
    attemptsPerSpeed: 2,
    onAttempt: ({ baudRate }) => attemptedBauds.push(baudRate),
    createTransport: () => ({
      async open(baud) { currentBaud = baud; },
      async close() { closedBauds.push(currentBaud); },
    }),
    createProgrammer: () => ({
      async resetDevice() {},
      async sync() { if (currentBaud === 115200) throw Object.assign(new Error('sync failed'), { name: 'STK500SyncError' }); },
      async verifySignature() {},
      async chipErase() { throw new Error('NUNCA APAGAR NO TESTE'); },
    }),
  });
  assert.equal(result.baudRate, 57600);
  assert.deepEqual(attemptedBauds, [115200, 115200, 57600]);
  assert.deepEqual(closedBauds, [115200, 115200, 57600]);
});

test('não grava nem oculta incompatibilidade de assinatura', async () => {
  const actions = [];
  await assert.rejects(
    probeUno({ name: 'wrong-board' }, {
      createTransport: () => ({
        async open() { actions.push('open'); },
        async close() { actions.push('close'); },
      }),
      createProgrammer: () => ({
        async resetDevice() { actions.push('reset'); },
        async sync() { actions.push('sync'); },
        async verifySignature() { throw new Error('Signature mismatch ATmega2560'); },
        async chipErase() { actions.push('ERASE'); },
      }),
    }),
    /Signature mismatch/,
  );
  assert.deepEqual(actions, ['open', 'reset', 'sync', 'close']);
});

test('ausência de sync em ambas as velocidades gera diagnóstico próprio', async () => {
  let closeCount = 0;
  await assert.rejects(
    probeUno({ name: 'timeout' }, {
      attemptsPerSpeed: 1,
      createTransport: () => ({
        async open() {},
        async close() { closeCount++; },
      }),
      createProgrammer: () => ({
        async resetDevice() {},
        async sync() { throw Object.assign(new Error('sync failed'), { name: 'STK500SyncError' }); },
        async verifySignature() { throw new Error('não deve verificar sem sync'); },
      }),
    }),
    BootloaderNotRespondingError,
  );
  assert.equal(closeCount, 2);
});
