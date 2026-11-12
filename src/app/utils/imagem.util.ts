import { environment } from 'src/environments/environment';

/**
 * Converte a referência de imagem gravada no produto em uma URL utilizável.
 * Imagens enviadas pelo painel web são gravadas como caminho relativo à API
 * (ex.: /api/arquivos/produtos/arquivo.jpg); URLs completas são mantidas.
 * Retorna null quando o produto não possui imagem.
 */
export const resolverUrlImagem = (imagem?: string | null): string | null => {
  const valor = imagem?.trim();
  if (!valor) {
    return null;
  }
  if (/^(https?:|data:|blob:)/i.test(valor)) {
    return valor;
  }
  return `${environment.url}${valor.startsWith('/') ? '' : '/'}${valor}`;
};
