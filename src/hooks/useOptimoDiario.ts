import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getCapacidadVolqueta } from '@/lib/volquetas';
import { calcularOptimoDia, jornadaSegundosParaFecha } from '@/lib/simulador';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export interface OptimoPorDia {
  fecha: string;       // YYYY-MM-DD
  viajesOptimo: number;
  m3Optimo: number;    // m³ producidos (con PF 0.67)
  m3OptimoBruto: number; // m³ sacados sin PF
}

interface Params {
  fechaInicio: string;   // YYYY-MM-DD
  fechaFin: string;      // YYYY-MM-DD
  tipoSilice?: string;   // 'todos' | 'Silice A - Peña' | 'Silice B - Pozo'
}

interface TiempoRow { fecha: string; silice: string; tiempo_ida: number; tiempo_vuelta: number; }
interface MovRow { fecha: string; placa: string; silice: string; cantidad_movimientos: number; }

export const useOptimoDiario = ({ fechaInicio, fechaFin, tipoSilice }: Params) => {
  return useQuery({
    queryKey: ['optimo-diario', fechaInicio, fechaFin, tipoSilice ?? 'todos'],
    queryFn: async (): Promise<Map<string, OptimoPorDia>> => {
      // 1. Tiempos del rango + históricos para promedio fallback
      const [tiemposRangoRes, tiemposAllRes, movsRes] = await Promise.all([
        supabase
          .from('tiempos')
          .select('fecha, silice, tiempo_ida, tiempo_vuelta')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
        supabase.from('tiempos').select('tiempo_ida, tiempo_vuelta'),
        supabase
          .from('movimientos')
          .select('fecha, placa, silice, cantidad_movimientos')
          .eq('origen', 'Punto de excavación')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
      ]);

      const tiemposRango = (tiemposRangoRes.data ?? []) as TiempoRow[];
      const movs = (movsRes.data ?? []) as MovRow[];
      const tiemposAll = (tiemposAllRes.data ?? []) as Pick<TiempoRow, 'tiempo_ida' | 'tiempo_vuelta'>[];

      // 2. Promedio histórico (fallback)
      const promedioHist = (() => {
        if (tiemposAll.length === 0) return { ida: 0, vuelta: 0 };
        const sumIda = tiemposAll.reduce((s, t) => s + Number(t.tiempo_ida), 0);
        const sumVuelta = tiemposAll.reduce((s, t) => s + Number(t.tiempo_vuelta), 0);
        return { ida: sumIda / tiemposAll.length, vuelta: sumVuelta / tiemposAll.length };
      })();

      // 3. Indexar tiempos por fecha+silice
      const tiemposMap = new Map<string, { ida: number; vuelta: number }>();
      tiemposRango.forEach(t => {
        tiemposMap.set(`${t.fecha}|${t.silice}`, { ida: Number(t.tiempo_ida), vuelta: Number(t.tiempo_vuelta) });
      });

      // 4. Agrupar placas por fecha+silice (placas únicas)
      const placasMap = new Map<string, Set<string>>();
      const silicesPorFecha = new Map<string, Set<string>>();
      movs.forEach(m => {
        const k = `${m.fecha}|${m.silice}`;
        if (!placasMap.has(k)) placasMap.set(k, new Set());
        placasMap.get(k)!.add(m.placa.toUpperCase());
        if (!silicesPorFecha.has(m.fecha)) silicesPorFecha.set(m.fecha, new Set());
        silicesPorFecha.get(m.fecha)!.add(m.silice);
      });

      // 5. Iterar todos los días del rango y calcular óptimo
      const resultado = new Map<string, OptimoPorDia>();
      const dias = eachDayOfInterval({ start: parseISO(fechaInicio), end: parseISO(fechaFin) });

      for (const d of dias) {
        const fecha = format(d, 'yyyy-MM-dd');
        const jornada = jornadaSegundosParaFecha(fecha);
        if (jornada === 0) {
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, m3OptimoBruto: 0 });
          continue;
        }

        const silicesDelDia = silicesPorFecha.get(fecha) ?? new Set<string>();
        // Filtrar por tipoSilice si aplica
        const silices = tipoSilice && tipoSilice !== 'todos'
          ? Array.from(silicesDelDia).filter(s => s === tipoSilice)
          : Array.from(silicesDelDia);

        if (silices.length === 0) {
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, m3OptimoBruto: 0 });
          continue;
        }

        let viajesTot = 0, m3Tot = 0, m3BrutoTot = 0;
        for (const sil of silices) {
          const placas = placasMap.get(`${fecha}|${sil}`) ?? new Set<string>();
          let nSmall = 0, nLarge = 0;
          placas.forEach(p => {
            if (getCapacidadVolqueta(p) >= 10) nLarge++; else nSmall++;
          });
          if (nSmall + nLarge === 0) continue;

          const t = tiemposMap.get(`${fecha}|${sil}`) ?? promedioHist;
          const { viajes, m3, m3Bruto } = calcularOptimoDia({
            tIda: t.ida,
            tVuelta: t.vuelta,
            nSmall,
            nLarge,
            jornadaSeg: jornada,
          });
          viajesTot += viajes;
          m3Tot += m3;
          m3BrutoTot += m3Bruto;
        }

        resultado.set(fecha, {
          fecha,
          viajesOptimo: viajesTot,
          m3Optimo: Math.round(m3Tot * 100) / 100,
          m3OptimoBruto: Math.round(m3BrutoTot * 100) / 100,
        });
      }

      return resultado;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
