import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularOptimoDia, calcularOptimoTeorico, jornadaSegundosParaFecha } from '@/lib/simulador';
import { getCapacidadVolqueta } from '@/lib/volquetas';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export interface OptimoPorDia {
  fecha: string;
  viajesOptimo: number;
  m3Optimo: number;       // "Cant m³ fase 1/día" del Excel (sin PF)
  wActual: number;        // volquetas reales asignadas ese día
  woOptimo: number;       // Wo = volquetas necesarias para saturar (decimal)
  woRound: number;        // ceil(Wo) = mínimo entero para saturar
  diferencia: number;     // wActual - woRound (+ = de más, - = faltan)
  usedFallback: boolean;
}

interface Params {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice?: string;
}

interface TiempoRow { fecha: string; silice: string; tiempo_ida: number; tiempo_vuelta: number; }
interface MovRow { fecha: string; placa: string; silice: string; }

export const useOptimoDiario = ({ fechaInicio, fechaFin, tipoSilice }: Params) => {
  return useQuery({
    queryKey: ['optimo-diario', fechaInicio, fechaFin, tipoSilice ?? 'todos'],
    queryFn: async (): Promise<Map<string, OptimoPorDia>> => {
      const [tiemposRangoRes, tiemposAllRes, movsRes] = await Promise.all([
        supabase
          .from('tiempos')
          .select('fecha, silice, tiempo_ida, tiempo_vuelta')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
        supabase.from('tiempos').select('tiempo_ida, tiempo_vuelta'),
        supabase
          .from('movimientos')
          .select('fecha, placa, silice')
          .eq('origen', 'Punto de excavación')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),
      ]);

      const tiemposRango = (tiemposRangoRes.data ?? []) as TiempoRow[];
      const movs = (movsRes.data ?? []) as MovRow[];
      const tiemposAll = (tiemposAllRes.data ?? []) as Pick<TiempoRow, 'tiempo_ida' | 'tiempo_vuelta'>[];

      // Promedio histórico de tiempos (fallback cuando no hay registro ese día)
      const promedioHist = (() => {
        if (tiemposAll.length === 0) return null;
        const n = tiemposAll.length;
        return {
          ida: tiemposAll.reduce((s, t) => s + Number(t.tiempo_ida), 0) / n,
          vuelta: tiemposAll.reduce((s, t) => s + Number(t.tiempo_vuelta), 0) / n,
        };
      })();

      // Tiempos por fecha+silice
      const tiemposMap = new Map<string, { ida: number; vuelta: number }>();
      tiemposRango.forEach(t => {
        tiemposMap.set(`${t.fecha}|${t.silice}`, {
          ida: Number(t.tiempo_ida),
          vuelta: Number(t.tiempo_vuelta),
        });
      });

      // Placas únicas por fecha+silice
      const placasMap = new Map<string, Set<string>>();
      const silicesPorFecha = new Map<string, Set<string>>();
      movs.forEach(m => {
        const filtroOk = !tipoSilice || tipoSilice === 'todos' || m.silice === tipoSilice;
        if (!filtroOk) return;
        const k = `${m.fecha}|${m.silice}`;
        if (!placasMap.has(k)) placasMap.set(k, new Set());
        placasMap.get(k)!.add(m.placa.toUpperCase());
        if (!silicesPorFecha.has(m.fecha)) silicesPorFecha.set(m.fecha, new Set());
        silicesPorFecha.get(m.fecha)!.add(m.silice);
      });

      const resultado = new Map<string, OptimoPorDia>();
      const dias = eachDayOfInterval({ start: parseISO(fechaInicio), end: parseISO(fechaFin) });

      for (const d of dias) {
        const fecha = format(d, 'yyyy-MM-dd');
        const jornada = jornadaSegundosParaFecha(fecha);
        if (jornada === 0) {
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, wActual: 0, woOptimo: 0, woRound: 0, diferencia: 0, usedFallback: false });
          continue;
        }

        const silicesDelDia = tipoSilice && tipoSilice !== 'todos'
          ? [tipoSilice]
          : Array.from(silicesPorFecha.get(fecha) ?? []);

        if (silicesDelDia.length === 0) {
          resultado.set(fecha, { fecha, viajesOptimo: 0, m3Optimo: 0, wActual: 0, woOptimo: 0, woRound: 0, diferencia: 0, usedFallback: false });
          continue;
        }

        let viajesTot = 0, m3Tot = 0, wActualTot = 0, woSuma = 0, woRoundSuma = 0;
        let usedFallback = false;

        for (const sil of silicesDelDia) {
          const placas = placasMap.get(`${fecha}|${sil}`) ?? new Set<string>();
          let nSmall = 0, nLarge = 0;
          placas.forEach(p => {
            if (getCapacidadVolqueta(p) >= 10) nLarge++; else nSmall++;
          });
          if (nSmall + nLarge === 0) continue;

          const t = tiemposMap.get(`${fecha}|${sil}`);
          if (!t) usedFallback = true;
          const tiempos = t ?? promedioHist;
          if (!tiempos) continue;

          const { viajes, m3Bruto } = calcularOptimoDia({
            tIda: tiempos.ida,
            tVuelta: tiempos.vuelta,
            nSmall,
            nLarge,
            jornadaSeg: jornada,
          });

          // Wo teórico para esta sílice (asumiendo flota pequeña como referencia)
          const teo = calcularOptimoTeorico(tiempos.ida, tiempos.vuelta, jornada);

          viajesTot += viajes;
          m3Tot += m3Bruto;
          wActualTot += nSmall + nLarge;
          woSuma += teo.Wo;
          woRoundSuma += teo.WoRound;
        }

        resultado.set(fecha, {
          fecha,
          viajesOptimo: viajesTot,
          m3Optimo: Math.round(m3Tot * 100) / 100,
          wActual: wActualTot,
          woOptimo: Math.round(woSuma * 100) / 100,
          woRound: woRoundSuma,
          diferencia: wActualTot - woRoundSuma,
          usedFallback,
        });
      }

      return resultado;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
