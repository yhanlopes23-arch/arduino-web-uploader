import { WebSerialTransport } from 'webserial-flasher';
import { convertControlSignals } from './serial-utils.js';

// A biblioteca usa {dtr,rts}, mas a API Web Serial exige
// {dataTerminalReady,requestToSend}. Fazemos a tradução sem
// modificar as dependências de terceiros.
export class UnoTransport extends WebSerialTransport {
  constructor(port) {
    super(port);
    this.rawPort = port;
  }

  async setSignals(signals) {
    return this.rawPort.setSignals(convertControlSignals(signals));
  }
}
