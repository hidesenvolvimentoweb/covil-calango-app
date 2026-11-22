/* eslint-disable @typescript-eslint/naming-convention */
/** Status do pagamento, como devolvido pela API (StatusPagamentoEnum). */
export enum StatusPagamentoEnum {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  EXPIRADO = 'EXPIRADO',
  CANCELADO = 'CANCELADO',
  ESTORNADO = 'ESTORNADO'
}
