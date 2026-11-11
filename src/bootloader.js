import { BOARDS, STK500, STK500SyncError } from 'webserial-flasher';
import { UnoTransport } from './uno-transport.js';

// A API de gravação é restrita ao ATmega328P e ao protocolo STK500v1.
// 57600 só é tentado na verificação do bootloader, nunca como "forçar" gravação.
export const UNO_BAUD_RATES = Object.freeze([115200, 57600]);

export function unoBoardAtBaud(baudRate) {
  if (!UNO_BAUD_RATES.includes(baudRate)) throw new RangeError('Velocidade de bootloader inválida.');
  const standard = BOARDS['arduino-uno'];
  const unoR3 = BOARDS['arduino-uno-r3'];
  if (!standard || !unoR3 || standard.protocol !== 'stk500v1') {
    throw new Error('Perfil Arduino Uno STK500v1 indisponível.');
  }
  // O perfil "arduino-uno" contém os parâmetros SET_DEVICE completos;
  // "arduino-uno-r3" fornece a assinatura e a identificação específicas.
  return {
    ...standard,
    signature: unoR3.signature,
    name: 'Arduino Uno R3 / ATmega328P',
    baudRate,
    timeout: 1200,
    resetMethod: 'dtr',
    resetDelayMs: 90,
  };
}

export class BootloaderNotRespondingError extends Error {
  constructor() {
    super('O bootloader ATmega328P não respondeu em 115200 ou 57600 baud após tentativas de reset.');
    this.name = 'BootloaderNotRespondingError';
  }
}

export async function probeUno(port, {
  onAttempt = () => {},
  createTransport = (selected) => new UnoTransport(selected),
  createProgrammer = (transport, board) => new STK500(transport, board, { quiet: true }),
  speeds = UNO_BAUD_RATES,
  attemptsPerSpeed = 2,
} = {}) {
  if (!port) throw new Error('Selecione uma porta USB antes de testar.');
  for (const baudRate of speeds) {
    const board = unoBoardAtBaud(baudRate);
    for (let attempt = 1; attempt <= attemptsPerSpeed; attempt++) {
      let transport;
      try {
        onAttempt({ baudRate, attempt, attemptsPerSpeed });
        transport = createTransport(port);
        await transport.open(board.baudRate);
        const programmer = createProgrammer(transport, board);
        await programmer.resetDevice();
        await programmer.sync(1);
        // Confirma que a resposta é de um ATmega328P, não de outro
        // dispositivo serial. Nenhuma gravação ou apagamento ocorre aqui.
        await programmer.verifySignature();
        return { baudRate, board };
      } catch (error) {
        // Erro de porta, permissão ou assinatura errada não é mascarado
        // como timeout, e nunca deve iniciar uma gravação.
        if (!(error instanceof STK500SyncError) && error?.name !== 'STK500SyncError') {
          throw error;
        }
      } finally {
        if (transport) {
          try { await transport.close(); } catch (error) { console.warn('Não foi possível fechar porta após teste:', error); }
        }
      }
    }
  }
  throw new BootloaderNotRespondingError();
}
