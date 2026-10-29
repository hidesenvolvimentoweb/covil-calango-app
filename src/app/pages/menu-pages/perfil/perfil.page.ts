import { Component, Injector } from '@angular/core';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalEditarPerfilPage } from './modal-editar-perfil/modal-editar-perfil.page';
import { ModalInformacoesPage } from './modal-informacoes/modal-informacoes.page';
import { KEY_USUARIO, StorageService } from 'src/app/services/storage.service';
import { ComandaService } from 'src/app/services/comanda.service';
import { ParametrosService } from 'src/app/services/parametros.service';
import { AppComponent } from 'src/app/app.component';
import { Platform } from '@ionic/angular';
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
    private storageService: StorageService,
    private comandaService: ComandaService,
    private parametrosService: ParametrosService,
    private platform: Platform
  ) {
    super(injector);
    this.platform.backButton.subscribeWithPriority(0, async () => {
      if (this.modalAberto) {
        await this.modalAberto.dismiss();
      } else {
        window.history.back();
      }
    });
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

  async openModalRegrasPermanencia() {
    this.parametrosService.getByName(PARAMETRO_REGRA_PERMANENCIA).subscribe(async res => {
      this.modalAberto  = await this.modalController.create({
        component: ModalInformacoesPage,
        breakpoints: [0.8, 1],
        initialBreakpoint: 0.8,
        componentProps: {
          title: 'Regras de Permanência',
          content: res.descricao
        }
      });
      await this.modalAberto.present();
    });
  }

  async openModalInformacoesCalango() {
    this.parametrosService.getByName(PARAMETRO_INFORMACOES_CALANGO).subscribe(async res => {
      this.modalAberto = await this.modalController.create({
        component: ModalInformacoesPage,
        breakpoints: [0.8, 1],
        initialBreakpoint: 0.8,
        componentProps: {
          title: 'Sobre a Covil',
          content: res.descricao
        }
      });
      await this.modalAberto.present();
    });
  }

  async sair() {
    const alert = await this.alertController.create({
      message: `Ao sair, sua comanda será encerrada, vá até ao balcão para realizar o pagamento, ok?`,
      buttons: [
        {
          text: 'Certo, estou indo!',
          handler: () => {
            this.comandaService.fecharComanda(this.storageService.getNumeroDaComanda()).subscribe(() => {
              this.storageService.remove(KEY_USUARIO);
              this.modalController.dismiss();
              this.router.navigate(['login']);
            });
          }
        }
      ]
    });
    await alert.present();
  }

}
