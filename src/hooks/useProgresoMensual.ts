import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento, getInventarioVolquetas } from '@/lib/volquetas';
import {
  simularProduccionAnalitica,
  encontrarConfiguracionOptima,
} from '@/lib/modeloProduccion';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DiaProgreso {
  dia: number;
  fechaLabel: string;
  /** m³ acumulados reales hasta este día (null = día futuro) */
  acumuladoReal: number | null;
  /** m³ proyectados acumulados al continuar al ritmo actual (null = día pasado) */
  proyectado: number | null;
  /** m³ que debería haber acumulados según la meta mensual de la simulación */
  metaAcumulada: number;
  esFuturo: boolean;
}

export interface ProgresoMensualData {
  dias: DiaProgreso[];
  /** Meta total mensual según simulación óptima */
  targetMes: number;
  /** m³ reales acumulados este mes */
  acumuladoReal: number;
  /** Promedio de m³ producidos por día (días con datos) */
  promedioM3Dia: number;
  /** Días transcurridos del mes */
  diasTranscurridos: number;
  /** Total de días del mes */
  diasTotales: number;
  /** % de avance respecto a la meta */
  porcentajeAvance: number;
  /** Proyección de m³ al cierre del mes al ritmo actual */
  proyeccionCierre: number;
}

export const useProgresoMensual = () => {
  return useQuery({
    queryKey: ['progreso-mensual'],
    queryFn: async (): Promise<ProgresoMensualData> => {
      const now = new Date();
      const primerDia = startOfMonth(now);
      const ultimoDia = endOfMonth(now);
      const hoyStr = format(now, 'yyyy-MM-dd');
      const inicioStr = format(primerDia, 'yyyy-MM-dd');

      // Movimientos del mes actual
      const { data: movimientos } = await supabase
        .from('movimientos')
        .select('fecha, placa, silice, origen, destino, cantidad_movimientos')
        .gte('fecha', inicioStr)
        .lte('fecha', hoyStr)
        .order('fecha');

      // Calcular meta mensual de la simulación óptima
      const inventario = getInventarioVolquetas();
      const configs = encontrarConfiguracionOptima(
        { totalPequenas: inventario.totalPequenas, totalGrandes: inventario.totalGrandes },
        'ruta1',
        22,
        1
      );
      const configOptima =
        configs.length > 0
          ? configs[0]
          : {
              config: {
                numVolquetasPequenas: inventario.totalPequenas,
                numVolquetasGrandes: inventario.totalGrandes,
                ruta: 'ruta1',
                horasOperacionDia: 7,
                diasMes: 22,
                turnosPorDia: 1,
              },
              resultado: simularProduccionAnalitica({
                numVolquetasPequenas: inventario.totalPequenas,
                numVolquetasGrandes: inventario.totalGrandes,
                ruta: 'ruta1',
                horasOperacionDia: 7,
                diasMes: 22,
                turnosPorDia: 1,
              }),
            };

      const targetMes = configOptima.resultado.m3PorMes;

      // Agrupar producción por fecha
      const produccionPorDia = new Map<string, number>();
      movimientos?.forEach(mov => {
        const res = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        const m3 = res.m3Producidos * mov.cantidad_movimientos;
        produccionPorDia.set(mov.fecha, (produccionPorDia.get(mov.fecha) || 0) + m3);
      });

      // Primera pasada: acumulado real y promedio
      const todosLosDias = eachDayOfInterval({ start: primerDia, end: ultimoDia });
      const diasDelMes = todosLosDias.length;

      let acumuladoReal = 0;
      let diasConDatos = 0;

      todosLosDias.forEach(dia => {
        const fechaStr = format(dia, 'yyyy-MM-dd');
        if (fechaStr <= hoyStr) {
          acumuladoReal += produccionPorDia.get(fechaStr) || 0;
          diasConDatos++;
        }
      });

      const promedioM3Dia = diasConDatos > 0 ? acumuladoReal / diasConDatos : 0;
      const proyeccionCierre = acumuladoReal + promedioM3Dia * (diasDelMes - diasConDatos);

      // Segunda pasada: construir array de días
      let cumReal = 0;
      const dias: DiaProgreso[] = todosLosDias.map((dia, idx) => {
        const fechaStr = format(dia, 'yyyy-MM-dd');
        const esFuturo = fechaStr > hoyStr;
        const numDia = idx + 1;
        const metaAcumulada = Math.round((targetMes / diasDelMes) * numDia * 100) / 100;

        if (!esFuturo) {
          cumReal += produccionPorDia.get(fechaStr) || 0;
        }

        const acumuladoRealDia = esFuturo ? null : Math.round(cumReal * 100) / 100;

        // Proyección: arranca desde el acumulado real de hoy hacia el cierre
        const diasDesdeHoy = numDia - diasConDatos;
        const proyectado =
          !esFuturo && numDia < diasConDatos
            ? null
            : Math.round((acumuladoReal + promedioM3Dia * Math.max(0, diasDesdeHoy)) * 100) / 100;

        return {
          dia: numDia,
          fechaLabel: format(dia, 'd MMM', { locale: es }),
          acumuladoReal: acumuladoRealDia,
          proyectado,
          metaAcumulada,
          esFuturo,
        };
      });

      return {
        dias,
        targetMes: Math.round(targetMes * 100) / 100,
        acumuladoReal: Math.round(acumuladoReal * 100) / 100,
        promedioM3Dia: Math.round(promedioM3Dia * 100) / 100,
        diasTranscurridos: diasConDatos,
        diasTotales: diasDelMes,
        porcentajeAvance: targetMes > 0 ? Math.round((acumuladoReal / targetMes) * 1000) / 10 : 0,
        proyeccionCierre: Math.round(proyeccionCierre * 100) / 100,
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
};
