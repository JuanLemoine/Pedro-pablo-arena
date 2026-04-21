// Capacidad en m³ de cada volqueta
// Por defecto: 5.50 m³
// SVM306: 13 m³

export const CAPACIDAD_VOLQUETAS: Record<string, number> = {
  'SAB643': 5.50,
  'OAJ577': 5.50,
  'ELJ809': 5.50,
  'CQN427': 5.50,
  'ACJ359': 5.50,
  'FBH108': 5.50,
  'SBC690': 5.50,
  'SWQ244': 5.50,
  'WCS071': 5.50,
  'AAD005': 5.50,
  'XGJ399': 5.50,
  'SKH366': 5.50,
  'SVM306': 13.00, // Esta volqueta tiene mayor capacidad
  'SNZ091': 5.50,
  'XKJ180': 5.50,
  'ATA644': 5.50,
  'IYB806': 5.50,
  'XKJ802': 5.50,
  'SNE194': 5.50,
  'SPM693': 5.50,
  'MBG720': 5.50,
  'XFJ040': 5.50,
  'SBE944': 5.50,
  'AQJ946': 5.50,
};

export const CAPACIDAD_DEFAULT = 5.50;

export const getCapacidadVolqueta = (placa: string): number => {
  return CAPACIDAD_VOLQUETAS[placa.toUpperCase()] || CAPACIDAD_DEFAULT;
};

/**
 * Obtiene el inventario real de volquetas agrupado por capacidad
 */
export const getInventarioVolquetas = (): { 
  pequenas: { placa: string; capacidad: number }[]; 
  grandes: { placa: string; capacidad: number }[];
  totalPequenas: number;
  totalGrandes: number;
  total: number;
} => {
  const pequenas: { placa: string; capacidad: number }[] = [];
  const grandes: { placa: string; capacidad: number }[] = [];
  
  Object.entries(CAPACIDAD_VOLQUETAS).forEach(([placa, capacidad]) => {
    if (capacidad >= 10) {
      grandes.push({ placa, capacidad });
    } else {
      pequenas.push({ placa, capacidad });
    }
  });
  
  return {
    pequenas,
    grandes,
    totalPequenas: pequenas.length,
    totalGrandes: grandes.length,
    total: pequenas.length + grandes.length,
  };
};

/**
 * Obtiene todas las placas disponibles
 */
export const getPlacasDisponibles = (): string[] => {
  return Object.keys(CAPACIDAD_VOLQUETAS);
};

export const calcularM3Producidos = (viajes: { placa: string; cantidad_viajes: number }[]): number => {
  return viajes.reduce((total, viaje) => {
    const capacidad = getCapacidadVolqueta(viaje.placa);
    return total + (capacidad * viaje.cantidad_viajes);
  }, 0);
};

// ─── Porcentajes de Factor de Producción (PF) por flujo ───────────────────────
// Tabla oficial:
//   Silice A - Peña  | Punto de excavación → Zaranda      | 67.00%
//   Silice A - Peña  | Zaranda → Trituradora               | 23.10%
//   Silice A - Peña  | Zaranda → Clasificadora             | 23.10%
//   Silice A - Peña  | Zaranda → Repaso                    | 23.10%
//   Silice B - Pozo  | Punto de excavación → Zaranda       | 67.00%
//   Silice B - Pozo  | Punto de excavación → Trituradora   | 70.00%
//   Silice B - Pozo  | Zaranda → Trituradora               | 23.10%  → resulta Peña
//   Silice B - Pozo  | Zaranda → Clasificadora             | 23.10%  → resulta Peña
// ──────────────────────────────────────────────────────────────────────────────

// Cuando el material sale de Punto de excavación → Zaranda, la zaranda genera
// tres fracciones que suman el 100% del volumen de entrada:
//   · 67.00%  → producto principal zaranda (continúa al siguiente flujo)
//   · 23.10%  → Peña residuos (fracción fina, producto directo)
//   · 9.90%   → Granzón residuos (fracción gruesa, 1 – 0.67 – 0.231)
export const PF_EXCAVACION_ZARANDA = 0.67;
export const PF_ZARANDA_DESTINO    = 0.231;
export const PF_EXCAVACION_TRITURADORA_POZO = 0.70;
export const PF_PENA_RESIDUOS      = 0.231;         // fracción fina que sale en zaranda
export const PF_GRANZON            = 1 - 0.67 - 0.231; // ≈ 0.099 (fracción gruesa)

const PORCENTAJES_ARENA = {
  'Silice A - Peña': {
    'Punto de excavación': {
      'Zaranda': PF_EXCAVACION_ZARANDA,
    },
    'Zaranda': {
      'Trituradora': PF_ZARANDA_DESTINO,
      'Clasificadora': PF_ZARANDA_DESTINO,
      'Repaso': PF_ZARANDA_DESTINO,
      'Revolver': PF_ZARANDA_DESTINO,
    },
  },
  'Silice B - Pozo': {
    'Punto de excavación': {
      'Zaranda': PF_EXCAVACION_ZARANDA,
      'Trituradora': PF_EXCAVACION_TRITURADORA_POZO,
    },
    'Zaranda': {
      'Trituradora': PF_ZARANDA_DESTINO,  // Resultado: Silice A - Peña
      'Clasificadora': PF_ZARANDA_DESTINO, // Resultado: Silice A - Peña
    },
  },
};

export interface ResultadoProduccion {
  /** m³ de arena producida = capacidad × PF% */
  m3Producidos: number;
  /** Tipo de arena resultante según la tabla de PF */
  tipoPF: 'Peña' | 'Pozo' | 'Granzón';
  /** Sílice resultante completo (puede cambiar en Silice B desde Zaranda) */
  siliceResultante: string;
  /** Porcentaje de PF aplicado */
  porcentajePF: number;
}

/**
 * Calcula los m³ producidos por un movimiento y el TIPO de arena resultante,
 * según la tabla oficial de Factor de Producción (PF):
 *
 *  Silice A - Peña | Excavación → Zaranda      | 67.00% | Peña
 *  Silice A - Peña | Zaranda → Trituradora      | 23.10% | Peña
 *  Silice A - Peña | Zaranda → Clasificadora    | 23.10% | Peña
 *  Silice A - Peña | Zaranda → Repaso            | 23.10% | Peña
 *  Silice B - Pozo | Excavación → Zaranda       | 67.00% | Pozo
 *  Silice B - Pozo | Excavación → Trituradora   | 70.00% | Pozo
 *  Silice B - Pozo | Zaranda → Trituradora      | 23.10% | Peña  ← conversión
 *  Silice B - Pozo | Zaranda → Clasificadora    | 23.10% | Peña  ← conversión
 *
 * Cada movimiento produce UN SOLO tipo de arena a UN SOLO porcentaje.
 */
export const calcularM3PorMovimiento = (
  placa: string,
  silice: string,
  origen: string,
  destino: string
): ResultadoProduccion => {
  const capacidadTotal = getCapacidadVolqueta(placa);

  const porcentajesSilice = PORCENTAJES_ARENA[silice as keyof typeof PORCENTAJES_ARENA];
  if (!porcentajesSilice) {
    return { m3Producidos: 0, tipoPF: 'Peña', siliceResultante: silice, porcentajePF: 0 };
  }

  const porcentajesOrigen = porcentajesSilice[origen as keyof typeof porcentajesSilice];
  if (!porcentajesOrigen) {
    return { m3Producidos: 0, tipoPF: 'Peña', siliceResultante: silice, porcentajePF: 0 };
  }

  const porcentaje = porcentajesOrigen[destino as keyof typeof porcentajesOrigen];
  if (porcentaje === undefined) {
    return { m3Producidos: 0, tipoPF: 'Peña', siliceResultante: silice, porcentajePF: 0 };
  }

  const m3Producidos = capacidadTotal * porcentaje;

  // Determinar sílice resultante
  // Caso especial: Silice B - Pozo desde Zaranda produce Silice A - Peña
  let siliceResultante = silice;
  if (silice === 'Silice B - Pozo' && origen === 'Zaranda') {
    siliceResultante = 'Silice A - Peña';
  }

  // Determinar tipo de PF según la tabla
  let tipoPF: 'Peña' | 'Pozo' | 'Granzón';
  if (siliceResultante === 'Silice B - Pozo') {
    tipoPF = 'Pozo';
  } else {
    tipoPF = 'Peña';
  }

  return { m3Producidos, tipoPF, siliceResultante, porcentajePF: porcentaje };
};



