/**
 * Utilidades de formato en español de Colombia.
 * Todo el informe de gestión usa estas funciones para que las cifras se lean
 * igual en pantalla, al imprimir y en el Excel exportado.
 */

/** $1.234.567 — sin decimales, que es como se manejan los pesos aquí. */
export const formatoMoneda = (valor: number): string =>
  `$${Math.round(valor || 0).toLocaleString('es-CO')}`;

/** $1,2 M / $845 K — para tarjetas donde el número completo no cabe. */
export const formatoMonedaCorta = (valor: number): string => {
  const v = valor || 0;
  const abs = Math.abs(v);
  const signo = v < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${signo}$${(abs / 1_000_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1_000_000) return `${signo}$${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `${signo}$${(abs / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} K`;
  return formatoMoneda(v);
};

export const formatoNumero = (valor: number, decimales = 0): string =>
  (valor || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });

/** 1.234,5 m³ */
export const formatoM3 = (valor: number, decimales = 1): string =>
  `${formatoNumero(valor, decimales)} m³`;

/** 67,4 % — `valor` viene en porcentaje (0-100), no en fracción. */
export const formatoPorcentaje = (valor: number, decimales = 1): string =>
  `${formatoNumero(valor, decimales)} %`;

/** Divide evitando NaN e Infinity cuando el denominador es 0. */
export const dividir = (numerador: number, denominador: number): number =>
  denominador ? numerador / denominador : 0;

/** Porcentaje (0-100) de `parte` sobre `total`, seguro ante total = 0. */
export const porcentaje = (parte: number, total: number): number =>
  dividir(parte, total) * 100;

export interface Variacion {
  /** Cambio porcentual respecto al valor anterior. `null` si no es calculable. */
  pct: number | null;
  /** Texto listo para mostrar: "+12,4 %", "−8,1 %", "—" */
  texto: string;
  direccion: 'sube' | 'baja' | 'igual' | 'sinDato';
}

/**
 * Variación entre dos períodos. Si el período anterior fue 0 no se puede
 * calcular un porcentaje honesto, así que se devuelve `null` en vez de ∞.
 */
export const calcularVariacion = (actual: number, anterior: number): Variacion => {
  if (!anterior) {
    // Sin valor previo no hay porcentaje honesto que mostrar (sería ∞).
    return { pct: null, texto: 'sin base previa', direccion: 'sinDato' };
  }
  const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
  const direccion = pct > 0.05 ? 'sube' : pct < -0.05 ? 'baja' : 'igual';
  const signo = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return {
    pct,
    texto: `${signo}${formatoNumero(Math.abs(pct), 1)} %`,
    direccion,
  };
};

/**
 * ¿La variación es una buena noticia? Depende de la métrica: subir m³ es bueno,
 * subir descuentos no.
 */
export type Sentido = 'masEsMejor' | 'menosEsMejor' | 'neutro';

export const esBuenaNoticia = (v: Variacion, sentido: Sentido): boolean | null => {
  if (v.pct === null || v.direccion === 'igual' || sentido === 'neutro') return null;
  return sentido === 'masEsMejor' ? v.pct > 0 : v.pct < 0;
};
