import { Component, Injector } from '@angular/core';
import { ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { PedidoDTO, precoUnitario, valorDoPedido } from 'src/app/model/pedido.dto';
import { GenericClass } from 'src/app/model/generic.class';
import { fromStatusPedidoEnumValue, StatusPedidoEnum } from 'src/app/enums/status-pedido.enum';
import { PedidoService, topicoPedidosDaComanda } from 'src/app/services/pedido.service';
import { HttpParams } from '@angular/common/http';
import { StorageService } from 'src/app/services/storage.service';
import { WebsocketService } from 'src/app/services/websocket.service';

/** Quantidade de itens fictícios exibidos no skeleton enquanto a tela carrega. */
const ITENS_SKELETON = [1, 2, 3];

@Component({
  selector: 'app-meus-pedidos',
  templateUrl: './meus-pedidos.page.html',
  styleUrls: ['./meus-pedidos.page.scss'],
})
export class MeusPedidosPage extends GenericClass implements ViewWillEnter, ViewWillLeave {

  /** Preço gravado no pedido (não muda se o preço do produto mudar depois). */
  readonly precoUnitario = precoUnitario;
  readonly valorDoPedido = valorDoPedido;

  public listaMeusPedidos: PedidoDTO[] = [];
  public carregando = true;
  public readonly itensSkeleton = ITENS_SKELETON;
  private pedidosExpandidos = new Set<PedidoDTO>();
  private cancelarEscutaPedidos?: () => void;

  constructor(
    public injector: Injector,
    private pedidosService: PedidoService,
    private storageService: StorageService,
    private websocketService: WebsocketService
  ) {
    super(injector);
  }

  get isPedidoEmAndamento() {
    return (p: PedidoDTO) => p.status === StatusPedidoEnum.EM_ANDAMENTO;
  }

  get isPedidoSolicitado() {
    return (p: PedidoDTO) => p.status === StatusPedidoEnum.SOLICITADO;
  }

  get isPedidoPronto() {
    return (p: PedidoDTO) => p.status === StatusPedidoEnum.PRONTO;
  }

  get isPedidoCancelado() {
    return (p: PedidoDTO) => p.status === StatusPedidoEnum.CANCELADO;
  }

  get isPedidoFinalizado() {
    return (p: PedidoDTO) => p.status === StatusPedidoEnum.FINALIZADO;
  }

  ionViewWillEnter(): void {
    this.carregando = true;
    this.pedidosService.getAllByParams(this.buildParams()).subscribe({
      next: res => {
        this.listaMeusPedidos = res;
        this.pedidosExpandidos.clear();
        this.ordenarPedidosPorPrioridade();
        this.carregando = false;
      },
      error: () => (this.carregando = false)
    });
    this.escutarAlteracoesDosPedidos();
  }

  ionViewWillLeave(): void {
    this.cancelarEscutaPedidos?.();
    this.cancelarEscutaPedidos = undefined;
  }

  /**
   * Atualiza em tempo real o status dos pedidos da comanda (Em Andamento, Pronto, Cancelado...).
   */
  escutarAlteracoesDosPedidos(): void {
    const numeroComanda = this.storageService.getNumeroDaComanda();
    if (!numeroComanda || this.cancelarEscutaPedidos) {
      return;
    }
    this.websocketService.createWebSocketConnection().subscribe({ error: () => {} });
    this.cancelarEscutaPedidos = this.websocketService.subscribeToTopic(topicoPedidosDaComanda(numeroComanda), body => {
      const pedidoAtualizado: PedidoDTO = WebsocketService.formatResponse(body);
      const pedido = this.listaMeusPedidos.find(p => p.id === pedidoAtualizado.id);
      if (!pedido) {
        return;
      }
      // Mantém a mesma referência para preservar o estado de expansão do card.
      Object.assign(pedido, pedidoAtualizado);
      this.ordenarPedidosPorPrioridade();
    });
  }

  alternarDetalhes(pedido: PedidoDTO): void {
    if (this.pedidosExpandidos.has(pedido)) {
      this.pedidosExpandidos.delete(pedido);
      return;
    }
    this.pedidosExpandidos.add(pedido);
  }

  isPedidoExpandido(pedido: PedidoDTO): boolean {
    return this.pedidosExpandidos.has(pedido);
  }

  buildParams() {
    let params = new HttpParams();
    [
      StatusPedidoEnum.SOLICITADO,
      StatusPedidoEnum.EM_ANDAMENTO,
      StatusPedidoEnum.PRONTO,
      StatusPedidoEnum.FINALIZADO
    ].forEach(status => (params = params.append('status', status)));
    const localDate = new Date();
    localDate.setHours(0, 0, 0, 0);
    params = params.append('dataHora', localDate.toISOString());
    params = params.append('comanda', this.storageService.getNumeroDaComanda());
    return params;
  }

  ordenarPedidosPorPrioridade() {
    const statusPrioridade = {
      [StatusPedidoEnum.PRONTO]: 1,
      [StatusPedidoEnum.SOLICITADO]: 2,
      [StatusPedidoEnum.EM_ANDAMENTO]: 3,
      [StatusPedidoEnum.CANCELADO]: 4,
      [StatusPedidoEnum.FINALIZADO]: 5
    };
    this.listaMeusPedidos.sort((a, b) => {
      const statusA = statusPrioridade[a.status];
      const statusB = statusPrioridade[b.status];
      const isMesmoStatus = () => statusA === statusB;
      const comparePorStatus = (sa: any, sb: any) => sa - sb;
      const comparePorHora = (ha: any, hb: any) => new Date(ha).getTime() - new Date(hb).getTime();
      return !isMesmoStatus() ? comparePorStatus(statusA, statusB) : comparePorHora(a.dataHora, b.dataHora);
    });
  }

  calcularPrazoDoPedido(pedido: PedidoDTO): Date {
    const prazoEmMinutos = pedido.produto.prazo;
    const dataHoraDoPedido = new Date(pedido.dataHora);
    dataHoraDoPedido.setMinutes(dataHoraDoPedido.getMinutes() + prazoEmMinutos);
    return dataHoraDoPedido;
  }

  getLabelPorStatusDoPedido(pedido: PedidoDTO) {
    return fromStatusPedidoEnumValue(pedido.status);
  }

  getClassePorStatusDoPedido(pedido: PedidoDTO) {
    switch(pedido.status) {
      case StatusPedidoEnum.FINALIZADO:
        return 'finalizado';
      case StatusPedidoEnum.EM_ANDAMENTO:
      case StatusPedidoEnum.SOLICITADO:
        return 'em-andamento';
      case StatusPedidoEnum.PRONTO:
        return 'pronto';
      case StatusPedidoEnum.CANCELADO:
        return 'cancelado';
    }
  }

}
