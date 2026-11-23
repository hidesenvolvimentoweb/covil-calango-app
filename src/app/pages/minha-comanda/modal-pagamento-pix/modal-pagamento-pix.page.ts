import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { PagamentoDTO } from 'src/app/model/pagamento.dto';
import { StatusPagamentoEnum } from 'src/app/enums/status-pagamento.enum';
import { PagamentoService, topicoPagamentosDaComanda } from 'src/app/services/pagamento.service';
import { SessaoService } from 'src/app/services/sessao.service';
import { StorageService } from 'src/app/services/storage.service';
import { WebsocketService } from 'src/app/services/websocket.service';

/** Etapas da tela: gerando o PIX, aguardando o pagamento, pago, PIX encerrado (expirado/cancelado) ou erro. */
export type EtapaPagamento = 'gerando' | 'pendente' | 'pago' | 'encerrado' | 'erro';

/** Consulta periódica do pagamento, caso a confirmação pelo websocket não chegue (ex.: reconexão). */
const INTERVALO_CONSULTA_MS = 10000;
/** Abaixo disso a contagem regressiva fica em destaque. */
const SEGUNDOS_ALERTA_EXPIRACAO = 120;
const TEMPO_EXIBICAO_COPIADO_MS = 3000;

/**
 * Pagamento da comanda via PIX: exibe o QR Code e o "copia e cola" e aguarda a confirmação da API, que chega pelo
 * websocket (/topic/pagamentos/{comanda}). Com o pagamento aprovado a comanda é fechada pela API; ao concluir,
 * a sessão é encerrada e o app volta para a geração de comanda.
 */
@Component({
  selector: 'app-modal-pagamento-pix',
  templateUrl: './modal-pagamento-pix.page.html',
  styleUrls: ['./modal-pagamento-pix.page.scss'],
})
export class ModalPagamentoPixPage implements OnInit, OnDestroy {

  public etapa: EtapaPagamento = 'gerando';
  public pagamento: PagamentoDTO | null = null;
  public tempoRestante = '';
  public segundosRestantes = 0;
  public expiradoNoAparelho = false;
  public copiado = false;
  public cancelando = false;

  private numeroComanda: string | number;
  private cancelarEscutaPagamento?: () => void;
  private timerContagem?: ReturnType<typeof setInterval>;
  private timerConsulta?: ReturnType<typeof setInterval>;
  private timerCopiado?: ReturnType<typeof setTimeout>;

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private pagamentoService: PagamentoService,
    private sessaoService: SessaoService,
    private storageService: StorageService,
    private websocketService: WebsocketService
  ) { }

  get urlQrCode(): string | null {
    return this.pagamento?.pixQrCodeBase64 ? `data:image/png;base64,${this.pagamento.pixQrCodeBase64}` : null;
  }

  get expirando(): boolean {
    return this.segundosRestantes <= SEGUNDOS_ALERTA_EXPIRACAO;
  }

  get tituloEncerrado(): string {
    if (this.pagamento?.status === StatusPagamentoEnum.ESTORNADO) {
      return 'Pagamento estornado';
    }
    return this.expiradoNoAparelho || this.pagamento?.status === StatusPagamentoEnum.EXPIRADO
      ? 'O PIX expirou'
      : 'PIX cancelado';
  }

  ngOnInit(): void {
    this.numeroComanda = this.storageService.getNumeroDaComanda();
    // A aprovação fecha a comanda: esta tela mostra a confirmação em vez do aviso genérico de comanda finalizada.
    this.sessaoService.definirTratamentoDoFechamento(() => this.aoFecharComanda());
    this.escutarPagamento();
    this.gerarPix();
  }

  ngOnDestroy(): void {
    this.pararTimers();
    clearTimeout(this.timerCopiado);
    this.cancelarEscutaPagamento?.();
    this.sessaoService.definirTratamentoDoFechamento(undefined);
    // Comanda paga e fechada: a sessão termina mesmo se o modal foi fechado pelo gesto ou pelo voltar.
    if (this.etapa === 'pago') {
      void this.sessaoService.encerrarSessao();
    }
  }

  gerarPix(): void {
    this.etapa = 'gerando';
    this.expiradoNoAparelho = false;
    this.pagamentoService.gerarPix(this.numeroComanda).subscribe({
      next: pagamento => this.aplicar(pagamento, true),
      // A mensagem da API (ex.: "Não há valor a pagar") é exibida pelo interceptor de erros.
      error: () => (this.etapa = 'erro')
    });
  }

  async copiarCodigo(): Promise<void> {
    const codigo = this.pagamento?.pixCopiaECola;
    if (!codigo) {
      return;
    }
    const copiou = await this.copiarParaAreaDeTransferencia(codigo);
    if (!copiou) {
      (await this.alertController.create({
        header: 'Não foi possível copiar',
        message: 'Selecione e copie o código manualmente.',
        buttons: ['OK']
      })).present();
      return;
    }
    this.copiado = true;
    clearTimeout(this.timerCopiado);
    this.timerCopiado = setTimeout(() => (this.copiado = false), TEMPO_EXIBICAO_COPIADO_MS);
  }

  async cancelarPix(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cancelar o PIX?',
      message: 'O código atual deixará de valer. Você poderá fazer novos pedidos e gerar outro PIX quando quiser.',
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        { text: 'Cancelar', role: 'destructive', handler: () => this.confirmarCancelamento() }
      ]
    });
    await alert.present();
  }

  fechar(): void {
    void this.modalController.dismiss();
  }

  private confirmarCancelamento(): void {
    this.cancelando = true;
    this.pagamentoService.cancelarPix(this.numeroComanda).subscribe({
      next: pagamento => {
        this.cancelando = false;
        this.aplicar(pagamento, true);
        // Pago antes do cancelamento: permanece na tela para exibir a confirmação.
        if (this.etapa !== 'pago') {
          this.fechar();
        }
      },
      error: () => (this.cancelando = false)
    });
  }

  private escutarPagamento(): void {
    if (!this.numeroComanda) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaPagamento = this.websocketService.subscribeToTopic(topicoPagamentosDaComanda(this.numeroComanda),
      body => this.aplicar(WebsocketService.formatResponse(body), false));
  }

  /**
   * Aplica a situação do pagamento recebida da API. Atualizações de um PIX anterior (ex.: o cancelamento do PIX
   * substituído por um novo) são ignoradas, exceto a aprovação, que sempre vale.
   *
   * @param resposta a resposta veio de uma ação desta tela (gerar/cancelar), e não de uma notificação.
   */
  private aplicar(pagamento: PagamentoDTO | null, resposta: boolean): void {
    if (!pagamento || this.etapa === 'pago') {
      return;
    }
    const pagamentoAnterior = !resposta && this.pagamento?.id && pagamento.id < this.pagamento.id;
    if (pagamentoAnterior && pagamento.status !== StatusPagamentoEnum.PAGO) {
      return;
    }
    // A notificação não traz o QR Code de um pagamento já exibido; preserva o que está na tela.
    this.pagamento = pagamento.id === this.pagamento?.id && !pagamento.pixQrCodeBase64
      ? { ...this.pagamento, ...pagamento, pixQrCodeBase64: this.pagamento.pixQrCodeBase64,
        pixCopiaECola: this.pagamento.pixCopiaECola }
      : pagamento;

    switch (pagamento.status) {
      case StatusPagamentoEnum.PENDENTE:
        this.etapa = 'pendente';
        this.iniciarTimers();
        break;
      case StatusPagamentoEnum.PAGO:
        this.etapa = 'pago';
        this.pararTimers();
        break;
      default:
        this.etapa = 'encerrado';
        this.pararTimers();
    }
  }

  /** A comanda fechou enquanto esta tela estava aberta: pelo pagamento (confirmação) ou pela equipe. */
  private aoFecharComanda(): void {
    this.pagamentoService.consultar(this.numeroComanda).subscribe({
      next: pagamento => {
        if (pagamento?.status === StatusPagamentoEnum.PAGO) {
          this.aplicar(pagamento, false);
        } else {
          void this.sessaoService.encerrarSessao(true);
        }
      },
      error: () => void this.sessaoService.encerrarSessao(true)
    });
  }

  private iniciarTimers(): void {
    this.pararTimers();
    this.atualizarContagem();
    this.timerContagem = setInterval(() => this.atualizarContagem(), 1000);
    this.timerConsulta = setInterval(() => this.consultarEmSegundoPlano(), INTERVALO_CONSULTA_MS);
  }

  private pararTimers(): void {
    clearInterval(this.timerContagem);
    clearInterval(this.timerConsulta);
    this.timerContagem = undefined;
    this.timerConsulta = undefined;
  }

  private consultarEmSegundoPlano(): void {
    this.pagamentoService.consultar(this.numeroComanda).subscribe({
      next: pagamento => this.aplicar(pagamento, false),
      error: () => {}
    });
  }

  private atualizarContagem(): void {
    const expiracao = this.pagamento?.dataHoraExpiracao ? new Date(this.pagamento.dataHoraExpiracao).getTime() : NaN;
    if (isNaN(expiracao)) {
      this.tempoRestante = '';
      return;
    }
    this.segundosRestantes = Math.max(0, Math.floor((expiracao - Date.now()) / 1000));
    const minutos = Math.floor(this.segundosRestantes / 60);
    const segundos = this.segundosRestantes % 60;
    this.tempoRestante = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    if (this.segundosRestantes === 0) {
      // Uma aprovação de última hora ainda chega pelo websocket, que continua inscrito.
      this.expiradoNoAparelho = true;
      this.etapa = 'encerrado';
      this.pararTimers();
    }
  }

  private async copiarParaAreaDeTransferencia(texto: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // WebViews antigos não têm a Clipboard API: usa a seleção de um campo temporário.
      const campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      } finally {
        document.body.removeChild(campo);
      }
    }
  }

}
