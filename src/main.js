import { compile } from '@horang-corp/avr-gcc-wasm';
import { STK500 } from 'webserial-flasher';
import { probeUno } from './bootloader.js';
import { UnoTransport } from './uno-transport.js';
import { describePort } from './serial-utils.js';
import { BLINK, prepareSketch, friendlyError } from './sketch.js';
import './style.css';

const byId = (id) => document.getElementById(id);
const code = byId('code');
const upload = byId('upload');
const example = byId('example');
const choosePortButton = byId('choose-port');
const testConnectionButton = byId('test-connection');
const STORAGE_KEY = 'arduino-web-uploader-draft';

let selectedPort = null;
let uploading = false;
let verifiedPort = null;
let verifiedBaud = null;

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
    if (selectedPort && !ports.includes(selectedPort)) {
      selectedPort = null;
      verifiedPort = null;
      verifiedBaud = null;
    }
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
    verifiedPort = null;
    verifiedBaud = null;
    showDevice('Porta USB autorizada', describePort(port) + '. Use Testar conexão USB ou Enviar ao Arduino.');
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

function setBusy(busy) {
  uploading = busy;
  upload.disabled = busy;
  example.disabled = busy;
  choosePortButton.disabled = busy;
  testConnectionButton.disabled = busy;
}

async function authorizePort() {
  requireSerial();
  if (!selectedPort) {
    // Necessariamente chamado diretamente por um clique no botão.
    selectedPort = await navigator.serial.requestPort();
  }
  return selectedPort;
}

async function diagnosePort() {
  const result = await probeUno(selectedPort, {
    onAttempt: ({ baudRate, attempt, attemptsPerSpeed }) => {
      status('Sincronizando bootloader', 'Testando ' + baudRate + ' baud (tentativa ' + attempt + '/' + attemptsPerSpeed + '). Se falhar, confira a porta USB e pressione RESET ao tentar novamente.', 20);
    },
  });
  verifiedPort = selectedPort;
  verifiedBaud = result.baudRate;
  showDevice('ATmega328P detectado via bootloader', describePort(selectedPort) + ' — STK500v1, ' + result.baudRate + ' baud. Compatível com Uno R3; fabricante não confirmado.');
  return result;
}

async function testConnection() {
  if (uploading) return;
  setBusy(true);
  try {
    await authorizePort();
    await diagnosePort();
    status('Conexão confirmada', 'A placa respondeu ao bootloader e a assinatura ATmega328P foi verificada. Nenhum firmware foi gravado.', 100);
  } catch (error) {
    console.error('Falha no teste do bootloader:', error);
    status('Teste de conexão falhou', friendlyError(error), 0);
  } finally {
    setBusy(false);
  }
}

async function send() {
  if (uploading) return;
  let transport;
  setBusy(true);
  try {
    const source = prepareSketch(code.value);
    requireSerial();

    // Seleção de porta exige interação explícita do usuário.
    await authorizePort();
    showDevice('Porta USB selecionada', describePort(selectedPort) + '. Verificando a assinatura do microcontrolador.');

    // Identifica a velocidade de comunicação ANTES de compilar ou gravar.
    // Não apaga nem escreve memória durante esse teste.
    const { board } = await diagnosePort();
    status('Compilando C++', 'Bootloader identificado. Compilando o código sem desconectar o Arduino.', 32);
    const assetsBase = new URL(import.meta.env.BASE_URL + 'avr/', document.baseURI).href;
    const result = await compile({ source, sensors: [], assetsBase });
    if (!result || typeof result.hex !== 'string' || !result.hex.startsWith(':')) {
      throw new Error('A compilação não produziu um arquivo HEX válido.');
    }
    if (result.fitsTarget === false) {
      throw new Error('Código excedeu a memória disponível no Arduino Uno R3.');
    }

    transport = new UnoTransport(selectedPort);
    status('Conectando', 'Abrindo a USB e verificando o bootloader STK500v1.', 45);
    await transport.open(board.baudRate);

    const flasher = new STK500(transport, board, { retry: { syncAttempts: 2, retryDelayMs: 100 } });
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
    setBusy(false);
  }
}

upload.addEventListener('click', send);
choosePortButton.addEventListener('click', choosePort);
testConnectionButton.addEventListener('click', testConnection);

if (!window.isSecureContext || !('serial' in navigator)) {
  showDevice('Navegador incompatível', 'Use Chrome ou Edge em HTTPS, no computador.');
  status('Navegador incompatível', 'Este navegador não permite acesso à porta serial USB.', 0);
  choosePortButton.disabled = true;
  testConnectionButton.disabled = true;
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
