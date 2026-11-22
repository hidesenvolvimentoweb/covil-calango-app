import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { ComandaDTO } from '../model/comanda.dto';
import { fromStatusComandaEnumValue, StatusComandaEnum } from '../enums/status-comanda.enum';
import { KEY_COMANDA, KEY_TOKEN, KEY_USUARIO, StorageService } from './storage.service';
import { WebsocketService } from './websocket.service';
import { ModalHistoricoService } from './modal-historico.service';

/** Tópico do websocket que avisa quando a comanda é fechada. */
export const topicoComanda = (numeroComanda: number | string) => `/topic/comandas/${numeroComanda}`;

/**
 * Controla a sessão do cliente, que dura enquanto a comanda estiver aberta.
 * Quando a comanda é fechada (pelo pagamento no app ou pela equipe no balcão), a sessão expira
 * e o app volta para a tela de geração de comanda. O cliente não fecha a comanda sem pagar.
 */
@Injectable({ providedIn: 'root' })
export class SessaoService {

  private cancelarEscutaComanda?: () => void;
  private tratamentoDoFechamento?: () => void;

  constructor(
    private storageService: StorageService,
    private websocketService: WebsocketService,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private modalHistoricoService: ModalHistoricoService
  ) {}

  static isComandaFechada(comanda?: ComandaDTO | null): boolean {
    return comanda?.status === fromStatusComandaEnumValue(StatusComandaEnum.FECHADA);
  }

  /**
   * Passa a escutar o fechamento da comanda atual. Se ela já estiver fechada ao se inscrever,
   * a API avisa na hora (ex.: o aparelho estava offline no momento do fechamento).
   */
  monitorarComanda(): void {
    const numeroComanda = this.storageService.getNumeroDaComanda();
    this.pararMonitoramento();
    if (!numeroComanda) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaComanda = this.websocketService.subscribeToTopic(topicoComanda(numeroComanda), body => {
      const comanda: ComandaDTO = WebsocketService.formatResponse(body);
      if (!SessaoService.isComandaFechada(comanda)) {
        return;
      }
      if (this.tratamentoDoFechamento) {
        this.tratamentoDoFechamento();
      } else {
        void this.encerrarSessao(true);
      }
    });
  }

  /**
   * Substitui o tratamento padrão do fechamento da comanda (aviso genérico e volta ao login). Usado pelo
   * pagamento: com o PIX aprovado a comanda fecha, e a tela de pagamento exibe a confirmação antes de encerrar.
   *
   * @param tratamento undefined restaura o tratamento padrão.
   */
  definirTratamentoDoFechamento(tratamento?: () => void): void {
    this.tratamentoDoFechamento = tratamento;
  }

  /**
   * Expira a sessão do cliente: limpa os dados da comanda e volta para a geração de comanda.
   *
   * @param avisarUsuario exibe o aviso de que a comanda foi finalizada.
   */
  async encerrarSessao(avisarUsuario = false): Promise<void> {
    const possuiaSessao = !!this.storageService.get(KEY_COMANDA) || !!this.storageService.get(KEY_USUARIO);
    this.pararMonitoramento();
    this.tratamentoDoFechamento = undefined;
    this.storageService.remove(KEY_USUARIO);
    this.storageService.remove(KEY_COMANDA);
    this.storageService.remove(KEY_TOKEN);
    if (!possuiaSessao) {
      return;
    }

    await this.fecharModais();
    await this.router.navigate(['login'], { replaceUrl: true });
    if (avisarUsuario) {
      const alert = await this.alertController.create({
        header: 'Comanda finalizada',
        message: 'Sua comanda foi finalizada. Para continuar, gere uma nova comanda.',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  private pararMonitoramento(): void {
    this.cancelarEscutaComanda?.();
    this.cancelarEscutaComanda = undefined;
  }

  private async fecharModais(): Promise<void> {
    let modal = await this.modalController.getTop();
    while (modal && await modal.dismiss()) {
      modal = await this.modalController.getTop();
    }
    // Garante que o histórico dos modais já foi desfeito antes de navegar (senão o
    // history.back() pendente desfaria a navegação para o login).
    await this.modalHistoricoService.aguardarHistorico();
  }

}
