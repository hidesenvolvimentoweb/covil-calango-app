import { Component, Injector, OnInit } from '@angular/core';
import { ComandaDTO } from 'src/app/model/comanda.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { UsuarioDTO } from 'src/app/model/usuario.dto';
import { KEY_COMANDA, KEY_USUARIO, StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage extends GenericClass implements OnInit {

  public usuario!: UsuarioDTO | null;
  public comanda!: ComandaDTO | null;

  constructor(
    public injector: Injector,
    private storageService: StorageService
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.usuario = this.storageService.get(KEY_USUARIO) as UsuarioDTO | null;
    this.comanda = this.storageService.get(KEY_COMANDA) as ComandaDTO | null;
  }

}
