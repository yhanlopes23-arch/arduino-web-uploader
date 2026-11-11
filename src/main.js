import { compile } from '@horang-corp/avr-gcc-wasm';
import { STK500, BOARDS } from 'webserial-flasher';
import { UnoTransport } from './uno-transport.js';
import { describePort } from './serial-utils.js';
import { BLINK, prepareSketch, friendlyError } from './sketch.js';
import './style.css';

const byId = (id) => document.getElementById(id);
const code = byId('code');
const upload = byId('upload');
const example = byId('example');
const choosePortButton = byId('choose-port');
const STORAGE_KEY = 'arduino-web-uploader-draft';

let selectedPort = null;
let uploading = false;

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

function showDevice(title, message) {
  byId('device-state').textContent = title;
  byId('device-details').textContent = message;
  choosePortButton.textContent = selectedPort ? 'Trocar porta USB' : 'Selecionar Arduino';
}

function requireSerial() {
  if (!window.isSecureContext || !('serial' in navigator)) {
    throw new Error('Web Serial não disponível. Abra este site HTTPS no Chrome ou Edge de um computador.');
  }
}

async function refreshAuthorizedPorts() {
  if (!('serial' in navigator) || uploading) return;
  try {
    const ports = await navigator.serial.getPorts();
    if (selectedPort && !ports.includes(selectedPort)) selectedPort = null;
    if (!selectedPort && ports.length === 1) selectedPort = ports[0];

    if (selectedPort) {
      showDevice('Porta USB autorizada', describePort(selectedPort) + '. A placa será validada ao enviar o firmware.');
    } else if (ports.length > 1) {
      showDevice(ports.length + ' portas autorizadas', 'Selecione a porta USB do Arduino. Não é possível identificar a porta COM pelo navegador.');
    } else {
      showDevice('Nenhum Arduino selecionado', 'Conecte o cabo USB e clique em Selecionar Arduino para autorizar o acesso.');
    }
  } catch (error) {
    showDevice('Não foi possível consultar as portas', friendlyError(error));
  }
}

async function choosePort() {
  if (uploading) return;
  try {
    requireSerial();
    // O seletor Web Serial só pode ser aberto por um clique do usuário.
    const port = await navigator.serial.requestPort();
    selectedPort = port;
    showDevice('Porta USB autorizada', describePort(port) + '. Clique em Enviar ao Arduino para gravar.');
  } catch (error) {
    showDevice('Seleção de porta não concluída', friendlyError(error));
  }
}

function status(title, message, pct = 0) {
  byId('state').textContent = title;
  byId('details').textContent = message;
  byId('percent').textContent = Math.round(pct) + '%';
  byId('progress').value = Math.max(0, Math.min(100, pct));
}

async function send() {
  if (uploading) return;
  let transport;
  uploading = true;
  upload.disabled = true;
  example.disabled = true;
  choosePortButton.disabled = true;
  try {
    const source = prepareSketch(code.value);
    requireSerial();

    // Sem porta selecionada, solicita acesso imediatamente após o clique.
    // Nunca abrimos diálogo ou gravamos a placa automaticamente.
    if (!selectedPort) {
      status('Selecione o Arduino', 'Autorize a porta serial na janela do navegador.', 5);
      selectedPort = await navigator.serial.requestPort();
    }
    showDevice('Porta USB selecionada', describePort(selectedPort) + '. Identidade do microcontrolador ainda não verificada.');

    status('Compilando C++', 'Baixando e executando o compilador WebAssembly. Não desconecte o Arduino.', 12);
    const assetsBase = new URL(import.meta.env.BASE_URL + 'avr/', document.baseURI).href;
    const result = await compile({ source, sensors: [], assetsBase });
    if (!result || typeof result.hex !== 'string' || !result.hex.startsWith(':')) {
      throw new Error('A compilação não produziu um arquivo HEX válido.');
    }
    if (result.fitsTarget === false) {
      throw new Error('Código excedeu a memória disponível no Arduino Uno R3.');
    }

    const board = BOARDS['arduino-uno-r3'] || BOARDS['arduino-uno'];
    if (!board) throw new Error('Configuração da placa Uno R3 indisponível.');
    transport = new UnoTransport(selectedPort);
    status('Conectando', 'Abrindo a USB e verificando o bootloader STK500v1.', 45);
    await transport.open(board.baudRate);

    const flasher = new STK500(transport, board);
    await flasher.bootload(result.hex, (stage, percentage) => {
      const progress = Number.isFinite(percentage) ? percentage : 0;
      status('Gravando no Arduino', String(stage) + ' — não desconecte o cabo.', 50 + Math.min(100, Math.max(0, progress)) * 0.5);
    });
    showDevice('Placa compatível com Uno R3 confirmada', describePort(selectedPort) + '. Gravação concluída pelo bootloader.');
    status('Concluído!', 'O firmware foi gravado e verificado. O Arduino deve executar o código.', 100);
  } catch (error) {
    console.error('Falha no envio para Arduino:', error);
    status('Não foi possível enviar', friendlyError(error), 0);
  } finally {
    if (transport) {
      try { await transport.close(); } catch (error) { console.warn('Falha ao liberar a porta USB', error); }
    }
    uploading = false;
    upload.disabled = false;
    example.disabled = false;
    choosePortButton.disabled = false;
  }
}

upload.addEventListener('click', send);
choosePortButton.addEventListener('click', choosePort);

if (!window.isSecureContext || !('serial' in navigator)) {
  showDevice('Navegador incompatível', 'Use Chrome ou Edge em HTTPS, no computador.');
  status('Navegador incompatível', 'Este navegador não permite acesso à porta serial USB.', 0);
  choosePortButton.disabled = true;
  upload.disabled = true;
} else {
  refreshAuthorizedPorts();
  navigator.serial.addEventListener('connect', () => {
    if (!uploading) refreshAuthorizedPorts();
  });
  navigator.serial.addEventListener('disconnect', () => {
    if (uploading) {
      status('Arduino desconectado', 'O dispositivo USB foi desconectado durante a gravação.', 0);
    } else {
      refreshAuthorizedPorts();
    }
  });
}
