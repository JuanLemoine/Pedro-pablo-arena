import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  calcularOptimoDia,
  calcularMejorConfig,
  jornadaSegundosParaFecha,
  labelFlota,
} from '@/lib/simulador';
import { getCapacidadVolqueta } from '@/lib/volquetas';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export interface OptimoPorDia {
  fecha: string;
  // Flota real asignada ese día (agregada sobre sílices)
  nSmallActual: number;
  nLargeActual: number;
  wActual: number;                // nSmall + nLarge reales
  configActualLabel: string;      // p.ej. "2×7m³" o "1×14m³ + 1×7m³"
  m3Actual: number;               // m³ fase 1 que producirían las volquetas reales
  viajesActual: number;
  // Óptimo teórico (mejor combinación dados los tiempos)
  nSmallOptimo: number;
  nLargeOptimo: number;
  woRound: number;                // nSmallOptimo + nLargeOptimo (= "mín. volquetas para el máximo")
  configOptimoLabel: string;      // p.ej. "1×14m³ + 1×7m³"
  m3Optimo: number;               // máximo "Cant m³ fase 1/día" alcanzable
  viajesOptimo: number;
  woOptimo: number;               // Wo teórico (decimal)
  // Balance
  diferencia: number;             // wActual - woRound
  usedFallback: boolean;
}

interface Params {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice?: string;
}

interface TiempoRow { fecha: string; silice: string; tiempo_ida: number; tiempo_vuelta: number; }
interface MovRow { fecha: string; placa: string; silice: string; }

const vacio = (fecha: string): OptimoPorDia => ({
  fecha,
  nSmallActual: 0, nLargeActual: 0, wActual: 0, configActualLabel: '—',
  m3Actual: 0, viajesActual: 0,
  nSmallOptimo: 0, nLargeOptimo: 0, woRound: 0, configOptimoLabel: '—',
  m3Optimo: 0, viajesOptimo: 0, woOptimo: 0,
  diferencia: 0, usedFallback: false,
});

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

      const promedioHist = (() => {
        if (tiemposAll.length === 0) return null;
        const n = tiemposAll.length;
        return {
          ida: tiemposAll.reduce((s, t) => s + Number(t.tiempo_ida), 0) / n,
          vuelta: tiemposAll.reduce((s, t) => s + Number(t.tiempo_vuelta), 0) / n,
        };
      })();

      const tiemposMap = new Map<string, { ida: number; vuelta: number }>();
      tiemposRango.forEach(t => {
        tiemposMap.set(`${t.fecha}|${t.silice}`, {
          ida: Number(t.tiempo_ida),
          vuelta: Number(t.tiempo_vuelta),
        });
      });

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
        if (jornada === 0) { resultado.set(fecha, vacio(fecha)); continue; }

        const silicesDelDia = tipoSilice && tipoSilice !== 'todos'
          ? [tipoSilice]
          : Array.from(silicesPorFecha.get(fecha) ?? []);

        if (silicesDelDia.length === 0) { resultado.set(fecha, vacio(fecha)); continue; }

        let nSmallAct = 0, nLargeAct = 0;
        let viajesAct = 0, m3Act = 0;
        let viajesOpt = 0, m3Opt = 0, woOptSuma = 0;
        let nSmallOpt = 0, nLargeOpt = 0;
        let usedFallback = false;
        const labelsActPorSil: string[] = [];
        const labelsOptPorSil: string[] = [];
        const multiSilice = silicesDelDia.length > 1;

        for (const sil of silicesDelDia) {
          const placas = placasMap.get(`${fecha}|${sil}`) ?? new Set<string>();
          let nSmall = 0, nLarge = 0;
          placas.forEach(p => {
            if (getCapacidadVolqueta(p) >= 10) nLarge++; else nSmall++;
          });

          const t = tiemposMap.get(`${fecha}|${sil}`);
          if (!t) usedFallback = true;
          const tiempos = t ?? promedioHist;
          if (!tiempos) continue;

          // Actual (con volquetas realmente asignadas)
          if (nSmall + nLarge > 0) {
            const real = calcularOptimoDia({
              tIda: tiempos.ida, tVuelta: tiempos.vuelta,
              nSmall, nLarge, jornadaSeg: jornada,
            });
            nSmallAct += nSmall;
            nLargeAct += nLarge;
            viajesAct += real.viajes;
            m3Act += real.m3Bruto;
            if (multiSilice) labelsActPorSil.push(`${sil}: ${labelFlota(nSmall, nLarge)}`);
            else labelsActPorSil.push(labelFlota(nSmall, nLarge));
          }

          // Óptimo teórico (mejor combinación dados los tiempos)
          const mejor = calcularMejorConfig(tiempos.ida, tiempos.vuelta, jornada);
          nSmallOpt += mejor.nSmall;
          nLargeOpt += mejor.nLarge;
          viajesOpt += mejor.viajes;
          m3Opt += mejor.m3Bruto;
          woOptSuma += mejor.Wo;
          if (multiSilice) labelsOptPorSil.push(`${sil}: ${mejor.label}`);
          else labelsOptPorSil.push(mejor.label);
        }

        const wActual = nSmallAct + nLargeAct;
        const woRound = nSmallOpt + nLargeOpt;
        resultado.set(fecha, {
          fecha,
          nSmallActual: nSmallAct,
          nLargeActual: nLargeAct,
          wActual,
          configActualLabel: labelsActPorSil.length ? labelsActPorSil.join(' · ') : '—',
          m3Actual: Math.round(m3Act * 100) / 100,
          viajesActual: viajesAct,
          nSmallOptimo: nSmallOpt,
          nLargeOptimo: nLargeOpt,
          woRound,
          configOptimoLabel: labelsOptPorSil.length ? labelsOptPorSil.join(' · ') : '—',
          m3Optimo: Math.round(m3Opt * 100) / 100,
          viajesOptimo: viajesOpt,
          woOptimo: Math.round(woOptSuma * 100) / 100,
          diferencia: wActual - woRound,
          usedFallback,
        });
      }

      return resultado;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
