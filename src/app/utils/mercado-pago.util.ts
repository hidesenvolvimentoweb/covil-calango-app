/** SDK JS do Mercado Pago (formulário de cartão). Carregado só quando o cliente vai pagar com cartão. */
const URL_SDK = 'https://sdk.mercadopago.com/js/v2';

let carregamento: Promise<any> | null = null;

/**
 * Carrega o SDK do Mercado Pago uma única vez e devolve o construtor `MercadoPago`.
 * O formulário roda em iframes do próprio Mercado Pago: o número, a validade e o código de segurança do cartão nunca
 * passam pelo app nem pela API, que recebem apenas um token de uso único.
 */
export const carregarMercadoPago = (): Promise<any> => {
  const existente = (window as any).MercadoPago;
  if (existente) {
    return Promise.resolve(existente);
  }
  if (!carregamento) {
    carregamento = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = URL_SDK;
      script.async = true;
      script.onload = () => {
        const sdk = (window as any).MercadoPago;
        if (sdk) {
          resolve(sdk);
        } else {
          carregamento = null;
          reject(new Error('SDK do Mercado Pago indisponível'));
        }
      };
      script.onerror = () => {
        // Permite tentar de novo (ex.: o aparelho estava sem internet).
        carregamento = null;
        script.remove();
        reject(new Error('Não foi possível carregar o SDK do Mercado Pago'));
      };
      document.head.appendChild(script);
    });
  }
  return carregamento;
};

/**
 * Abre um endereço fora do app (ex.: o checkout do Mercado Pago). No aparelho, o sistema abre o app do Mercado Pago ou
 * o navegador (InAppBrowser com _system) e o app continua aberto por trás; ao fim do pagamento, a página de retorno da
 * API reabre o app pelo deep link covilcalango://. Sem o plugin, a navegação é entregue ao sistema
 * (config.xml: allow-intent https). No navegador (desenvolvimento), abre em outra aba.
 */
export const abrirLinkExterno = (url: string): void => {
  if (!/^https:\/\//i.test(url)) {
    return;
  }
  const cordova = (window as any).cordova;
  if (cordova?.InAppBrowser) {
    cordova.InAppBrowser.open(url, '_system');
  } else if (cordova) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
};

/**
 * Envia o desafio da verificação do banco (3DS) para o iframe informado: o banco exibe a confirmação (código por SMS,
 * app do banco...) dentro do app.
 */
export const enviarDesafio3ds = (url: string, creq: string, nomeDoIframe: string): boolean => {
  if (!/^https:\/\//i.test(url) || !creq) {
    return false;
  }
  const formulario = document.createElement('form');
  formulario.method = 'POST';
  formulario.action = url;
  formulario.target = nomeDoIframe;
  formulario.style.display = 'none';
  const campo = document.createElement('input');
  campo.type = 'hidden';
  campo.name = 'creq';
  campo.value = creq;
  formulario.appendChild(campo);
  document.body.appendChild(formulario);
  formulario.submit();
  formulario.remove();
  return true;
};
