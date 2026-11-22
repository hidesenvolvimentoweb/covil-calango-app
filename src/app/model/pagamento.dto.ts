import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';

export class PagamentoDTO {
  public id?: number;
  public comanda?: string;
  public metodo?: string;
  public status?: StatusPagamentoEnum;
  /** Valor cobrado, calculado pela API. */
  public valor?: number;
  /** Código "copia e cola"; presente somente enquanto o pagamento está pendente. */
  public pixCopiaECola?: string;
  /** Imagem PNG do QR Code em Base64 (sem o prefixo data:); somente enquanto pendente. */
  public pixQrCodeBase64?: string;
  public dataHoraCriacao?: string;
  public dataHoraExpiracao?: string;
  public dataHoraPagamento?: string;
}
