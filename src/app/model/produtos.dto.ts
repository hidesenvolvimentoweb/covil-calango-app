import { CategoriaProdutoEnum } from '../enums/categoria-produto.enum';

export class ProdutoDTO {
  public id?: number;
  public nome?: string;
  public categoria?: CategoriaProdutoEnum;
  public imagem?: string;
  public valor?: number;
  public ingredientes?: string;
  public prazo?: number;
}
