import { Component, Injector } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ViewWillEnter } from '@ionic/angular';
import { GenericClass } from 'src/app/model/generic.class';
import { PedidoDTO } from 'src/app/model/pedido.dto';
import { StatusPedidoEnum } from 'src/app/enums/status-pedido.enum';
import { PedidoService } from 'src/app/services/pedido.service';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-minha-comanda',
  templateUrl: './minha-comanda.page.html',
  styleUrls: ['./minha-comanda.page.scss'],
})
export class MinhaComandaPage extends GenericClass implements ViewWillEnter {

  public pedidos: PedidoDTO[] = [];

  constructor(
    public injector: Injector,
    private pedidosService: PedidoService,
    private storageService: StorageService
  ) {
    super(injector);
  }

  get totalComanda(): number {
    return this.pedidos.reduce((total, pedido) => {
      const valor = pedido.produto?.valor ?? 0;
      const quantidade = pedido.quantidade ?? 0;
      return total + valor * quantidade;
    }, 0);
  }

  ionViewWillEnter(): void {
    this.pedidosService.getAllByParams(this.buildParams()).subscribe(pedidos => {
      this.pedidos = pedidos;
    });
  }

  buildParams(): HttpParams {
    let params = new HttpParams();
    [
      StatusPedidoEnum.SOLICITADO,
      StatusPedidoEnum.EM_ANDAMENTO,
      StatusPedidoEnum.PRONTO,
      StatusPedidoEnum.FINALIZADO
    ].forEach(status => params = params.append('status', status));

    const dataInicial = new Date();
    dataInicial.setHours(0, 0, 0, 0);
    params = params.append('dataHora', dataInicial.toISOString());
    params = params.append('comanda', this.storageService.getNumeroDaComanda());
    return params;
  }

}
