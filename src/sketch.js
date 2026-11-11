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
  if (/sync|timeout|timed out|signature|stk500/i.test(message)) return 'Falha no bootloader ou na comunicação USB. Confira cabo, porta COM, driver e placa. Detalhe: ' + message;
  return message;
}
