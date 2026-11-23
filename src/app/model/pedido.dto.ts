import { ProdutoDTO } from './produtos.dto';

export class PedidoDTO {
  public id?: number;
  public status?: string;
  public dataHora?: Date;
  public observacao?: string;
  public produto?: ProdutoDTO;
  public quantidade?: number;
  public comanda?: string;
  /** Preço do produto no momento do pedido (gravado pela API). */
  public valorUnitario?: number;

  constructor(formGroupValue?: any) {
    this.observacao = formGroupValue?.observacao;
    this.quantidade = formGroupValue?.quantidade;
    this.produto = formGroupValue?.produto;
    this.comanda = formGroupValue?.comanda;
  }
}

/**
 * Preço cobrado por unidade: o gravado no pedido, que não muda quando o preço do produto muda depois.
 * Os pedidos vêm da API como objetos simples, por isso é uma função e não um método da classe.
 */
export function precoUnitario(pedido: PedidoDTO): number {
  return pedido.valorUnitario ?? pedido.produto?.valor ?? 0;
}

export function valorDoPedido(pedido: PedidoDTO): number {
  return precoUnitario(pedido) * (pedido.quantidade ?? 0);
}
