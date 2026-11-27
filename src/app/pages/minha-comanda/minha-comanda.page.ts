import { Component, Injector } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { GenericClass } from 'src/app/model/generic.class';
import { isItemAvulso, isTaxaPacote, nomeDoPedido, PedidoDTO, valorDoPedido } from 'src/app/model/pedido.dto';
import { StatusPedidoEnum } from 'src/app/enums/status-pedido.enum';
import { fromCategoriaProdutoEnumValue } from 'src/app/enums/categoria-produto.enum';
import { PedidoService, topicoPedidosDaComanda } from 'src/app/services/pedido.service';
import { StorageService } from 'src/app/services/storage.service';
import { WebsocketService } from 'src/app/services/websocket.service';
import { PagamentoService } from 'src/app/services/pagamento.service';
import { MetodoPagamentoEnum, StatusPagamentoEnum } from 'src/app/enums/status-pagamento.enum';
import { PagamentoConfiguracaoDTO, PagamentoDTO } from 'src/app/model/pagamento.dto';
import { ModalPagamentoPixPage } from './modal-pagamento-pix/modal-pagamento-pix.page';
import { ModalPagamentoCartaoPage } from './modal-pagamento-cartao/modal-pagamento-cartao.page';

const STATUS_CONTABILIZADOS: string[] = [
  StatusPedidoEnum.SOLICITADO,
  StatusPedidoEnum.EM_ANDAMENTO,
  StatusPedidoEnum.PRONTO,
  StatusPedidoEnum.FINALIZADO
];

/** Quantidade de itens fictícios exibidos no skeleton enquanto a tela carrega. */
const ITENS_SKELETON = [1, 2, 3];

@Component({
  selector: 'app-minha-comanda',
  templateUrl: './minha-comanda.page.html',
  styleUrls: ['./minha-comanda.page.scss'],
})
export class MinhaComandaPage extends GenericClass implements ViewWillEnter, ViewWillLeave {

  /** Valor com o preço gravado no pedido (não muda se o preço do produto mudar depois). */
  readonly valorDoPedido = valorDoPedido;
  readonly nomeDoPedido = nomeDoPedido;
  readonly isItemAvulso = isItemAvulso;
  readonly isTaxaPacote = isTaxaPacote;

  public pedidos: PedidoDTO[] = [];
  public carregando = true;
  /** Pagamento gerado e ainda não concluído (o cliente pode ter fechado a tela sem pagar). */
  public pagamentoPendente: PagamentoDTO | null = null;
  public configuracaoPagamento?: PagamentoConfiguracaoDTO;
  public readonly itensSkeleton = ITENS_SKELETON;
  private cancelarEscutaPedidos?: () => void;

  constructor(
    public injector: Injector,
    private pedidosService: PedidoService,
    private pagamentoService: PagamentoService,
    private storageService: StorageService,
    private websocketService: WebsocketService
  ) {
    super(injector);
  }

  get totalComanda(): number {
    return this.pedidos.reduce((total, pedido) => total + valorDoPedido(pedido), 0);
  }

  get pixPendente(): boolean {
    return this.pagamentoPendente?.metodo === MetodoPagamentoEnum.PIX;
  }

  get cartaoPendente(): boolean {
    return !!this.pagamentoPendente && !this.pixPendente;
  }

  /** Cartão digitado ou conta do Mercado Pago, quando configurados na API. */
  get cartaoDisponivel(): boolean {
    return !!this.configuracaoPagamento?.cartao || !!this.configuracaoPagamento?.mercadoPago;
  }

  ionViewWillEnter(): void {
    this.carregando = true;
    this.verificarPixPendente();
    this.pagamentoService.getConfiguracao().subscribe({
      next: configuracao => (this.configuracaoPagamento = configuracao),
      error: () => (this.configuracaoPagamento = undefined)
    });
    this.pedidosService.getAllByParams(this.buildParams()).subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
    this.escutarAlteracoesDosPedidos();
  }

  /** Abre o pagamento via PIX; o valor cobrado é calculado pela API. */
  async pagarComPix(): Promise<void> {
    const modal = await this.modalController.create({
      component: ModalPagamentoPixPage,
      breakpoints: [0.95, 1],
      initialBreakpoint: 0.95
    });
    void modal.onDidDismiss().then(() => this.verificarPixPendente());
    await modal.present();
  }

  /** Cartão de crédito ou débito à vista, ou conta do Mercado Pago; o valor cobrado é calculado pela API. */
  async pagarComCartao(): Promise<void> {
    const modal = await this.modalController.create({
      component: ModalPagamentoCartaoPage,
      componentProps: { valorTotal: this.totalComanda },
      breakpoints: [0.95, 1],
      initialBreakpoint: 0.95
    });
    void modal.onDidDismiss().then(() => this.verificarPixPendente());
    await modal.present();
  }

  getNomeCategoria(pedido: PedidoDTO): string {
    if (isTaxaPacote(pedido)) {
      return 'Taxa de pacote';
    }
    if (isItemAvulso(pedido)) {
      return 'Inscrição em evento';
    }
    return fromCategoriaProdutoEnumValue(pedido.produto?.categoria) || 'Produto';
  }

  ionViewWillLeave(): void {
    this.cancelarEscutaPedidos?.();
    this.cancelarEscutaPedidos = undefined;
  }

  /**
   * Mantém a comanda atualizada em tempo real: pedidos cancelados saem do total.
   */
  escutarAlteracoesDosPedidos(): void {
    const numeroComanda = this.storageService.getNumeroDaComanda();
    if (!numeroComanda || this.cancelarEscutaPedidos) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaPedidos = this.websocketService.subscribeToTopic(topicoPedidosDaComanda(numeroComanda), body => {
      const pedidoAtualizado: PedidoDTO = WebsocketService.formatResponse(body);
      const demaisPedidos = this.pedidos.filter(p => p.id !== pedidoAtualizado.id);
      const existia = demaisPedidos.length !== this.pedidos.length;
      if (!existia) {
        return;
      }
      this.pedidos = STATUS_CONTABILIZADOS.includes(pedidoAtualizado.status)
        ? this.pedidos.map(p => p.id === pedidoAtualizado.id ? pedidoAtualizado : p)
        : demaisPedidos;
    });
  }

  buildParams(): HttpParams {
    let params = new HttpParams();
    STATUS_CONTABILIZADOS.forEach(status => params = params.append('status', status));

    const dataInicial = new Date();
    dataInicial.setHours(0, 0, 0, 0);
    params = params.append('dataHora', dataInicial.toISOString());
    params = params.append('comanda', this.storageService.getNumeroDaComanda());
    return params;
  }

  /** Um pagamento gerado e ainda não concluído muda o texto do botão (o cliente pode ter fechado o modal sem pagar). */
  private verificarPixPendente(): void {
    const numeroComanda = this.storageService.getNumeroDaComanda();
    if (!numeroComanda) {
      return;
    }
    this.pagamentoService.consultar(numeroComanda).subscribe({
      next: pagamento => (this.pagamentoPendente = pagamento?.status === StatusPagamentoEnum.PENDENTE ? pagamento : null),
      error: () => (this.pagamentoPendente = null)
    });
  }

}
