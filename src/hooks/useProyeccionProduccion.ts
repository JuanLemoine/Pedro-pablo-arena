import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento, getCapacidadVolqueta, getInventarioVolquetas } from '@/lib/volquetas';
import { 
  simularProduccionAnalitica, 
  proyectarProduccionMes, 
  calcularMetricasEficiencia,
  encontrarConfiguracionOptima,
  type ConfiguracionFlota,
  type ResultadoSimulacion 
} from '@/lib/modeloProduccion';

interface ProyeccionProduccion {
  // Datos reales del mes actual
  m3ProducidosReal: number;
  viajesReales: number;
  diasTranscurridos: number;
  
  // Proyección basada en ritmo actual
  proyeccion: {
    m3ProyectadoMes: number;
    viajesProyectadosMes: number;
    promedioM3PorDia: number;
    promedioViajesPorDia: number;
    ritmoActual: 'bajo' | 'normal' | 'alto';
  };
  
  // Inventario real de volquetas
  inventario: {
    totalPequenas: number;
    totalGrandes: number;
    total: number;
  };
  
  // Producción óptima según modelo (con volquetas disponibles)
  produccionOptima: ResultadoSimulacion;
  configuracionOptima: ConfiguracionFlota;
  
  // Producción con configuración actual detectada
  produccionConfigActual: ResultadoSimulacion;
  configuracionActual: ConfiguracionFlota;
  
  // Métricas de eficiencia
  metricas: {
    eficienciaViajes: number;
    eficienciaProduccion: number;
    brechaM3: number;
    brechaViajes: number;
    recomendacion: string;
  };
  
  // Comparación
  comparacion: {
    realVsOptimo: number; // porcentaje
    proyeccionVsOptimo: number;
    potencialMejora: number; // m³ adicionales posibles
  };
}

export const useProyeccionProduccion = () => {
  return useQuery({
    queryKey: ['proyeccion-produccion'],
    queryFn: async (): Promise<ProyeccionProduccion> => {
      const now = new Date();
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const primerDiaMesStr = primerDiaMes.toISOString().split('T')[0];
      const hoyStr = now.toISOString().split('T')[0];
      
      // Calcular días transcurridos del mes (solo días laborables aprox.)
      const diasTranscurridos = Math.max(1, Math.ceil(
        (now.getTime() - primerDiaMes.getTime()) / (1000 * 60 * 60 * 24)
      ));
      // Aproximar días laborables (excluir fines de semana), mínimo 1
      const diasLaborablesTranscurridos = Math.max(1, Math.round(diasTranscurridos * 5 / 7));
      
      // Obtener movimientos del mes actual
      const { data: movimientos, error } = await supabase
        .from('movimientos')
        .select('placa, silice, origen, destino')
        .gte('fecha', primerDiaMesStr)
        .lte('fecha', hoyStr);
      
      if (error) {
        console.error('Error fetching movimientos:', error);
        throw error;
      }
      
      // Calcular m³ producidos y viajes reales
      let m3ProducidosReal = 0;
      const viajesReales = movimientos?.length || 0;
      
      // Contar volquetas únicas para detectar configuración
      const volquetasUsadas = new Map<string, number>();
      
      movimientos?.forEach(mov => {
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        m3ProducidosReal += resultado.m3Producidos;
        
        // Contar viajes por volqueta
        const conteo = volquetasUsadas.get(mov.placa) || 0;
        volquetasUsadas.set(mov.placa, conteo + 1);
      });
      
      // Detectar configuración actual de flota
      let numVolquetasPequenas = 0;
      let numVolquetasGrandes = 0;
      
      volquetasUsadas.forEach((viajes, placa) => {
        const capacidad = getCapacidadVolqueta(placa);
        if (capacidad >= 10) {
          numVolquetasGrandes++;
        } else {
          numVolquetasPequenas++;
        }
      });
      
      // Obtener el inventario REAL de volquetas del sistema
      const inventarioReal = getInventarioVolquetas();
      
      // Si no hay datos de uso, usar configuración por defecto basada en el inventario
      if (numVolquetasPequenas === 0 && numVolquetasGrandes === 0) {
        // Usar una porción del inventario como configuración "actual" por defecto
        numVolquetasPequenas = Math.min(3, inventarioReal.totalPequenas);
        numVolquetasGrandes = Math.min(0, inventarioReal.totalGrandes);
      }
      
      // Configuración actual detectada (volquetas que se están usando)
      const configuracionActual: ConfiguracionFlota = {
        numVolquetasPequenas,
        numVolquetasGrandes,
        ruta: 'ruta1', // Por defecto
        horasOperacionDia: 7,
        diasMes: 22,
        turnosPorDia: 1,
      };
      
      // Simular producción con configuración actual
      const produccionConfigActual = simularProduccionAnalitica(configuracionActual);
      
      // Encontrar configuración óptima usando SOLO las volquetas disponibles en el inventario
      const configuracionesOptimas = encontrarConfiguracionOptima(
        {
          totalPequenas: inventarioReal.totalPequenas,
          totalGrandes: inventarioReal.totalGrandes,
        },
        'ruta1',
        22,
        1
      );
      
      // Configuración óptima por defecto basada en el inventario real
      const configOptimaPorDefecto: { config: ConfiguracionFlota; resultado: ResultadoSimulacion } = {
        config: {
          numVolquetasPequenas: inventarioReal.totalPequenas,
          numVolquetasGrandes: inventarioReal.totalGrandes,
          ruta: 'ruta1',
          horasOperacionDia: 7,
          diasMes: 22,
          turnosPorDia: 1,
        },
        resultado: simularProduccionAnalitica({
          numVolquetasPequenas: inventarioReal.totalPequenas,
          numVolquetasGrandes: inventarioReal.totalGrandes,
          ruta: 'ruta1',
          horasOperacionDia: 7,
          diasMes: 22,
          turnosPorDia: 1,
        })
      };
      
      const mejorConfiguracion = configuracionesOptimas.length > 0 
        ? configuracionesOptimas[0] 
        : configOptimaPorDefecto;
      
      // Proyectar producción basándose en ritmo actual
      const proyeccion = proyectarProduccionMes(
        viajesReales,
        m3ProducidosReal,
        diasLaborablesTranscurridos,
        22
      );
      
      // Calcular métricas de eficiencia
      // Comparamos con lo que debería producir la config actual según el modelo
      const diasRestantes = Math.max(0, 22 - diasLaborablesTranscurridos);
      const m3EsperadosHastaHoy = (produccionConfigActual.m3PorMes / 22) * diasLaborablesTranscurridos;
      const viajesEsperadosHastaHoy = (produccionConfigActual.viajesPorMes / 22) * diasLaborablesTranscurridos;
      
      const metricas = calcularMetricasEficiencia(
        viajesReales,
        m3ProducidosReal,
        Math.round(viajesEsperadosHastaHoy),
        m3EsperadosHastaHoy
      );
      
      // Calcular comparaciones
      const realVsOptimo = mejorConfiguracion.resultado.m3PorMes > 0
        ? (m3ProducidosReal / (mejorConfiguracion.resultado.m3PorMes / 22 * diasLaborablesTranscurridos)) * 100
        : 0;
      
      const proyeccionVsOptimo = mejorConfiguracion.resultado.m3PorMes > 0
        ? (proyeccion.m3ProyectadoMes / mejorConfiguracion.resultado.m3PorMes) * 100
        : 0;
      
      const potencialMejora = mejorConfiguracion.resultado.m3PorMes - proyeccion.m3ProyectadoMes;
      
      return {
        m3ProducidosReal: Math.round(m3ProducidosReal * 100) / 100,
        viajesReales,
        diasTranscurridos: diasLaborablesTranscurridos,
        
        proyeccion: {
          m3ProyectadoMes: proyeccion.proyeccionM3,
          viajesProyectadosMes: proyeccion.proyeccionViajes,
          promedioM3PorDia: proyeccion.promedioM3PorDia,
          promedioViajesPorDia: proyeccion.promedioViajesPorDia,
          ritmoActual: proyeccion.ritmoActual,
        },
        
        // Inventario real de volquetas disponibles
        inventario: {
          totalPequenas: inventarioReal.totalPequenas,
          totalGrandes: inventarioReal.totalGrandes,
          total: inventarioReal.total,
        },
        
        produccionOptima: mejorConfiguracion.resultado,
        configuracionOptima: mejorConfiguracion.config,
        
        produccionConfigActual,
        configuracionActual,
        
        metricas,
        
        comparacion: {
          realVsOptimo: Math.round(realVsOptimo * 10) / 10,
          proyeccionVsOptimo: Math.round(proyeccionVsOptimo * 10) / 10,
          potencialMejora: Math.round(potencialMejora * 100) / 100,
        },
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
};
