import { Component, Injector } from '@angular/core';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalEditarPerfilPage } from './modal-editar-perfil/modal-editar-perfil.page';
import { ModalInformacoesPage } from './modal-informacoes/modal-informacoes.page';
import { KEY_USUARIO, StorageService } from 'src/app/services/storage.service';
import { AppComponent } from 'src/app/app.component';
import { UsuarioDTO } from 'src/app/model/usuario.dto';

const PARAMETRO_REGRA_PERMANENCIA = 'PARAMETRO_REGRA_PERMANENCIA';
const PARAMETRO_INFORMACOES_CALANGO = 'PARAMETRO_INFORMACOES_CALANGO';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage extends GenericClass {

  public usuario: UsuarioDTO | null = null;
  public modalAberto!: HTMLIonModalElement;

  constructor(
    public injector: Injector,
    private storageService: StorageService
  ) {
    super(injector);
    this.usuario = this.storageService.get(KEY_USUARIO);
  }

  get version() {
    return AppComponent.version;
  }

  async openModalPerfil() {
    (await this.modalController.create({
      component: ModalEditarPerfilPage,
      breakpoints: [0.8, 1],
      initialBreakpoint: 0.8
    })).present();
  }

  openModalRegrasPermanencia() {
    return this.openModalInformacoes('Regras de Permanência', PARAMETRO_REGRA_PERMANENCIA);
  }

  openModalInformacoesCalango() {
    return this.openModalInformacoes('Sobre a Covil', PARAMETRO_INFORMACOES_CALANGO);
  }

  /** Abre o modal na hora; o conteúdo é carregado nele, exibindo skeleton enquanto isso. */
  private async openModalInformacoes(title: string, nomeParametro: string) {
    this.modalAberto = await this.modalController.create({
      component: ModalInformacoesPage,
      breakpoints: [0.8, 1],
      initialBreakpoint: 0.8,
      componentProps: { title, nomeParametro }
    });
    await this.modalAberto.present();
  }

}
