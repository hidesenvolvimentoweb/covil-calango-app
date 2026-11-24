/* eslint-disable @typescript-eslint/naming-convention */
export enum TipoEventoEnum {
  TORNEIO = 'TORNEIO',
  BOARD_GAMES = 'BOARD_GAMES',
  OUTROS = 'OUTROS'
}

export const fromTipoEventoEnumValue = (tipo?: string | null): string => {
  switch (tipo) {
    case TipoEventoEnum.TORNEIO:
      return 'Torneio';
    case TipoEventoEnum.BOARD_GAMES:
      return 'Board Games';
    case TipoEventoEnum.OUTROS:
      return 'Outros';
    default:
      return '';
  }
};

export const getIconeTipoEvento = (tipo?: string | null): string => {
  switch (tipo) {
    case TipoEventoEnum.TORNEIO:
      return 'trophy-outline';
    case TipoEventoEnum.BOARD_GAMES:
      return 'dice-outline';
    default:
      return 'sparkles-outline';
  }
};

/** Cor do evento no calendário (a mesma do web), escura o bastante para o texto branco. */
export const getCorTipoEvento = (tipo?: string | null): string => {
  switch (tipo) {
    case TipoEventoEnum.TORNEIO:
      return '#1b7f4b';
    case TipoEventoEnum.BOARD_GAMES:
      return '#2f6fb3';
    default:
      return '#7b4fb5';
  }
};
