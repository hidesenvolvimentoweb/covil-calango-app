import { CurrencyPipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { fromTipoEventoEnumValue, getIconeTipoEvento } from 'src/app/enums/tipo-evento.enum';
import {
  EventoDTO,
  EventoParticipanteDTO,
  inscricoesAbertas,
  vagasEsgotadas
} from 'src/app/model/evento.dto';
import { EventoService } from 'src/app/services/evento.service';
import { mesmoDia } from 'src/app/utils/data-hora.util';

@Component({
  selector: 'app-modal-detalhar-evento',
  templateUrl: './modal-detalhar-evento.page.html',
  styleUrls: ['./modal-detalhar-evento.page.scss'],
  providers: [CurrencyPipe]
})
export class ModalDetalharEventoPage implements OnInit {

  @Input()
  public evento!: EventoDTO;

  public participantes: EventoParticipanteDTO[] = [];
  public carregandoParticipantes = true;
  public enviando = false;

  constructor(
    private eventoService: EventoService,
    private alertController: AlertController,
    private currencyPipe: CurrencyPipe
  ) { }

  get rotuloTipo(): string {
    return fromTipoEventoEnumValue(this.evento?.tipo);
  }

  get icone(): string {
    return getIconeTipoEvento(this.evento?.tipo);
  }

  get mesmoDia(): boolean {
    return mesmoDia(this.evento?.dataHoraInicio, this.evento?.dataHoraFim);
  }

  /** Participar só nos eventos de hoje que ainda não terminaram. */
  get inscricoesAbertas(): boolean {
    return inscricoesAbertas(this.evento);
  }

  /** O evento já terminou (as inscrições estão encerradas, e não "por abrir"). */
  get eventoEncerrado(): boolean {
    return !!this.evento?.dataHoraFim && new Date(this.evento.dataHoraFim) <= new Date();
  }

  get vagasEsgotadas(): boolean {
    return vagasEsgotadas(this.evento);
  }

  get ocupacao(): string {
    const inscritos = this.evento?.totalParticipantes ?? this.participantes.length;
    return this.evento?.vagas ? `${inscritos} de ${this.evento.vagas} ocupadas` : `${inscritos} · sem limite`;
  }

  ngOnInit(): void {
    this.carregarParticipantes();
  }


  async participar(): Promise<void> {
    const valor = this.evento.valorInscricao
      ? `A inscrição de ${this.currencyPipe.transform(this.evento.valorInscricao, 'BRL')} será adicionada à sua comanda.`
      : 'A inscrição é gratuita.';
    await this.confirmar('Participar do evento', `${valor} Deseja participar de "${this.evento.nome}"?`,
      'Participar', () => this.eventoService.participar(this.evento.id!));
  }

  async sair(): Promise<void> {
    const valor = this.evento.valorInscricao ? ' O valor da inscrição será removido da sua comanda.' : '';
    await this.confirmar('Sair do evento', `Deseja sair de "${this.evento.nome}"?${valor}`,
      'Sair do evento', () => this.eventoService.sair(this.evento.id!));
  }

  private async confirmar(titulo: string, mensagem: string, acao: string,
                          requisicao: () => ReturnType<EventoService['sair']>): Promise<void> {
    if (this.enviando || this.evento?.id == null) {
      return;
    }
    const alerta = await this.alertController.create({
      header: titulo,
      message: mensagem,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: acao,
          handler: () => {
            this.enviando = true;
            requisicao().subscribe({
              next: () => {
                this.atualizarEvento();
              },
              // A mensagem da API (sem vagas, comanda fechada, PIX pendente...) é exibida pelo interceptor de erros.
              error: () => {
                this.enviando = false;
                this.atualizarEvento();
              }
            });
          }
        }
      ]
    });
    await alerta.present();
  }

  /** Recarrega o evento (vagas e inscrição) e a lista de participantes depois de entrar ou sair. */
  private atualizarEvento(): void {
    this.eventoService.getEvento(this.evento.id!).subscribe({
      next: evento => {
        this.evento = evento;
        this.enviando = false;
      },
      error: () => (this.enviando = false)
    });
    this.carregarParticipantes();
  }

  private carregarParticipantes(): void {
    if (this.evento?.id == null) {
      this.carregandoParticipantes = false;
      return;
    }
    this.eventoService.getParticipantes(this.evento.id).subscribe({
      next: participantes => {
        this.participantes = participantes;
        this.carregandoParticipantes = false;
      },
      error: () => (this.carregandoParticipantes = false)
    });
  }

}
