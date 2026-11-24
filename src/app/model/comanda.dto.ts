import { UsuarioDTO } from './usuario.dto';

export class ComandaDTO {
  public id?: number;
  public numero?: number | string;
  public usuario?: UsuarioDTO;
  /** Nome informado ao gerar a comanda (as comandas de visitante não têm usuário). */
  public nomeCliente?: string;
  public dataHoraEntrada?: Date;
  public dataHoraSaida?: Date;
  public status?: string;
}
