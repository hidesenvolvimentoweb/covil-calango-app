import { MetodoPagamentoEnum, StatusPagamentoEnum } from '../enums/status-pagamento.enum';

export class PagamentoDTO {
  public id?: number;
  public comanda?: string;
  public metodo?: MetodoPagamentoEnum;
  public status?: StatusPagamentoEnum;
  /** Valor cobrado, calculado pela API. */
  public valor?: number;
  /** Código "copia e cola"; presente somente enquanto o pagamento está pendente. */
  public pixCopiaECola?: string;
  /** Imagem PNG do QR Code em Base64 (sem o prefixo data:); somente enquanto pendente. */
  public pixQrCodeBase64?: string;
  /** Link para pagar na conta do Mercado Pago; somente enquanto pendente. */
  public urlCheckout?: string;
  /** Verificação do banco (3DS) pendente: endereço e dados do desafio. Só na resposta da cobrança. */
  public desafioUrl?: string;
  public desafioCreq?: string;
  /** Bandeira (ex.: visa) e últimos 4 dígitos do cartão. */
  public cartaoBandeira?: string;
  public cartaoFinal?: string;
  /** CREDITO ou DEBITO, conforme o cartão usado. */
  public cartaoTipo?: 'CREDITO' | 'DEBITO';
  /** Motivo da recusa do cartão, em texto para o cliente. */
  public mensagemRecusa?: string;
  /** Resultado do pedido para salvar o cartão neste celular; ausente quando não foi pedido. */
  public cartaoSalvo?: boolean;
  public dataHoraCriacao?: string;
  public dataHoraExpiracao?: string;
  public dataHoraPagamento?: string;
}

/** Formas de pagamento disponíveis no app (GET /api/pagamento/configuracao). */
export interface PagamentoConfiguracaoDTO {
  pix: boolean;
  /** Cartão digitado no formulário do Mercado Pago. */
  cartao: boolean;
  /** Pagar na conta do Mercado Pago (cartão salvo lá). */
  mercadoPago: boolean;
  /** Chave pública do Mercado Pago, usada pelo formulário de cartão. */
  publicKey?: string;
}

/** Dados que o formulário do Mercado Pago entrega para a cobrança (o cartão vem como token). */
export interface PagamentoCartaoRequestDTO {
  token: string;
  bandeira: string;
  emissorId?: string;
  /** E-mail e documento do titular: o formulário não pede de novo quando o cartão é um cartão salvo. */
  email?: string;
  tipoDocumento?: string;
  documento?: string;
  /** Salvar o cartão neste celular para as próximas compras. */
  salvarCartao?: boolean;
}

/** Cartão salvo neste celular (o número completo e o código de segurança ficam no Mercado Pago). */
export interface CartaoSalvoDTO {
  id: string;
  /** payment_method_id (ex.: visa, master). */
  bandeira?: string;
  nomeBandeira?: string;
  /** credit_card ou debit_card. */
  tipo?: string;
  finalCartao?: string;
  mesValidade?: number;
  anoValidade?: number;
}

/** Cartões salvos neste celular (GET /api/pagamento/cartoes). */
export interface CartoesSalvosDTO {
  /** Cliente no Mercado Pago, exigido pelo formulário para mostrar os cartões; ausente sem cartões salvos. */
  clienteId?: string;
  cartoes: CartaoSalvoDTO[];
}
