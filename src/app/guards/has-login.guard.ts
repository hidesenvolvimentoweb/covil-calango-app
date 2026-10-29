import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { KEY_USUARIO, StorageService } from '../services/storage.service';
import { UsuarioDTO } from '../model/usuario.dto';

@Injectable({ providedIn: 'root' })
export class HasLoginGuard implements CanActivate {

  constructor(private storageService: StorageService, private router: Router) {}

  canActivate() {
    const isLoggedIn = this.storageService.get(KEY_USUARIO) as UsuarioDTO | null;
    if (isLoggedIn) {
      this.router.navigate(['home']);
      return false;
    }
    return true;
  }

}
