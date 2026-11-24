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
}
