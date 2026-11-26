/** Maior lado da foto enviada: o bastante para conferir o item, bem abaixo do limite de 5 MB da API. */
const LADO_MAXIMO = 1600;
const QUALIDADE_JPEG = 0.85;

/** API do cordova-plugin-camera, presente só no APK com o plugin instalado. */
interface CameraCordova {
  getPicture(sucesso: (dados: string) => void, erro: (mensagem: string) => void, opcoes: Record<string, unknown>): void;
}

const cameraCordova = (): CameraCordova | undefined => (navigator as unknown as { camera?: CameraCordova }).camera;

/** Há câmera nativa (cordova-plugin-camera): a foto é tirada na hora, sem passar pela galeria. */
export const temCameraNativa = (): boolean => !!cameraCordova();

/**
 * Tira a foto com a câmera do aparelho (cordova-plugin-camera), já reduzida e em JPEG. Resolve com {@code null} se a
 * pessoa desistir.
 */
export function tirarFotoNativa(): Promise<Blob | null> {
  const camera = cameraCordova();
  if (!camera) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    camera.getPicture(
      (base64) => resolve(base64ParaBlob(base64)),
      () => resolve(null),
      {
        quality: 80,
        destinationType: 0, // DATA_URL
        sourceType: 1, // CAMERA
        encodingType: 0, // JPEG
        targetWidth: LADO_MAXIMO,
        targetHeight: LADO_MAXIMO,
        correctOrientation: true,
        saveToPhotoAlbum: false,
      },
    );
  });
}

/**
 * Reduz uma foto escolhida no aparelho (as do celular passam fácil de 5 MB) para JPEG com no máximo
 * {@link LADO_MAXIMO} px no maior lado. Se não conseguir ler a imagem, devolve o arquivo original (a API valida).
 */
export async function reduzirImagem(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

function base64ParaBlob(base64: string): Blob {
  const binario = atob(base64.replace(/^data:[^,]+,/, ''));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}
