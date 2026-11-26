export type StatusPacote = 'AGUARDANDO_RETIRADA' | 'RETIRADO' | 'CANCELADO';

export const ROTULO_STATUS_PACOTE: Record<StatusPacote, string> = {
  AGUARDANDO_RETIRADA: 'Aguardando retirada',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
};

/** Pacote deixado na loja com a comanda deste aparelho (GET /api/pacote/meus). */
export interface PacoteDTO {
  id: number;
  /** Código que quem vai receber informa ao atendente. */
  codigo: string;
  categoria: string;
  descricao: string;
  destinatario: string;
  status: StatusPacote;
  valorTaxa?: number | null;
  fotoDeposito?: string | null;
  dataHoraDeposito?: string;
  dataHoraRetirada?: string | null;
  dataHoraCancelamento?: string | null;
}

export interface CategoriaPacoteDTO {
  valor: string;
  rotulo: string;
}

/** Taxa por pacote (parâmetro PACOTE_VALOR) e o que pode ser deixado. */
export interface PacoteConfiguracaoDTO {
  valorTaxa: number;
  categorias: CategoriaPacoteDTO[];
}
