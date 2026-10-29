import { PerfilDTO } from './perfil.dto';

export class UsuarioDTO {
  public id?: number;
  public nome?: string;
  public contato?: string;
  public token?: string;
  public email?: string;
  public perfis?: PerfilDTO[];

  constructor(usuario?: Partial<UsuarioDTO>) {
    this.id = usuario?.id;
    this.nome = usuario?.nome;
    this.contato = usuario?.contato;
    this.token = usuario?.token;
    this.email = usuario?.email;
    this.perfis = usuario?.perfis;
  }
}
