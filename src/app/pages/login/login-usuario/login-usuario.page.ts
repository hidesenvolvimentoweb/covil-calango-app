import { Component, Injector, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GenericClass } from 'src/app/model/generic.class';
import { LoginDTO } from 'src/app/model/login.dto';
import { UsuarioDTO } from 'src/app/model/usuario.dto';
import { AuthService } from 'src/app/services/auth.service';
import { KEY_USUARIO, StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-login-usuario',
  templateUrl: './login-usuario.page.html',
  styleUrls: ['./login-usuario.page.scss'],
})
export class LoginUsuarioPage extends GenericClass implements OnInit {

  public form!: FormGroup;
  public enviando = false;

  constructor(
    public injector: Injector,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private storageService: StorageService
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', Validators.required],
    });
  }

  login(): void {
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    const body: LoginDTO = {
      ...this.form.getRawValue(),
      provider: 'CREDENTIAL',
    };

    this.authService.login(body).subscribe({
      next: (usuario: UsuarioDTO) => {
        this.storageService.set(KEY_USUARIO, usuario);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.enviando = false;
      },
      complete: () => {
        this.enviando = false;
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/login']);
  }
}
