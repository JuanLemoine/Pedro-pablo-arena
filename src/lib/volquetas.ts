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

// Porcentajes de arena según la combinación sílice/origen/destino
const PORCENTAJES_ARENA = {
  // Silice A - Peña
  'Silice A - Peña': {
    'Punto de excavación': {
      'Zaranda': 0.67, // 67%
    },
    'Zaranda': {
      'Trituradora': 0.231, // 23.1%
      'Clasificadora': 0.231,
      'Zaranda': 0.231,
    },
  },
  // Silice B - Pozo
  'Silice B - Pozo': {
    'Punto de excavación': {
      'Zaranda': 0.67, // 67%
      'Trituradora': 0.70, // 70%
    },
    'Zaranda': {
      'Trituradora': 0.231, // 23.1% - Se convierte en Silice A
      'Clasificadora': 0.231, // 23.1% - Se convierte en Silice A
    },
  },
};

export interface ResultadoProduccion {
  m3Producidos: number;
  siliceResultante: string; // El tipo de sílice final (puede cambiar en ciertos casos)
}

/**
 * Calcula los m³ de arena producidos según la combinación sílice/origen/destino
 * También determina el tipo de sílice resultante (puede cambiar en ciertos casos)
 */
export const calcularM3PorMovimiento = (
  placa: string,
  silice: string,
  origen: string,
  destino: string
): ResultadoProduccion => {
  const capacidadTotal = getCapacidadVolqueta(placa);
  
  // Obtener el porcentaje según la combinación
  const porcentajesSilice = PORCENTAJES_ARENA[silice as keyof typeof PORCENTAJES_ARENA];
  if (!porcentajesSilice) {
    return { m3Producidos: 0, siliceResultante: silice };
  }
  
  const porcentajesOrigen = porcentajesSilice[origen as keyof typeof porcentajesSilice];
  if (!porcentajesOrigen) {
    return { m3Producidos: 0, siliceResultante: silice };
  }
  
  const porcentaje = porcentajesOrigen[destino as keyof typeof porcentajesOrigen];
  if (porcentaje === undefined) {
    return { m3Producidos: 0, siliceResultante: silice };
  }
  
  const m3Producidos = capacidadTotal * porcentaje;
  
  // Caso especial: Silice B - Pozo desde Zaranda se convierte en Silice A - Peña
  let siliceResultante = silice;
  if (silice === 'Silice B - Pozo' && origen === 'Zaranda') {
    siliceResultante = 'Silice A - Peña';
  }
  
  return {
    m3Producidos,
    siliceResultante,
  };
};



