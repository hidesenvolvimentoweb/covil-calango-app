import { CategoriaProdutoEnum } from '../enums/categoria-produto.enum';

export class ProdutoDTO {
  public id?: number;
  public nome?: string;
  public categoria?: CategoriaProdutoEnum;
  public imagem?: string;
  public valor?: number;
  public ingredientes?: string;
  public prazo?: number;
  /**
   * Quantas unidades podem ser pedidas de uma vez (limite por pedido, reduzido pelo estoque). Zero: esgotado.
   * O estoque em si não é enviado pela API.
   */
  public quantidadeMaximaPedido?: number;
}
