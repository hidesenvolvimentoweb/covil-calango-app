import { Component, OnInit } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { KEY_USUARIO, StorageService } from './services/storage.service';
import { WebsocketService } from './services/websocket.service';
import { SessaoService } from './services/sessao.service';
import packageJson from '../../package.json';

/**
 * Prioridade acima da dos overlays do Ionic (100) e da navegação do router (0):
 * o botão voltar fecha primeiro o modal aberto e só depois volta de tela.
 */
const PRIORIDADE_VOLTAR_MODAL = 101;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  public usuario: any | null;

  constructor(
    private storageService: StorageService,
    private websocketService: WebsocketService,
    private sessaoService: SessaoService,
    private platform: Platform,
    private modalController: ModalController
  ) {
    this.usuario = this.storageService.get(KEY_USUARIO);
  }

  static get version() {
    return packageJson.version;
  }

  ngOnInit(): void {
    this.websocketService.createWebSocketConnection().subscribe();
    this.sessaoService.monitorarComanda();
    this.configurarBotaoVoltar();
  }

  /**
   * Botão voltar do celular: se houver modal aberto, fecha apenas o modal;
   * sem modal, segue para os demais handlers (alertas do Ionic e, por fim, voltar de tela).
   */
  private configurarBotaoVoltar(): void {
    this.platform.backButton.subscribeWithPriority(PRIORIDADE_VOLTAR_MODAL, async processNextHandler => {
      const modal = await this.modalController.getTop();
      if (modal) {
        await modal.dismiss();
        return;
      }
      processNextHandler();
    });
  }

}
