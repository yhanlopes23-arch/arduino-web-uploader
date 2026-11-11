import { compile } from '@horang-corp/avr-gcc-wasm';
import { STK500, WebSerialTransport, BOARDS } from 'webserial-flasher';
import { BLINK, prepareSketch, friendlyError } from './sketch.js';
import './style.css';

const byId = (id) => document.getElementById(id);
const code = byId('code');
const upload = byId('upload');
const example = byId('example');
const STORAGE_KEY = 'arduino-web-uploader-draft';
try { code.value = localStorage.getItem(STORAGE_KEY) || BLINK; }
catch { code.value = BLINK; }

code.addEventListener('input', () => {
  try { localStorage.setItem(STORAGE_KEY, code.value); } catch { /* storage optional */ }
});
example.addEventListener('click', () => {
  code.value = BLINK;
  code.dispatchEvent(new Event('input'));
  code.focus();
});

function status(title, message, pct = 0) {
  byId('state').textContent = title;
  byId('details').textContent = message;
  byId('percent').textContent = Math.round(pct) + '%';
  byId('progress').value = Math.max(0, Math.min(100, pct));
}

async function send() {
  let transport;
  upload.disabled = true;
  example.disabled = true;
  try {
    const source = prepareSketch(code.value);
    if (!window.isSecureContext || !('serial' in navigator)) {
      throw new Error('Web Serial não está disponível. Abra o site pelo Chrome ou Edge em HTTPS, num computador.');
    }

    // O seletor de porta precisa ser aberto imediatamente após o clique do usuário.
    transport = new WebSerialTransport();
    status('Escolha a porta USB', 'Selecione a porta COM do Arduino Uno R3 e permita a conexão.', 5);
    await transport.requestPort();

    status('Compilando C++', 'A primeira compilação baixa arquivos do compilador WebAssembly. Aguarde sem desconectar a placa.', 12);
    const assetsBase = new URL(import.meta.env.BASE_URL + 'avr/', document.baseURI).href;
    const result = await compile({ source, sensors: [], assetsBase });
    if (!result || typeof result.hex !== 'string' || !result.hex.startsWith(':')) {
      throw new Error('A compilação não produziu um firmware HEX válido.');
    }
    if (result.fitsTarget === false) {
      throw new Error('Código excedeu o limite de memória do Arduino Uno R3.');
    }

    const board = BOARDS['arduino-uno-r3'] || BOARDS['arduino-uno'];
    if (!board) throw new Error('Configuração da placa Uno R3 indisponível.');
    status('Conectando', 'Abrindo a comunicação com o bootloader STK500v1.', 45);
    await transport.open(board.baudRate);
    const flasher = new STK500(transport, board);
    await flasher.bootload(result.hex, (stage, percentage) => {
      const progress = Number.isFinite(percentage) ? percentage : 0;
      status('Gravando no Arduino', String(stage) + ' — não desconecte o cabo.', 50 + Math.min(100, Math.max(0, progress)) * 0.5);
    });
    status('Concluído!', 'O firmware foi gravado e verificado. O Arduino deve executar o novo código.', 100);
  } catch (error) {
    console.error('Falha na gravação do Arduino:', error);
    status('Não foi possível enviar', friendlyError(error), 0);
  } finally {
    if (transport) { try { await transport.close(); } catch { /* preserva erro anterior */ } }
    upload.disabled = false;
    example.disabled = false;
  }
}
upload.addEventListener('click', send);

if (!('serial' in navigator)) {
  status('Navegador incompatível', 'Use Chrome ou Edge atualizado no Windows. O site precisa estar em HTTPS para acessar a USB.', 0);
}
