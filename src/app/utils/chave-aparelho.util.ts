/**
 * Chave deste celular para os cartões salvos (o app não tem login). É aleatória, criada uma vez e guardada só aqui;
 * a API guarda apenas o hash dela. Ela não expira e não é apagada ao encerrar a comanda: some só se o app for
 * reinstalado ou os dados dele forem limpos (e com ela, o acesso aos cartões salvos).
 */
const KEY_CHAVE_APARELHO = 'CHAVE_APARELHO';
const FORMATO_CHAVE = /^[A-Za-z0-9_-]{32,128}$/;

export function chaveDoAparelho(): string {
  const existente = localStorage.getItem(KEY_CHAVE_APARELHO);
  if (existente && FORMATO_CHAVE.test(existente)) {
    return existente;
  }
  const nova = gerarChave();
  localStorage.setItem(KEY_CHAVE_APARELHO, nova);
  return nova;
}

/** 32 bytes aleatórios (256 bits) em base64url. */
function gerarChave(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binario = '';
  bytes.forEach(byte => (binario += String.fromCharCode(byte)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
