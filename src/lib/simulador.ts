// Simulador oficial de producción diaria (hojas "Volquetas homogéneas" y
// "Volquetas Diferentes" del Excel). Calcula el óptimo teórico de viajes y
// m³ producidos desde Punto de excavación dado:
//   - tiempos de ida/vuelta reales del día (segundos, desde tiempos_ruta)
//   - cantidad de volquetas pequeñas (5.5 m³) y grandes (13 m³) asignadas
//   - duración de la jornada laboral (segundos)

// Tiempos estándar del simulador (segundos)
export const TCARGA_SMALL = 73 + 225 + 15;   // parqueo + cargar 7m³ + quitar burro = 313
export const TCARGA_LARGE = 73 + 525 + 15;   // parqueo + cargar 14m³ + quitar burro = 613
export const TDESCARGA_SMALL = 40;
export const TDESCARGA_LARGE = 83;
export const M3_POR_VIAJE_SMALL = 5.5;
export const M3_POR_VIAJE_LARGE = 13;

// Factor de producción del flujo principal (Excavación → Zaranda = 67%).
// El simulador reporta "Producto final en zaranda" = viajes × capacidad × 0.67.
export const PF_ZARANDA_PRINCIPAL = 0.67;

// Jornada por día de la semana (segundos)
// L-V: 7.5h, Sábado: 4h, Domingo: 0
export const JORNADA_LV = 7.5 * 3600;  // 27000
export const JORNADA_SAB = 4 * 3600;   // 14400
export const JORNADA_DOM = 0;

export function jornadaSegundosParaFecha(fechaISO: string): number {
  // fechaISO formato YYYY-MM-DD. Tratamos como fecha local (sin zona).
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 Dom ... 6 Sáb
  if (dow === 0) return JORNADA_DOM;
  if (dow === 6) return JORNADA_SAB;
  return JORNADA_LV;
}

export interface OptimoParams {
  tIda: number;           // segundos
  tVuelta: number;        // segundos
  nSmall: number;         // volquetas 5.5 m³ asignadas
  nLarge: number;         // volquetas 13 m³ asignadas
  jornadaSeg: number;
}

export interface OptimoResult {
  viajes: number;
  m3: number;      // m³ producidos aplicando PF principal (0.67)
  m3Bruto: number; // m³ sacados desde punto de excavación (sin PF)
}

/**
 * Calcula el óptimo de viajes y m³ producidos para un día dado.
 * Implementa las fórmulas del simulador oficial:
 *   - Hoja 1 (homogéneas) cuando nLarge = 0 o nSmall = 0
 *   - Hoja 2 (mixta) cuando hay combinación
 *
 * Referencia (hoja 2): con 1 volq 14m³ + 1 volq 7m³, tIda=133, tVuelta=118:
 *   ciclo = 613 + max(83+133+118, 1×313) = 613 + 334 = 947
 *   viajes_14 = floor(27000/947) = 28, viajes_7 = 28
 *   m³ = 28×13 + 28×5.5 = 518 ✓
 */
export function calcularOptimoDia({
  tIda, tVuelta, nSmall, nLarge, jornadaSeg
}: OptimoParams): OptimoResult {
  if (jornadaSeg <= 0 || (nSmall + nLarge) === 0) {
    return { viajes: 0, m3: 0, m3Bruto: 0 };
  }
  const ida = Math.max(0, tIda);
  const vuelta = Math.max(0, tVuelta);
  const TtotalSmall = TCARGA_SMALL + TDESCARGA_SMALL + ida + vuelta;
  const TtotalLarge = TCARGA_LARGE + TDESCARGA_LARGE + ida + vuelta;

  let viajesSmall = 0;
  let viajesLarge = 0;

  if (nLarge === 0) {
    // Flota homogénea pequeña (hoja 1)
    const ciclo = Math.max(TtotalSmall, nSmall * TCARGA_SMALL);
    viajesSmall = Math.floor((jornadaSeg * nSmall) / ciclo);
  } else if (nSmall === 0) {
    // Flota homogénea grande
    const ciclo = Math.max(TtotalLarge, nLarge * TCARGA_LARGE);
    viajesLarge = Math.floor((jornadaSeg * nLarge) / ciclo);
  } else {
    // Flota mixta (hoja 2)
    const tTransporteLarge = TDESCARGA_LARGE + ida + vuelta;
    const tCargaTotalSmall = nSmall * TCARGA_SMALL;
    // Por ronda de la grande: cargar grande + (o bien su transporte, o bien la cola de pequeñas)
    const ciclo = nLarge * TCARGA_LARGE + Math.max(tTransporteLarge, tCargaTotalSmall);
    viajesLarge = Math.floor((jornadaSeg * nLarge) / ciclo);
    viajesSmall = viajesLarge * nSmall; // patrón 1:1 por ronda, siguiendo hoja 2
  }

  const m3Bruto = viajesSmall * M3_POR_VIAJE_SMALL + viajesLarge * M3_POR_VIAJE_LARGE;
  const m3 = m3Bruto * PF_ZARANDA_PRINCIPAL;
  return { viajes: viajesSmall + viajesLarge, m3, m3Bruto };
}
