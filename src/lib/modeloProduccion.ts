/**
 * Modelo de Optimización de Producción de Arena
 * Basado en el modelo Python de simulación de eventos discretos
 * Adaptado a TypeScript con enfoque analítico
 */

// Capacidades de volquetas en m³
export const CAPACIDADES_VOLQUETAS = {
  PEQUENA: 5.50,  // Volquetas estándar (7m³ bruto → 5.5m³ neto)
  GRANDE: 13.00,  // Volqueta grande (14m³ bruto → 13m³ neto)
};

// Tiempos de operación en minutos (basados en mediciones reales)
export interface TiemposOperacion {
  // Tiempos de carga
  tiempoCargaPequena: number;  // minutos para cargar volqueta pequeña
  tiempoCargaGrande: number;   // minutos para cargar volqueta grande
  
  // Tiempos de descarga
  tiempoDescarga: number;
  
  // Tiempos de viaje según ruta
  tiempoViajeIdaRuta1: number;    // Ruta 1 - Pozo
  tiempoViajeRegresoRuta1: number;
  tiempoViajeIdaRuta2: number;    // Ruta 2 - Peña
  tiempoViajeRegresoRuta2: number;
  
  // Tiempos adicionales
  tiempoMontajeBurro: number;
  tiempoQuitarBurro: number;
}

// Tiempos por defecto basados en mediciones (en minutos)
export const TIEMPOS_DEFAULT: TiemposOperacion = {
  tiempoCargaPequena: 4.0,    // ~9 cucharadas × 25 seg = 3.75 min
  tiempoCargaGrande: 8.75,    // ~21 cucharadas × 25 seg = 8.75 min
  tiempoDescarga: 5.0,
  tiempoViajeIdaRuta1: 5.0,   // Ruta Pozo
  tiempoViajeRegresoRuta1: 4.5,
  tiempoViajeIdaRuta2: 4.0,   // Ruta Peña (más corta)
  tiempoViajeRegresoRuta2: 3.5,
  tiempoMontajeBurro: 1.2,    // 73 segundos
  tiempoQuitarBurro: 0.25,    // 15 segundos
};

// Factores de procesamiento de arena
export const FACTORES_PROCESAMIENTO = {
  // Del material extraído, el 67% es arena útil en primera pasada
  FACTOR_ARENA_LIMPIA_PRIMERA: 0.67,
  // Del residuo (33%), se puede recuperar el 70% en segunda pasada
  FACTOR_RESIDUO: 0.33,
  FACTOR_RECUPERACION_RESIDUO: 0.70,
  // Factor de arena limpia en segunda pasada (zaranda → trituradora)
  FACTOR_ARENA_SEGUNDA: 0.231,
};

export interface ConfiguracionFlota {
  numVolquetasPequenas: number;
  numVolquetasGrandes: number;
  ruta: 'ruta1' | 'ruta2';  // ruta1 = Pozo, ruta2 = Peña
  horasOperacionDia: number;
  diasMes: number;
  turnosPorDia: number;
}

export interface ResultadoSimulacion {
  // Producción
  m3PorTurno: number;
  m3PorDia: number;
  m3PorMes: number;
  
  // Viajes
  viajesPorTurno: number;
  viajesPorDia: number;
  viajesPorMes: number;
  
  // Eficiencia
  eficiencia: number;  // 0-100%
  tiempoCicloPromedio: number;  // minutos
  
  // Desglose por tipo de volqueta
  viajesVolquetaPequena: number;
  viajesVolquetaGrande: number;
  m3VolquetaPequena: number;
  m3VolquetaGrande: number;
  
  // Capacidad teórica
  capacidadMaximaTeorica: number;
}

/**
 * Calcula el tiempo de ciclo completo para una volqueta
 */
export function calcularTiempoCiclo(
  capacidadVolqueta: number,
  ruta: 'ruta1' | 'ruta2',
  tiempos: TiemposOperacion = TIEMPOS_DEFAULT
): number {
  const tiempoCarga = capacidadVolqueta >= 10 
    ? tiempos.tiempoCargaGrande 
    : tiempos.tiempoCargaPequena;
  
  const tiempoViajeIda = ruta === 'ruta1' 
    ? tiempos.tiempoViajeIdaRuta1 
    : tiempos.tiempoViajeIdaRuta2;
  
  const tiempoViajeRegreso = ruta === 'ruta1' 
    ? tiempos.tiempoViajeRegresoRuta1 
    : tiempos.tiempoViajeRegresoRuta2;
  
  // Tiempo total del ciclo
  return tiempoCarga + 
         tiempoViajeIda + 
         tiempos.tiempoDescarga + 
         tiempoViajeRegreso + 
         tiempos.tiempoMontajeBurro + 
         tiempos.tiempoQuitarBurro;
}

/**
 * Simula la producción de arena de forma analítica (sin eventos discretos)
 */
export function simularProduccionAnalitica(
  config: ConfiguracionFlota,
  tiempos: TiemposOperacion = TIEMPOS_DEFAULT
): ResultadoSimulacion {
  const minutosOperacion = config.horasOperacionDia * 60;
  
  // Calcular viajes por tipo de volqueta
  let totalM3Turno = 0;
  let totalViajesTurno = 0;
  let viajesVolquetaPequena = 0;
  let viajesVolquetaGrande = 0;
  let m3VolquetaPequena = 0;
  let m3VolquetaGrande = 0;
  
  // Volquetas pequeñas (5.5 m³)
  if (config.numVolquetasPequenas > 0) {
    const tiempoCicloPequena = calcularTiempoCiclo(CAPACIDADES_VOLQUETAS.PEQUENA, config.ruta, tiempos);
    const viajesPorVolqueta = Math.floor(minutosOperacion / tiempoCicloPequena);
    viajesVolquetaPequena = viajesPorVolqueta * config.numVolquetasPequenas;
    
    // Aplicar factor de arena limpia (67% primera pasada)
    m3VolquetaPequena = viajesVolquetaPequena * CAPACIDADES_VOLQUETAS.PEQUENA * FACTORES_PROCESAMIENTO.FACTOR_ARENA_LIMPIA_PRIMERA;
  }
  
  // Volquetas grandes (13 m³)
  if (config.numVolquetasGrandes > 0) {
    const tiempoCicloGrande = calcularTiempoCiclo(CAPACIDADES_VOLQUETAS.GRANDE, config.ruta, tiempos);
    const viajesPorVolqueta = Math.floor(minutosOperacion / tiempoCicloGrande);
    viajesVolquetaGrande = viajesPorVolqueta * config.numVolquetasGrandes;
    
    m3VolquetaGrande = viajesVolquetaGrande * CAPACIDADES_VOLQUETAS.GRANDE * FACTORES_PROCESAMIENTO.FACTOR_ARENA_LIMPIA_PRIMERA;
  }
  
  totalViajesTurno = viajesVolquetaPequena + viajesVolquetaGrande;
  totalM3Turno = m3VolquetaPequena + m3VolquetaGrande;
  
  // Factor de eficiencia por cuellos de botella (punto de carga único)
  // A más volquetas, más esperas
  const totalVolquetas = config.numVolquetasPequenas + config.numVolquetasGrandes;
  const factorCuelloBotella = totalVolquetas <= 2 ? 0.98 
    : totalVolquetas <= 4 ? 0.95 
    : totalVolquetas <= 6 ? 0.90 
    : 0.85;
  
  totalM3Turno *= factorCuelloBotella;
  
  // Calcular tiempo de ciclo promedio
  const tiempoCicloPromedio = totalViajesTurno > 0 
    ? minutosOperacion / (totalViajesTurno / totalVolquetas) 
    : 0;
  
  // Capacidad máxima teórica (sin cuellos de botella)
  const capacidadMaximaTeorica = (
    config.numVolquetasPequenas * CAPACIDADES_VOLQUETAS.PEQUENA + 
    config.numVolquetasGrandes * CAPACIDADES_VOLQUETAS.GRANDE
  ) * (minutosOperacion / 15) * FACTORES_PROCESAMIENTO.FACTOR_ARENA_LIMPIA_PRIMERA; // 15 min ciclo ideal
  
  return {
    m3PorTurno: Math.round(totalM3Turno * 100) / 100,
    m3PorDia: Math.round(totalM3Turno * config.turnosPorDia * 100) / 100,
    m3PorMes: Math.round(totalM3Turno * config.turnosPorDia * config.diasMes * 100) / 100,
    
    viajesPorTurno: Math.round(totalViajesTurno * factorCuelloBotella),
    viajesPorDia: Math.round(totalViajesTurno * factorCuelloBotella * config.turnosPorDia),
    viajesPorMes: Math.round(totalViajesTurno * factorCuelloBotella * config.turnosPorDia * config.diasMes),
    
    eficiencia: Math.round(factorCuelloBotella * 100 * 10) / 10,
    tiempoCicloPromedio: Math.round(tiempoCicloPromedio * 10) / 10,
    
    viajesVolquetaPequena: Math.round(viajesVolquetaPequena * factorCuelloBotella),
    viajesVolquetaGrande: Math.round(viajesVolquetaGrande * factorCuelloBotella),
    m3VolquetaPequena: Math.round(m3VolquetaPequena * factorCuelloBotella * 100) / 100,
    m3VolquetaGrande: Math.round(m3VolquetaGrande * factorCuelloBotella * 100) / 100,
    
    capacidadMaximaTeorica: Math.round(capacidadMaximaTeorica * 100) / 100,
  };
}

/**
 * Inventario de volquetas disponibles
 */
export interface InventarioVolquetas {
  totalPequenas: number;  // Volquetas con capacidad < 10 m³
  totalGrandes: number;   // Volquetas con capacidad >= 10 m³
}

/**
 * Encuentra la configuración óptima de flota basándose en el inventario REAL disponible
 * Solo sugiere configuraciones con las volquetas que realmente existen
 */
export function encontrarConfiguracionOptima(
  inventario: InventarioVolquetas,
  ruta: 'ruta1' | 'ruta2' = 'ruta1',
  diasMes: number = 22,
  turnosPorDia: number = 1
): { config: ConfiguracionFlota; resultado: ResultadoSimulacion }[] {
  const configuraciones: { config: ConfiguracionFlota; resultado: ResultadoSimulacion }[] = [];
  
  // Solo probar combinaciones con las volquetas DISPONIBLES en el inventario
  for (let grandes = 0; grandes <= inventario.totalGrandes; grandes++) {
    for (let pequenas = 0; pequenas <= inventario.totalPequenas; pequenas++) {
      if (grandes === 0 && pequenas === 0) continue;
      
      const config: ConfiguracionFlota = {
        numVolquetasPequenas: pequenas,
        numVolquetasGrandes: grandes,
        ruta,
        horasOperacionDia: 7,
        diasMes,
        turnosPorDia,
      };
      
      const resultado = simularProduccionAnalitica(config);
      configuraciones.push({ config, resultado });
    }
  }
  
  // Ordenar por producción mensual descendente
  configuraciones.sort((a, b) => b.resultado.m3PorMes - a.resultado.m3PorMes);
  
  return configuraciones;
}

/**
 * Proyecta la producción del mes basándose en datos históricos
 */
export function proyectarProduccionMes(
  viajesRealizados: number,
  m3Producidos: number,
  diasTranscurridos: number,
  diasTotalesMes: number = 22
): {
  proyeccionM3: number;
  proyeccionViajes: number;
  promedioM3PorDia: number;
  promedioViajesPorDia: number;
  ritmoActual: 'bajo' | 'normal' | 'alto';
} {
  // Evitar división por cero
  if (diasTranscurridos === 0) {
    return {
      proyeccionM3: 0,
      proyeccionViajes: 0,
      promedioM3PorDia: 0,
      promedioViajesPorDia: 0,
      ritmoActual: 'normal',
    };
  }
  
  const promedioM3PorDia = m3Producidos / diasTranscurridos;
  const promedioViajesPorDia = viajesRealizados / diasTranscurridos;
  
  const proyeccionM3 = promedioM3PorDia * diasTotalesMes;
  const proyeccionViajes = promedioViajesPorDia * diasTotalesMes;
  
  // Determinar el ritmo comparando con el óptimo
  // Asumiendo configuración típica de 2-3 volquetas pequeñas
  const produccionOptimaReferencia = 300; // m³/día aproximado para config típica
  const porcentajeVsOptimo = (promedioM3PorDia / produccionOptimaReferencia) * 100;
  
  let ritmoActual: 'bajo' | 'normal' | 'alto';
  if (porcentajeVsOptimo < 70) {
    ritmoActual = 'bajo';
  } else if (porcentajeVsOptimo > 100) {
    ritmoActual = 'alto';
  } else {
    ritmoActual = 'normal';
  }
  
  return {
    proyeccionM3: Math.round(proyeccionM3 * 100) / 100,
    proyeccionViajes: Math.round(proyeccionViajes),
    promedioM3PorDia: Math.round(promedioM3PorDia * 100) / 100,
    promedioViajesPorDia: Math.round(promedioViajesPorDia * 10) / 10,
    ritmoActual,
  };
}

/**
 * Calcula métricas de eficiencia basándose en datos reales
 */
export function calcularMetricasEficiencia(
  viajesReales: number,
  m3Reales: number,
  viajesOptimos: number,
  m3Optimos: number
): {
  eficienciaViajes: number;
  eficienciaProduccion: number;
  brechaM3: number;
  brechaViajes: number;
  recomendacion: string;
} {
  const eficienciaViajes = viajesOptimos > 0 
    ? Math.min((viajesReales / viajesOptimos) * 100, 100) 
    : 0;
  
  const eficienciaProduccion = m3Optimos > 0 
    ? Math.min((m3Reales / m3Optimos) * 100, 100) 
    : 0;
  
  const brechaM3 = m3Optimos - m3Reales;
  const brechaViajes = viajesOptimos - viajesReales;
  
  let recomendacion: string;
  if (eficienciaProduccion >= 90) {
    recomendacion = 'Excelente rendimiento. Mantener operación actual.';
  } else if (eficienciaProduccion >= 75) {
    recomendacion = 'Buen rendimiento. Revisar tiempos de espera en carga/descarga.';
  } else if (eficienciaProduccion >= 50) {
    recomendacion = 'Rendimiento moderado. Considerar agregar turnos o volquetas.';
  } else {
    recomendacion = 'Rendimiento bajo. Revisar cuellos de botella y disponibilidad de equipos.';
  }
  
  return {
    eficienciaViajes: Math.round(eficienciaViajes * 10) / 10,
    eficienciaProduccion: Math.round(eficienciaProduccion * 10) / 10,
    brechaM3: Math.round(brechaM3 * 100) / 100,
    brechaViajes: Math.round(brechaViajes),
    recomendacion,
  };
}
