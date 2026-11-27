/* eslint-disable @typescript-eslint/naming-convention */
/** Status do pagamento, como devolvido pela API (StatusPagamentoEnum). */
export enum StatusPagamentoEnum {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  EXPIRADO = 'EXPIRADO',
  CANCELADO = 'CANCELADO',
  /** Cartão recusado (pelo banco ou pela análise de segurança); a comanda continua aberta. */
  RECUSADO = 'RECUSADO',
  ESTORNADO = 'ESTORNADO'
}

/** Forma do pagamento, como devolvida pela API (MetodoPagamentoEnum). */
export enum MetodoPagamentoEnum {
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTEIRA_MERCADO_PAGO = 'CARTEIRA_MERCADO_PAGO'
}
