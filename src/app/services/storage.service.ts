import { Injectable } from '@angular/core';
import { UsuarioDTO } from '../model/usuario.dto';

export const KEY_USUARIO = 'USUARIO';
export const KEY_COMANDA = 'COMANDA';
/** Token do visitante, enviado no cabeçalho Authorization das chamadas à API. */
export const KEY_TOKEN = 'TOKEN';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  getNumeroDaComanda(): number | string {
    return this.get<any>(KEY_COMANDA)?.numero || '';
  }

  /**
   * Usuário da sessão. As comandas de visitante não têm usuário: sem nome gravado, usa o nome informado na comanda
   * (sessões abertas antes da correção gravaram o usuário vazio).
   */
  getUsuario(): UsuarioDTO | null {
    const usuario = this.get<UsuarioDTO>(KEY_USUARIO);
    if (usuario?.nome) {
      return usuario;
    }
    const nomeCliente = this.get<any>(KEY_COMANDA)?.nomeCliente;
    return nomeCliente ? new UsuarioDTO({ ...usuario, nome: nomeCliente }) : usuario;
  }

  get<T>(key: string): T | null {
    const now = Date.now();
    const expiresIn = localStorage.getItem(`${key}_expiresIn`);
    const expirationTime = expiresIn ? parseInt(expiresIn, 10) : 0;

    if (expirationTime < now) {
      this.remove(key);
      return null;
    } else {
      const value = localStorage.getItem(key);
      if (!value) {
        return null;
      };
      return JSON.parse(value) as T;
    }
  }

  set(key: string, value: any, expires: number | undefined = 24 * 60 * 60): void {
    expires = expires ? Math.abs(expires) : 24 * 60 * 60;

    const now = Date.now();
    const schedule = now + expires * 1000;

    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(`${key}_expiresIn`, schedule.toString());
  }

  remove(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_expiresIn`);
  }
}
