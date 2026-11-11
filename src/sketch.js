export const BLINK = `// Pisca LED no pino 13 do Arduino Uno R3
void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`;
export function prepareSketch(raw) {
  const source = raw.trim();
  if (!source) throw new Error('Cole um código Arduino antes de enviar.');
  if (!/\bvoid\s+setup\s*\(/.test(source) || !/\bvoid\s+loop\s*\(/.test(source))
    throw new Error('O código precisa de void setup() e void loop().');
  return '#include <Arduino.h>\n' + source + '\n';
}
export function friendlyError(error) {
  const message = String(error?.message || error);
  if (/NotFoundError|No port selected|No device selected/i.test(message)) return 'Nenhuma porta selecionada. Conecte o Arduino e tente novamente.';
  if (/Access denied|SecurityError|PermissionDeniedError/i.test(message)) return 'Permissão USB negada. Feche outros programas que utilizam a porta COM.';
  if (error?.name === 'BootloaderNotRespondingError') {
    return 'A porta USB abriu, mas o bootloader do ATmega328P não respondeu em 115200 nem 57600 baud.\n\n1. Confirme a porta USB correta (desconecte a placa e veja qual desaparece).\n2. Feche monitores seriais ou outros programas que usam a porta.\n3. Retire fios dos pinos 0 (RX) e 1 (TX).\n4. Tente outro cabo USB de dados e pressione RESET quando aparecer Sincronizando.\n5. Se continuar, verifique driver, reset automático e bootloader da placa.';
  }
  if (/signature|STK500SignatureMismatch/i.test(message)) return 'A porta respondeu, mas a assinatura do microcontrolador não corresponde ao ATmega328P. Confira se a placa é realmente um Uno R3. Detalhe: ' + message;
  if (/sync|timeout|timed out|stk500/i.test(message)) return 'A porta foi aberta, mas houve falha de sincronização com o bootloader. Confira os pinos 0/1, a porta correta e o botão RESET. Detalhe: ' + message;
  return message;
}
