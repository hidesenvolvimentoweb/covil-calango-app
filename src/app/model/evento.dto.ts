import { TipoEventoEnum } from '../enums/tipo-evento.enum';

/**
 * Evento da loja. As datas vêm sem fuso ('2026-11-28T19:00:00'): são o horário local do estabelecimento,
 * exatamente como cadastrado no web.
 */
export class EventoDTO {
  public id?: number;
  public nome?: string;
  public tipo?: TipoEventoEnum;
  public descricao?: string | null;
  public dataHoraInicio?: string;
  public dataHoraFim?: string;
  /** Nulo: evento gratuito. */
  public valorInscricao?: number | null;
  /** Nulo: sem limite de participantes. */
  public vagas?: number | null;
  /** Inscrições feitas pelo app. */
  public totalParticipantes?: number;
  /** A comanda deste aparelho está inscrita no evento. */
  public participando?: boolean | null;
}

/** Participante de um evento (o app recebe só o nome). */
export interface EventoParticipanteDTO {
  id: number;
  nome: string;
  dataHoraInscricao: string;
  /** A inscrição é da comanda deste aparelho. */
  voce: boolean;
}

/** Inscrições abertas: o evento é de hoje e ainda não terminou (a API faz a mesma validação). */
export const inscricoesAbertas = (evento?: EventoDTO, agora = new Date()): boolean => {
  if (!evento?.dataHoraInicio || !evento?.dataHoraFim) {
    return false;
  }
  const inicioDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioDeAmanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const inicio = new Date(evento.dataHoraInicio);
  const fim = new Date(evento.dataHoraFim);
  return inicio < inicioDeAmanha && fim > inicioDeHoje && fim > agora;
};

/** Todas as vagas preenchidas. */
export const vagasEsgotadas = (evento?: EventoDTO): boolean =>
  !!evento?.vagas && (evento.totalParticipantes ?? 0) >= evento.vagas;
