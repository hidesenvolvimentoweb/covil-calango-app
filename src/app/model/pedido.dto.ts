import { ProdutoDTO } from './produtos.dto';

export class PedidoDTO {
  public id?: number;
  public status?: string;
  public dataHora?: Date;
  public observacao?: string;
  public produto?: ProdutoDTO;
  /** Nome do item sem produto, como a inscrição em um evento ("Evento - Torneio Locals"). */
  public descricao?: string;
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

/** Nome do item na comanda: o do produto ou, nos itens avulsos (evento, pacote), a descrição gravada pela API. */
export function nomeDoPedido(pedido: PedidoDTO): string {
  return pedido.produto?.nome ?? pedido.descricao ?? '';
}

/** Item sem produto (inscrição em evento, taxa de pacote): entra na comanda, mas não é um pedido da cozinha. */
export function isItemAvulso(pedido: PedidoDTO): boolean {
  return !pedido.produto && !!pedido.descricao;
}

/** Taxa de um pacote deixado na loja (a API grava a descrição "Pacote CODIGO"). */
export function isTaxaPacote(pedido: PedidoDTO): boolean {
  return isItemAvulso(pedido) && pedido.descricao!.startsWith('Pacote ');
}
