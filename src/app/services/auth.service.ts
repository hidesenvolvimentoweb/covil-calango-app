import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginDTO } from '../model/login.dto';
import { UsuarioDTO } from '../model/usuario.dto';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly urlController = `${environment.url}/api/auth`;

  constructor(private httpClient: HttpClient) { }

  login(body: LoginDTO): Observable<UsuarioDTO> {
    return this.httpClient.post<UsuarioDTO>(`${this.urlController}/login`, body);
  }
}
