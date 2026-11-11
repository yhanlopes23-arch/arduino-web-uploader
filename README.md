# Arduino Web Uploader — Uno R3

Um site simples para **colar o código C++** do Arduino e clicar em **Enviar ao Arduino**. O navegador compila para Intel HEX e grava na placa física pela USB.

## Abrir no navegador (GitHub Pages)

Este projeto está preparado para ser publicado no GitHub Pages:

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra a aba **Actions** e acompanhe **Publicar Arduino Web Uploader**. Se necessário, inicie o workflow manualmente em **Run workflow**.
4. Quando a ação de publicação for concluída com sucesso, acesse **https://yhanlopes23-arch.github.io/arduino-web-uploader/**.
5. Abra pelo **Google Chrome ou Microsoft Edge** atualizado, em um computador Windows com Arduino Uno R3 conectado por cabo USB de dados.
6. Cole um sketch com `void setup()` e `void loop()`, clique **Enviar ao Arduino**, selecione a porta COM e permita a comunicação USB.

O navegador não acessa a USB automaticamente: precisa da sua autorização. O Windows também deve reconhecer a placa no **Gerenciador de Dispositivos → Portas (COM e LPT)**. Alguns clones exigem driver CH340. O site não corrige ou contorna bloqueios de drivers e permissões.

## Como funciona

- Interface estática em HTML/CSS/JavaScript usando Vite, sem servidor de aplicação e sem exigir Arduino IDE ou PlatformIO no seu computador.
- Compilação local no navegador com `@horang-corp/avr-gcc-wasm@0.2.0`. Os recursos do compilador são gerados na compilação do site e copiados para `public/avr/`.
- Gravação via API Web Serial e protocolo STK500v1 com `webserial-flasher@1.0.1`.
- Exemplo inicial: LED pisca no pino 13.
- Rascunho salvo apenas no navegador (localStorage), sem envio do código para uma conta GitHub.

## Estado e limitações

**Protótipo ainda não validado em hardware físico.** Os testes existentes verificam preparação do sketch, não garantem compilação nem gravação. A publicação só estará confirmada quando a ação do GitHub Pages concluir com sucesso.

A compilação aceita sketches compatíveis com a toolchain AVR incluída, mas **não oferece instalação universal de bibliotecas Arduino** nem geração automática de protótipos do formato `.ino`. Defina protótipos manualmente se necessário.

Requer navegador com Web Serial e contexto seguro HTTPS (Chrome ou Edge no computador), cabo de dados, driver e bootloader do Uno R3 funcionando. Sem suporte a programação ISP ou gravação de bootloader.

## Desenvolvimento local opcional

```sh
npm install
npm test
npm run dev
```

## Dependências de terceiros e licenças

- [webserial-flasher](https://github.com/vielang/webserial-flasher): licença MIT.
- [avr-gcc-wasm](https://github.com/horang-corp/avr-gcc-wasm): GCC e binutils GPL, além de bibliotecas Arduino sob licenças próprias. A redistribuição pública da ferramenta exige observar avisos e materiais-fonte correspondentes. Consulte [THIRD_PARTY_NOTICES](https://github.com/horang-corp/avr-gcc-wasm/blob/main/THIRD_PARTY_NOTICES.md).

Sem tokens, chaves ou credenciais embutidos no código.
