import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularOptimoTeorico, jornadaSegundosParaFecha } from '@/lib/simulador';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export interface OptimoPorDia {
  fecha: string;           // YYYY-MM-DD
  viajesOptimo: number;    // viajes máximos/día (saturación excavadora)
  m3Optimo: number;        // "Cant m³ fase 1/día" del Excel (sin PF)
  Wo: number;              // volquetas óptimas (decimal)
  usedFallback: boolean;   // true si se usó promedio histórico
}

interface Params {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice?: string;
}

interface TiempoRow { fecha: string; silice: string; tiempo_ida: number; tiempo_vuelta: number; }

export const useOptimoDiario = ({ fechaInicio, fechaFin, tipoSilice }: Params) => {
  return useQuery({
    queryKey: ['optimo-diario', fechaInicio, fechaFin, tipoSilice ?? 'todos'],
    queryFn: async (): Promise<Map<string, OptimoPorDia>> => {
      // Tiempos del rango + históricos (promedio fallback)
      const [tiemposRangoRes, tiemposAllRes] = await Promise.all([
        supabase
          .from('tiempos')
          .select('fecha, silice, tiempo_ida, tiempo_vuelta')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
        supabase.from('tiempos').select('tiempo_ida, tiempo_vuelta'),
      ]);

      const tiemposRango = (tiemposRangoRes.data ?? []) as TiempoRow[];
      const tiemposAll = (tiemposAllRes.data ?? []) as Pick<TiempoRow, 'tiempo_ida' | 'tiempo_vuelta'>[];

      // Promedio histórico (fallback)
      const promedioHist = (() => {
        if (tiemposAll.length === 0) return null;
        const sumIda = tiemposAll.reduce((s, t) => s + Number(t.tiempo_ida), 0);
        const sumVuelta = tiemposAll.reduce((s, t) => s + Number(t.tiempo_vuelta), 0);
        return { ida: sumIda / tiemposAll.length, vuelta: sumVuelta / tiemposAll.length };
      })();

      // Agrupar tiempos por fecha (promediando entre sílices si hay A y B)
      // Filtrar por sílice si aplica
      const filtrados = tipoSilice && tipoSilice !== 'todos'
        ? tiemposRango.filter(t => t.silice === tipoSilice)
        : tiemposRango;

      const tiemposPorFecha = new Map<string, { ida: number; vuelta: number }>();
      const acumulador = new Map<string, { idaSum: number; vueltaSum: number; n: number }>();
      filtrados.forEach(t => {
        const acc = acumulador.get(t.fecha) ?? { idaSum: 0, vueltaSum: 0, n: 0 };
        acc.idaSum += Number(t.tiempo_ida);
        acc.vueltaSum += Number(t.tiempo_vuelta);
        acc.n += 1;
        acumulador.set(t.fecha, acc);
      });
      acumulador.forEach((v, k) => {
        tiemposPorFecha.set(k, { ida: v.idaSum / v.n, vuelta: v.vueltaSum / v.n });
      });

      // Iterar todos los días del rango
      const resultado = new Map<string, OptimoPorDia>();
      const dias = eachDayOfInterval({ start: parseISO(fechaInicio), end: parseISO(fechaFin) });

      for (const d of dias) {
        const fecha = format(d, 'yyyy-MM-dd');
        const jornada = jornadaSegundosParaFecha(fecha);
        if (jornada === 0) {
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, Wo: 0, usedFallback: false });
          continue;
        }

        const t = tiemposPorFecha.get(fecha);
        const usedFallback = !t;
        const tiempos = t ?? promedioHist;
        if (!tiempos) {
          // Sin tiempos ni promedio histórico
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, Wo: 0, usedFallback: true });
          continue;
        }

        const { viajes, m3Fase1, Wo } = calcularOptimoTeorico(tiempos.ida, tiempos.vuelta, jornada);
        resultado.set(fecha, {
          fecha,
          viajesOptimo: viajes,
          m3Optimo: Math.round(m3Fase1 * 100) / 100,
          Wo: Math.round(Wo * 100) / 100,
          usedFallback,
        });
      }

      return resultado;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
