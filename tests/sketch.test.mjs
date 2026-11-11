import test from 'node:test';
import assert from 'node:assert/strict';
import { BLINK, prepareSketch, friendlyError } from '../src/sketch.js';
test('prepara código para Uno R3', () => {
  const s = prepareSketch(BLINK);
  assert.match(s, /^#include <Arduino\.h>/);
  assert.match(s, /digitalWrite\(13, HIGH\)/);
});
test('rejeita código incompleto', () => {
  assert.throws(() => prepareSketch(' '), /Cole um código/);
  assert.throws(() => prepareSketch('int led=13;'), /setup/);
});
test('traduz cancelamento da porta serial', () => {
  assert.match(friendlyError(new Error('NotFoundError')), /Nenhuma porta/);
});
