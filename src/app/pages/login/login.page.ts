import { Component } from '@angular/core';
import { GenericClass } from 'src/app/model/generic.class';
import { ModalInformarNomePage } from './modal-informar-nome/modal-informar-nome.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage extends GenericClass {

  async openModalInformarNome() {
    (await this.modalController.create({
      component: ModalInformarNomePage,
      breakpoints: [0.8],
      initialBreakpoint: 0.8,
    })).present();
  }
}
