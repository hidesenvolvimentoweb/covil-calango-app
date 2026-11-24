const doisDigitos = (valor: number): string => String(valor).padStart(2, '0');

/**
 * Data e hora locais no formato aceito pela API (LocalDateTime, sem fuso): '2026-11-28T19:00:00'.
 * O toISOString() não serve: converteria para UTC e mudaria o horário.
 */
export const formatarDataHoraLocal = (data: Date): string =>
  `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}` +
  `T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}:00`;

/** Indica se as duas datas ('2026-11-28T19:00:00') caem no mesmo dia. */
export const mesmoDia = (inicio?: string, fim?: string): boolean =>
  !!inicio && !!fim && inicio.slice(0, 10) === fim.slice(0, 10);
