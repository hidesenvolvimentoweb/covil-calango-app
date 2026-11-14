/* eslint-disable @typescript-eslint/naming-convention */
export enum StatusComandaEnum {
  EM_ANALISE = 'EM_ANALISE',
  ABERTA = 'ABERTA',
  FECHADA = 'FECHADA'
}

export const fromStatusComandaEnumValue = (status: string): string => {
  switch (status) {
    case StatusComandaEnum.EM_ANALISE:
      return 'Em Análise';
    case StatusComandaEnum.ABERTA:
      return 'Aberta';
    case StatusComandaEnum.FECHADA:
      return 'Fechada';
    default:
      return '';
  }
};
