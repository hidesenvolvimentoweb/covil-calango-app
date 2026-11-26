import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { PacoteConfiguracaoDTO, PacoteDTO } from 'src/app/model/pacote.dto';
import { PacoteService } from 'src/app/services/pacote.service';
import { reduzirImagem, temCameraNativa, tirarFotoNativa } from 'src/app/utils/foto.util';

/** Mesmas categorias da API, caso a configuração não tenha chegado. */
const CATEGORIAS_PADRAO = [
  { valor: 'CARTA', rotulo: 'Carta' },
  { valor: 'DECK', rotulo: 'Deck' },
  { valor: 'PLAYMAT', rotulo: 'Playmat' },
  { valor: 'ACESSORIO', rotulo: 'Acessório (sleeves, deck box, dados...)' },
  { valor: 'PRODUTO_LACRADO', rotulo: 'Produto lacrado (booster, caixa...)' },
  { valor: 'BOARD_GAME', rotulo: 'Board game' },
];

/**
 * Cadastro de um pacote: o que está sendo deixado (só itens da loja), a foto, quem vai receber e o aceite da regra.
 * Ao gravar, mostra o código gerado para quem deixou repassar a quem vai receber.
 */
@Component({
  selector: 'app-modal-deixar-pacote',
  templateUrl: './modal-deixar-pacote.page.html',
  styleUrls: ['./modal-deixar-pacote.page.scss'],
})
export class ModalDeixarPacotePage implements OnInit, OnDestroy {

  @Input() configuracao?: PacoteConfiguracaoDTO;

  public form: FormGroup;
  public foto?: Blob;
  public preview?: string;
  public preparandoFoto = false;
  public enviando = false;
  /** Pacote gravado: a tela passa a mostrar o código. */
  public criado?: PacoteDTO;
  public readonly cameraNativa = temCameraNativa();

  constructor(
    private formBuilder: FormBuilder,
    private pacoteService: PacoteService,
    private modalController: ModalController
  ) {
    this.form = this.formBuilder.group({
      categoria: [null, Validators.required],
      descricao: ['', [Validators.required, Validators.maxLength(255)]],
      destinatario: ['', [Validators.required, Validators.maxLength(255)]],
      // Só itens relacionados à loja: nada de celular, roupa, calçado ou outros objetos pessoais.
      aceite: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {
    if (!this.configuracao) {
      this.pacoteService.getConfiguracao().subscribe({ next: res => (this.configuracao = res) });
    }
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  get categorias() {
    return this.configuracao?.categorias?.length ? this.configuracao.categorias : CATEGORIAS_PADRAO;
  }

  get valorTaxa(): number {
    return this.configuracao?.valorTaxa ?? 0;
  }

  async tirarFoto(): Promise<void> {
    const foto = await tirarFotoNativa();
    if (foto) {
      this.definirFoto(foto);
    }
  }

  async selecionarFoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) {
      return;
    }
    this.preparandoFoto = true;
    const foto = await reduzirImagem(arquivo);
    this.preparandoFoto = false;
    this.definirFoto(foto);
  }

  enviar(): void {
    if (this.form.invalid || !this.foto || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando = true;
    const valor = this.form.getRawValue();
    this.pacoteService.depositar({
      categoria: valor.categoria,
      descricao: String(valor.descricao).trim(),
      destinatario: String(valor.destinatario).trim(),
    }, this.foto).subscribe({
      next: pacote => {
        this.enviando = false;
        this.criado = pacote;
      },
      // A mensagem da API (comanda fechada, PIX pendente, foto inválida...) é exibida pelo interceptor de erros.
      error: () => (this.enviando = false)
    });
  }

  fechar(): void {
    void this.modalController.dismiss(this.criado);
  }

  private definirFoto(foto: Blob): void {
    this.liberarPreview();
    this.foto = foto;
    this.preview = URL.createObjectURL(foto);
  }

  private liberarPreview(): void {
    if (this.preview) {
      URL.revokeObjectURL(this.preview);
      this.preview = undefined;
    }
  }

}
