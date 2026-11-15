/* eslint-disable @typescript-eslint/naming-convention */
export enum CategoriaProdutoEnum {
  HAMBURGUER = 'HAMBURGUER',
  BEBIDAS = 'BEBIDAS',
  DOCES = 'DOCES',
  GELADOS = 'GELADOS',
  COMBOS = 'COMBOS',
  OUTROS = 'OUTROS'
}

export const fromCategoriaProdutoEnumValue = (categoria?: string | null): string => {
  switch (categoria) {
    case CategoriaProdutoEnum.HAMBURGUER:
      return 'Hamburguer';
    case CategoriaProdutoEnum.BEBIDAS:
      return 'Bebidas';
    case CategoriaProdutoEnum.DOCES:
      return 'Doces';
    case CategoriaProdutoEnum.GELADOS:
      return 'Gelados';
    case CategoriaProdutoEnum.COMBOS:
      return 'Combos';
    case CategoriaProdutoEnum.OUTROS:
      return 'Outros';
    default:
      return '';
  }
};

export const getIconeCategoriaProduto = (categoria?: string | null): string => {
  switch (categoria) {
    case CategoriaProdutoEnum.HAMBURGUER:
      return 'fast-food-outline';
    case CategoriaProdutoEnum.BEBIDAS:
      return 'water-outline';
    case CategoriaProdutoEnum.DOCES:
      return 'ice-cream-outline';
    case CategoriaProdutoEnum.GELADOS:
      return 'snow-outline';
    case CategoriaProdutoEnum.COMBOS:
      return 'pizza-outline';
    default:
      return 'restaurant-outline';
  }
};
