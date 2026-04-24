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

/**
 * Óptimo teórico del día: el valor MÁXIMO alcanzable de "Cant m³ fase 1/día"
 * dados los tiempos de ida/vuelta del día y la jornada, asumiendo que se
 * asignan las volquetas necesarias para saturar la excavadora.
 *
 * Flota asumida: homogénea 7m³ (configuración más común; 20 volquetas disponibles).
 * - Ttotal = 313 + 40 + ida + vuelta
 * - Wo = Ttotal / 313  (volquetas mínimas para 0 espera)
 * - Con W ≥ ceil(Wo): la excavadora está saturada → viajes/día = floor(Jornada/313)
 * - m³ fase 1/día máximo = viajes × 5.5
 *
 * Esto es lo que el Excel muestra como "Cant m³ fase 1/día" cuando W = Wreal
 * con W ≥ Wo (saturación de la excavadora).
 */
export interface OptimoTeoricoResult {
  viajes: number;      // viajes máximos alcanzables en la jornada
  m3Fase1: number;     // m³ fase 1 máximos (sin PF)
  Wo: number;          // volquetas óptimas (decimal)
  WoRound: number;     // volquetas mínimas para alcanzar el máximo
  ciclo: number;       // Ttotal individual
}

export function calcularOptimoTeorico(
  tIda: number,
  tVuelta: number,
  jornadaSeg: number
): OptimoTeoricoResult {
  if (jornadaSeg <= 0) {
    return { viajes: 0, m3Fase1: 0, Wo: 0, WoRound: 0, ciclo: 0 };
  }
  const ida = Math.max(0, tIda);
  const vuelta = Math.max(0, tVuelta);
  const ciclo = TCARGA_SMALL + TDESCARGA_SMALL + ida + vuelta;
  const Wo = ciclo / TCARGA_SMALL;
  const WoRound = Math.max(1, Math.ceil(Wo));
  // Con W ≥ Wo la excavadora está saturada: viajes = Jornada / Tcarga
  const viajes = Math.floor(jornadaSeg / TCARGA_SMALL);
  const m3Fase1 = viajes * M3_POR_VIAJE_SMALL;
  return { viajes, m3Fase1, Wo, WoRound, ciclo };
}

/**
 * Mejor configuración de flota para maximizar "Cant m³ fase 1/día" dados los
 * tiempos de ida/vuelta y la jornada. Explora:
 *   - homogénea pequeña (1..maxSmall)
 *   - 1 volqueta grande sola
 *   - mixta 1×14m³ + n×7m³ (n = 1..maxSmall)
 *
 * Se usa para mostrar el "Óptimo" en el dashboard como el máximo m³ alcanzable
 * antes de que agregar una volqueta más deje de aumentar la producción.
 */
export interface MejorConfig {
  nSmall: number;
  nLarge: number;
  viajes: number;
  m3Bruto: number;       // m³ fase 1 (sin PF)
  label: string;
  Wo: number;            // Wo teórico (decimal) de la flota ganadora
}

export function labelFlota(nSmall: number, nLarge: number): string {
  if (nSmall + nLarge === 0) return '—';
  const parts: string[] = [];
  if (nLarge > 0) parts.push(`${nLarge}×14m³`);
  if (nSmall > 0) parts.push(`${nSmall}×7m³`);
  return parts.join(' + ');
}

export function calcularMejorConfig(
  tIda: number,
  tVuelta: number,
  jornadaSeg: number,
  opts: { incluirLarge?: boolean; maxSmall?: number } = {}
): MejorConfig {
  const { incluirLarge = true, maxSmall = 20 } = opts;
  let best: MejorConfig = { nSmall: 0, nLarge: 0, viajes: 0, m3Bruto: 0, label: '—', Wo: 0 };
  if (jornadaSeg <= 0) return best;

  const TtotalSmall = TCARGA_SMALL + TDESCARGA_SMALL + tIda + tVuelta;
  const TtotalLarge = TCARGA_LARGE + TDESCARGA_LARGE + tIda + tVuelta;

  // Homogénea pequeña
  for (let n = 1; n <= maxSmall; n++) {
    const r = calcularOptimoDia({ tIda, tVuelta, nSmall: n, nLarge: 0, jornadaSeg });
    if (r.m3Bruto > best.m3Bruto) {
      best = { nSmall: n, nLarge: 0, viajes: r.viajes, m3Bruto: r.m3Bruto,
        label: labelFlota(n, 0), Wo: TtotalSmall / TCARGA_SMALL };
    }
  }

  if (incluirLarge) {
    // 1×14m³ sola
    const rL = calcularOptimoDia({ tIda, tVuelta, nSmall: 0, nLarge: 1, jornadaSeg });
    if (rL.m3Bruto > best.m3Bruto) {
      best = { nSmall: 0, nLarge: 1, viajes: rL.viajes, m3Bruto: rL.m3Bruto,
        label: labelFlota(0, 1), Wo: TtotalLarge / TCARGA_LARGE };
    }
    // Mixta 1×14m³ + n×7m³
    for (let n = 1; n <= maxSmall; n++) {
      const r = calcularOptimoDia({ tIda, tVuelta, nSmall: n, nLarge: 1, jornadaSeg });
      if (r.m3Bruto > best.m3Bruto) {
        // Wo teórico en mixta: ciclo / (Tcarga promedio ponderado) — aquí usamos
        // relación Ttotal de la grande sobre Tcarga grande (saturación excavadora).
        best = { nSmall: n, nLarge: 1, viajes: r.viajes, m3Bruto: r.m3Bruto,
          label: labelFlota(n, 1), Wo: TtotalLarge / TCARGA_LARGE + n };
      }
    }
  }

  return best;
}

// ─── Simulador completo (hojas del Excel) ────────────────────────────────────

export const PF_RESIDUOS_PROC = 0.7;   // % del residuo que se produce cómo Peña
export const PF_GRANZON_SIM   = 1 - PF_RESIDUOS_PROC; // 0.3 del residuo = granzón

export const PRECIOS = {
  peña: 75000,
  pozo: 85000,
  granzonPeña: 35000,
  granzonPozo: 37000,
};

export const COSTOS_DIARIOS_7M3 = {
  salario: 2217219.06666667 / 24,
  gasolina: 1700000 / 24,
  mantenimiento: 1039500 / 24,
};
export const COSTO_TOTAL_DIARIO_7M3 =
  COSTOS_DIARIOS_7M3.salario + COSTOS_DIARIOS_7M3.gasolina + COSTOS_DIARIOS_7M3.mantenimiento;

// Costos diarios por volqueta 14m³ (hoja 2, valores literales del Excel)
export const COSTOS_DIARIOS_14M3 = {
  salario: 105418.03911111112,
  gasolina: 108958.33333333333,
  mantenimiento: 118333.33333333333,
};
export const COSTO_TOTAL_DIARIO_14M3 =
  COSTOS_DIARIOS_14M3.salario + COSTOS_DIARIOS_14M3.gasolina + COSTOS_DIARIOS_14M3.mantenimiento;

export type TipoProducto = 'Peña' | 'Pozo';
export type ResiduosPozo = 'Peña' | 'Pozo';

export interface SimHomogeneaInput {
  tamano: '7m3' | '14m3';
  tIda: number;
  tVuelta: number;
  diasLV: number;
  diasS: number;
  W: number;
  producto: TipoProducto;
  residuosPozo: ResiduosPozo;
}

export interface SimHomogeneaOutput {
  Tcarga: number;       // ocupación excavadora por volqueta
  Tdescarga: number;
  m3Volqueta: number;
  Ttotal: number;       // ciclo individual
  Rb: number;           // tasa mín = 1/Tcarga
  Wo: number;           // volquetas óptimas (decimal)
  WUp: number;          // roundup
  WDn: number;          // rounddown
  TrealUp: number;
  TesperaUp: number;
  TrealDn: number;
  TesperaDn: number;
  cicloConWEspera: number;  // tiempo ciclo con W actuales
  viajesLV: number;
  viajesS: number;
  m3Fase1LV: number;
  m3Fase1S: number;
  productoFinalZarandaLV: number;
  productoFinalZarandaS: number;
  residuosLV: number;
  residuosS: number;
  productoEnResiduosLV: number;
  productoEnResiduosS: number;
  granzonLV: number;
  granzonS: number;
  productoFinalTotalLV: number;  // producto zaranda + producto en residuos
  productoFinalTotalS: number;
  ingresoDiarioLV: number;
  ingresoDiarioS: number;
  ingresoMensualProducto: number;
  ingresoMensualGranzon: number;
  ingresoMensualTotal: number;
  costoDiarioOperacion: number;
  costoPorM3: number;
  tablaCostos: { cantVolq: number; totalM3: number; costoPorM3: number }[];
}

export function simularHomogenea(input: SimHomogeneaInput): SimHomogeneaOutput {
  const es7 = input.tamano === '7m3';
  const Tcarga = es7 ? TCARGA_SMALL : TCARGA_LARGE;
  const Tdescarga = TDESCARGA_SMALL; // hoja 1 usa 40s literal
  const m3Volqueta = es7 ? M3_POR_VIAJE_SMALL : M3_POR_VIAJE_LARGE;
  const Ttotal = Tcarga + Tdescarga + input.tIda + input.tVuelta;
  const Rb = 1 / Tcarga;
  const Wo = Ttotal * Rb;
  const WUp = Math.ceil(Wo);
  const WDn = Math.max(1, Math.floor(Wo));
  const TrealUp = WUp / Rb;
  const TrealDn = WDn / Rb;
  const TesperaUp = TrealUp - Ttotal;
  const TesperaDn = TrealDn - Ttotal;

  // Con W reales el ciclo efectivo es max(Ttotal, W×Tcarga)
  const cicloConWEspera = Math.max(Ttotal, input.W * Tcarga);
  const viajesLV = Math.floor((JORNADA_LV * input.W) / cicloConWEspera);
  const viajesS = Math.floor((JORNADA_SAB * input.W) / cicloConWEspera);
  const m3Fase1LV = viajesLV * m3Volqueta;
  const m3Fase1S = viajesS * m3Volqueta;

  const productoFinalZarandaLV = m3Fase1LV * PF_ZARANDA_PRINCIPAL;
  const productoFinalZarandaS = m3Fase1S * PF_ZARANDA_PRINCIPAL;
  const residuosLV = m3Fase1LV * (1 - PF_ZARANDA_PRINCIPAL);
  const residuosS = m3Fase1S * (1 - PF_ZARANDA_PRINCIPAL);

  // Producto final en residuos + granzón (depende del producto y residuos-como)
  let productoEnResiduosLV = 0, productoEnResiduosS = 0, granzonLV = 0, granzonS = 0;
  if (input.producto === 'Peña' || input.residuosPozo === 'Peña') {
    productoEnResiduosLV = residuosLV * PF_RESIDUOS_PROC;
    productoEnResiduosS = residuosS * PF_RESIDUOS_PROC;
    granzonLV = residuosLV * PF_GRANZON_SIM;
    granzonS = residuosS * PF_GRANZON_SIM;
  }
  // Si es Pozo y residuos se producen como Pozo, el simulador Excel no los computa (0)

  const productoFinalTotalLV = productoFinalZarandaLV + productoEnResiduosLV;
  const productoFinalTotalS = productoFinalZarandaS + productoEnResiduosS;

  const precioProducto = input.producto === 'Peña' ? PRECIOS.peña : PRECIOS.pozo;
  const precioGranzon = input.producto === 'Peña' ? PRECIOS.granzonPeña : PRECIOS.granzonPozo;

  const ingresoDiarioLV = productoFinalTotalLV * precioProducto + granzonLV * precioGranzon;
  const ingresoDiarioS = productoFinalTotalS * precioProducto + granzonS * precioGranzon;
  const ingresoMensualProducto =
    productoFinalTotalLV * precioProducto * input.diasLV +
    productoFinalTotalS * precioProducto * input.diasS;
  const ingresoMensualGranzon =
    granzonLV * precioGranzon * input.diasLV + granzonS * precioGranzon * input.diasS;
  const ingresoMensualTotal = ingresoMensualProducto + ingresoMensualGranzon;

  // Costos
  const costoPorVolqueta = es7 ? COSTO_TOTAL_DIARIO_7M3 : COSTO_TOTAL_DIARIO_14M3;
  const costoDiarioOperacion = costoPorVolqueta * input.W;
  const costoPorM3 = m3Fase1LV > 0 ? costoDiarioOperacion / m3Fase1LV : 0;

  // Tabla de costos para 1..4 volquetas (como Excel I39:K43)
  const tablaCostos = [1, 2, 3, 4].map(n => {
    const ciclo = Math.max(Ttotal, n * Tcarga);
    const m3 = Math.floor((JORNADA_LV * n) / ciclo) * m3Volqueta;
    const costo = n * costoPorVolqueta;
    return {
      cantVolq: n,
      totalM3: m3,
      costoPorM3: m3 > 0 ? costo / m3 : 0,
    };
  });

  return {
    Tcarga, Tdescarga, m3Volqueta, Ttotal, Rb, Wo, WUp, WDn,
    TrealUp, TesperaUp, TrealDn, TesperaDn,
    cicloConWEspera, viajesLV, viajesS,
    m3Fase1LV, m3Fase1S,
    productoFinalZarandaLV, productoFinalZarandaS,
    residuosLV, residuosS,
    productoEnResiduosLV, productoEnResiduosS,
    granzonLV, granzonS,
    productoFinalTotalLV, productoFinalTotalS,
    ingresoDiarioLV, ingresoDiarioS,
    ingresoMensualProducto, ingresoMensualGranzon, ingresoMensualTotal,
    costoDiarioOperacion, costoPorM3, tablaCostos,
  };
}

export interface SimMixtaInput {
  tIda: number;
  tVuelta: number;
  diasLV: number;
  diasS: number;
  cantVolq7: number; // volq 7m³ adicionales a la única 14m³
  producto: TipoProducto;
  residuosPozo: ResiduosPozo;
}

export interface SimMixtaOutput {
  Ttotal14: number;       // ciclo individual 14m³
  tTransporte14: number;  // descarga + ida + vuelta
  tCargaTotal7: number;   // n × 313
  cicloConjunto: number;
  tEspera14: number;
  viajesLV14: number;
  viajesS14: number;
  viajesLV7: number;
  viajesS7: number;
  viajesTotalLV: number;
  viajesTotalS: number;
  m3Fase1LV: number;
  m3Fase1S: number;
  productoFinalZarandaLV: number;
  productoFinalZarandaS: number;
  productoEnResiduosLV: number;
  productoEnResiduosS: number;
  granzonLV: number;
  granzonS: number;
  productoFinalTotalLV: number;
  productoFinalTotalS: number;
  ingresoDiarioLV: number;
  ingresoDiarioS: number;
  ingresoMensualProducto: number;
  ingresoMensualGranzon: number;
  ingresoMensualTotal: number;
  costoDiarioOperacion: number;
  costoPorM3: number;
}

export function simularMixta(input: SimMixtaInput): SimMixtaOutput {
  const n = Math.max(0, input.cantVolq7);
  // Tiempos del 14m³ (hoja 2: descarga = 83)
  const Ttotal14 = TCARGA_LARGE + TDESCARGA_LARGE + input.tIda + input.tVuelta;
  const tTransporte14 = TDESCARGA_LARGE + input.tIda + input.tVuelta;
  const tCargaTotal7 = n * TCARGA_SMALL;
  // Ciclo conjunto: cargar 14m³ + max(transporte 14, cola de 7m³)
  const cicloConjunto = TCARGA_LARGE + Math.max(tTransporte14, tCargaTotal7);
  const tEspera14 = Math.max(0, tCargaTotal7 - tTransporte14);

  const viajesLV14 = Math.floor(JORNADA_LV / cicloConjunto);
  const viajesS14 = Math.floor(JORNADA_SAB / cicloConjunto);
  const viajesLV7 = viajesLV14 * n;
  const viajesS7 = viajesS14 * n;
  const viajesTotalLV = viajesLV14 + viajesLV7;
  const viajesTotalS = viajesS14 + viajesS7;

  const m3Fase1LV = viajesLV14 * M3_POR_VIAJE_LARGE + viajesLV7 * M3_POR_VIAJE_SMALL;
  const m3Fase1S = viajesS14 * M3_POR_VIAJE_LARGE + viajesS7 * M3_POR_VIAJE_SMALL;

  const productoFinalZarandaLV = m3Fase1LV * PF_ZARANDA_PRINCIPAL;
  const productoFinalZarandaS = m3Fase1S * PF_ZARANDA_PRINCIPAL;
  const residuosLV = m3Fase1LV * (1 - PF_ZARANDA_PRINCIPAL);
  const residuosS = m3Fase1S * (1 - PF_ZARANDA_PRINCIPAL);

  let productoEnResiduosLV = 0, productoEnResiduosS = 0, granzonLV = 0, granzonS = 0;
  if (input.producto === 'Peña' || input.residuosPozo === 'Peña') {
    productoEnResiduosLV = residuosLV * PF_RESIDUOS_PROC;
    productoEnResiduosS = residuosS * PF_RESIDUOS_PROC;
    granzonLV = residuosLV * PF_GRANZON_SIM;
    granzonS = residuosS * PF_GRANZON_SIM;
  }

  const productoFinalTotalLV = productoFinalZarandaLV + productoEnResiduosLV;
  const productoFinalTotalS = productoFinalZarandaS + productoEnResiduosS;

  const precioProducto = input.producto === 'Peña' ? PRECIOS.peña : PRECIOS.pozo;
  const precioGranzon = input.producto === 'Peña' ? PRECIOS.granzonPeña : PRECIOS.granzonPozo;

  const ingresoDiarioLV = productoFinalTotalLV * precioProducto + granzonLV * precioGranzon;
  const ingresoDiarioS = productoFinalTotalS * precioProducto + granzonS * precioGranzon;
  const ingresoMensualProducto =
    productoFinalTotalLV * precioProducto * input.diasLV +
    productoFinalTotalS * precioProducto * input.diasS;
  const ingresoMensualGranzon =
    granzonLV * precioGranzon * input.diasLV + granzonS * precioGranzon * input.diasS;
  const ingresoMensualTotal = ingresoMensualProducto + ingresoMensualGranzon;

  const costoDiarioOperacion = COSTO_TOTAL_DIARIO_14M3 + n * COSTO_TOTAL_DIARIO_7M3;
  const costoPorM3 = m3Fase1LV > 0 ? costoDiarioOperacion / m3Fase1LV : 0;

  return {
    Ttotal14, tTransporte14, tCargaTotal7, cicloConjunto, tEspera14,
    viajesLV14, viajesS14, viajesLV7, viajesS7, viajesTotalLV, viajesTotalS,
    m3Fase1LV, m3Fase1S,
    productoFinalZarandaLV, productoFinalZarandaS,
    productoEnResiduosLV, productoEnResiduosS,
    granzonLV, granzonS,
    productoFinalTotalLV, productoFinalTotalS,
    ingresoDiarioLV, ingresoDiarioS,
    ingresoMensualProducto, ingresoMensualGranzon, ingresoMensualTotal,
    costoDiarioOperacion, costoPorM3,
  };
}
