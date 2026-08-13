// Capacidad en m³ de cada volqueta
// Por defecto: 7 m³
// SVM306: 13 m³
// SWR157: 8 m³

export const CAPACIDAD_VOLQUETAS: Record<string, number> = {
  'SAB643': 7,
  'OAJ577': 7,
  'ELJ809': 7,
  'CQN427': 7,
  'ACJ359': 7,
  'FBH108': 7,
  'SBC690': 7,
  'SWQ244': 7,
  'WCS071': 7,
  'AAD005': 7,
  'XGJ399': 7,
  'SKH366': 7,
  'SVM306': 13.00, // Esta volqueta tiene mayor capacidad
  'SNZ091': 7,
  'XKJ180': 7,
  'ATA644': 7,
  'IYB806': 7,
  'XKJ802': 7,
  'SNE194': 7,
  'SPM693': 7,
  'MBG720': 7,
  'XFJ040': 7,
  'SBE944': 7,
  'AQJ946': 7,
  'SWR157': 8,
  'AFE681': 7,
  'OKE331': 7,
  'SWJ304': 7,
};

export const CAPACIDAD_DEFAULT = 7;

export const getCapacidadVolqueta = (placa: string): number => {
  return CAPACIDAD_VOLQUETAS[placa.toUpperCase()] || CAPACIDAD_DEFAULT;
};

export interface GrupoCapacidad {
  capacidad: number;
  placas: string[];
  total: number;
}

/**
 * Inventario real de la flota agrupado por su capacidad EXACTA.
 *
 * Antes esto devolvía solo dos cubetas (`< 10 m³` = pequeñas, `>= 10 m³` =
 * grandes), lo que escondía a SWR157: con sus 8 m³ quedaba contada como si
 * fuera de 7. Se agrupa por el valor real para que cada capacidad de la flota
 * sea visible.
 */
export const getInventarioVolquetas = (): { grupos: GrupoCapacidad[]; total: number } => {
  const porCapacidad = new Map<number, string[]>();

  Object.entries(CAPACIDAD_VOLQUETAS).forEach(([placa, capacidad]) => {
    if (!porCapacidad.has(capacidad)) porCapacidad.set(capacidad, []);
    porCapacidad.get(capacidad)!.push(placa);
  });

  const grupos = Array.from(porCapacidad.entries())
    .map(([capacidad, placas]) => ({
      capacidad,
      placas: placas.sort((a, b) => a.localeCompare(b)),
      total: placas.length,
    }))
    .sort((a, b) => a.capacidad - b.capacidad);

  return { grupos, total: grupos.reduce((s, g) => s + g.total, 0) };
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
//   (todas)          | Trituradora → Zaranda               | 67.00%
//   (todas)          | Clasificadora → Zaranda             | 67.00%
//   (todas)          | → Almacenamiento tierra             |  0.00%  (residuo)
//   (todas)          | → Almacenamiento granzón            |  0.00%  (residuo)
// ──────────────────────────────────────────────────────────────────────────────

// Cuando el material sale de Punto de excavación → Zaranda, la zaranda genera
// tres fracciones que suman el 100% del volumen de entrada:
//   · 67.00%  → producto principal zaranda (continúa al siguiente flujo)
//   · 23.10%  → Peña residuos (fracción fina, producto directo)
//   · 9.90%   → Granzón residuos (fracción gruesa, 1 – 0.67 – 0.231)
export const PF_EXCAVACION_ZARANDA = 0.67;
export const PF_ZARANDA_DESTINO    = 0.231;
export const PF_EXCAVACION_TRITURADORA_POZO = 0.70;

// ─── Patios de almacenamiento de residuos ────────────────────────────────────
export const DESTINO_ALMACEN_TIERRA = 'Almacenamiento tierra';
export const DESTINO_ALMACEN_GRANZON = 'Almacenamiento granzón';
export const DESTINOS_ALMACENAMIENTO = [DESTINO_ALMACEN_TIERRA, DESTINO_ALMACEN_GRANZON];

/** ¿El movimiento lleva material a un patio de residuos en vez de procesarlo? */
export const esDestinoAlmacenamiento = (destino: string): boolean =>
  DESTINOS_ALMACENAMIENTO.includes(destino);

/**
 * Llevar material a un patio de almacenamiento es manejo de residuo, no
 * producción: no genera m³ de arena. Los viajes y el volumen transportado sí
 * quedan registrados, y sirven para medir el granzón y la tierra realmente
 * movidos en vez de estimarlos como el 9,9 % y el resto de la Fase 1.
 */
export const PF_ALMACENAMIENTO = 0;
/** Retorno a la zaranda desde Trituradora o Clasificadora. */
export const PF_RETORNO_ZARANDA    = 0.67;
export const PF_PENA_RESIDUOS      = 0.231;         // fracción fina que sale en zaranda
export const PF_GRANZON            = 1 - 0.67 - 0.231; // ≈ 0.099 (fracción gruesa)

const PORCENTAJES_ARENA = {
  'Silice A - Peña': {
    'Punto de excavación': {
      'Zaranda': PF_EXCAVACION_ZARANDA,
      [DESTINO_ALMACEN_TIERRA]: PF_ALMACENAMIENTO,
    },
    'Zaranda': {
      'Trituradora': PF_ZARANDA_DESTINO,
      'Clasificadora': PF_ZARANDA_DESTINO,
      'Repaso': PF_ZARANDA_DESTINO,
      'Revolver': PF_ZARANDA_DESTINO,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Trituradora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Clasificadora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
  },
  'Silice B - Pozo': {
    'Punto de excavación': {
      'Zaranda': PF_EXCAVACION_ZARANDA,
      'Trituradora': PF_EXCAVACION_TRITURADORA_POZO,
      [DESTINO_ALMACEN_TIERRA]: PF_ALMACENAMIENTO,
    },
    'Zaranda': {
      'Trituradora': PF_ZARANDA_DESTINO,  // Resultado: Silice A - Peña
      'Clasificadora': PF_ZARANDA_DESTINO, // Resultado: Silice A - Peña
      'Repaso': PF_ZARANDA_DESTINO,        // Resultado: Silice A - Peña
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Trituradora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Clasificadora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
  },
  'Silice C - Arena Fina': {
    'Punto de excavación': {
      'Zaranda': PF_EXCAVACION_ZARANDA,
      'Trituradora': PF_EXCAVACION_TRITURADORA_POZO,
      [DESTINO_ALMACEN_TIERRA]: PF_ALMACENAMIENTO,
    },
    'Zaranda': {
      'Trituradora': PF_ZARANDA_DESTINO,  // Resultado: Silice A - Peña
      'Clasificadora': PF_ZARANDA_DESTINO, // Resultado: Silice A - Peña
      'Repaso': PF_ZARANDA_DESTINO,        // Resultado: Silice A - Peña
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Trituradora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
    },
    'Clasificadora': {
      'Zaranda': PF_RETORNO_ZARANDA,
      [DESTINO_ALMACEN_GRANZON]: PF_ALMACENAMIENTO,
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
  if ((silice === 'Silice B - Pozo' || silice === 'Silice C - Arena Fina') && origen === 'Zaranda') {
    siliceResultante = 'Silice A - Peña';
  }

  // Determinar tipo de PF según la tabla
  let tipoPF: 'Peña' | 'Pozo' | 'Granzón';
  if (destino === DESTINO_ALMACEN_GRANZON) {
    // Es granzón que se lleva al patio: no produce arena (PF 0), pero el tipo
    // de material sí es granzón.
    tipoPF = 'Granzón';
  } else if (siliceResultante === 'Silice B - Pozo' || siliceResultante === 'Silice C - Arena Fina') {
    tipoPF = 'Pozo';
  } else {
    tipoPF = 'Peña';
  }

  return { m3Producidos, tipoPF, siliceResultante, porcentajePF: porcentaje };
};



