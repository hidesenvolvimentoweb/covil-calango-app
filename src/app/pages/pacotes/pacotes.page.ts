import { Component, Injector } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { GenericClass } from 'src/app/model/generic.class';
import { PacoteConfiguracaoDTO, PacoteDTO, ROTULO_STATUS_PACOTE } from 'src/app/model/pacote.dto';
import { PacoteService } from 'src/app/services/pacote.service';
import { resolverUrlImagem } from 'src/app/utils/imagem.util';
import { ModalDeixarPacotePage } from './modal-deixar-pacote/modal-deixar-pacote.page';

/**
 * Pacotes que o cliente deixa na loja para outra pessoa retirar. Cada pacote tem um código: quem vai receber o
 * informa ao atendente na retirada.
 */
@Component({
  selector: 'app-pacotes',
  templateUrl: './pacotes.page.html',
  styleUrls: ['./pacotes.page.scss'],
})
export class PacotesPage extends GenericClass implements ViewWillEnter {

  public pacotes: PacoteDTO[] = [];
  public configuracao?: PacoteConfiguracaoDTO;
  public carregando = true;
  public cancelando?: number;
  public readonly rotuloStatus = ROTULO_STATUS_PACOTE;

  constructor(
    public injector: Injector,
    private pacoteService: PacoteService
  ) {
    super(injector);
  }

  ionViewWillEnter(): void {
    this.carregar(true);
    this.pacoteService.getConfiguracao().subscribe({ next: res => (this.configuracao = res) });
  }

  get aguardando(): PacoteDTO[] {
    return this.pacotes.filter(pacote => pacote.status === 'AGUARDANDO_RETIRADA');
  }

  get historico(): PacoteDTO[] {
    return this.pacotes.filter(pacote => pacote.status !== 'AGUARDANDO_RETIRADA');
  }

  rotuloCategoria(categoria: string): string {
    return this.configuracao?.categorias.find(opcao => opcao.valor === categoria)?.rotulo ?? categoria;
  }

  urlFoto(caminho?: string | null): string | null {
    return resolverUrlImagem(caminho);
  }

  async deixarPacote(): Promise<void> {
    const modal = await this.modalController.create({
      component: ModalDeixarPacotePage,
      breakpoints: [0.92, 1],
      initialBreakpoint: 0.92,
      componentProps: { configuracao: this.configuracao },
    });
    void modal.onDidDismiss().then(() => this.carregar(false));
    await modal.present();
  }

  /** Mostra o código grande, para quem deixou repassar a quem vai receber. */
  async mostrarCodigo(pacote: PacoteDTO): Promise<void> {
    const alerta = await this.alertController.create({
      header: `Código: ${pacote.codigo}`,
      message: `Envie este código para ${pacote.destinatario}. Na retirada, o atendente vai pedir o código.`,
      cssClass: 'pacote-codigo-alert',
      buttons: ['OK'],
    });
    await alerta.present();
  }

  async cancelar(pacote: PacoteDTO): Promise<void> {
    if (this.cancelando != null) {
      return;
    }
    const taxa = pacote.valorTaxa ? ' A taxa do pacote será removida da sua comanda.' : '';
    const alerta = await this.alertController.create({
      header: 'Cancelar pacote',
      message: `Você pegou o item de volta? Deseja cancelar o pacote para ${pacote.destinatario}?${taxa}`,
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Cancelar pacote',
          handler: () => {
            this.cancelando = pacote.id;
            this.pacoteService.cancelar(pacote.id).subscribe({
              next: () => {
                this.cancelando = undefined;
                this.carregar(false);
              },
              // A mensagem da API (comanda fechada, PIX pendente...) é exibida pelo interceptor de erros.
              error: () => {
                this.cancelando = undefined;
                this.carregar(false);
              }
            });
          }
        }
      ]
    });
    await alerta.present();
  }

  private carregar(skeleton: boolean): void {
    this.carregando = skeleton;
    this.pacoteService.getMeus().subscribe({
      next: res => {
        this.pacotes = res;
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
  }

}
