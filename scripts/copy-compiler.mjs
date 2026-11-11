import { cp, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'node_modules/@horang-corp/avr-gcc-wasm');
const target = resolve(root, 'public/avr');
for (const folder of ['tools', 'assets']) {
  const from = resolve(source, folder);
  try { await access(from); }
  catch { throw new Error('Arquivos WASM ausentes: ' + from); }
  await mkdir(target, { recursive: true });
  await cp(from, resolve(target, folder), { recursive: true, force: true });
}
console.log('Compilador WebAssembly copiado para public/avr');
