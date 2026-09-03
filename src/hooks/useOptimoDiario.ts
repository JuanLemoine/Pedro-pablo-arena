import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  calcularOptimoDia,
  calcularMejorConfig,
  clasificarPorCapacidad,
  jornadaSegundosParaFecha,
  labelFlota,
} from '@/lib/simulador';
import { getCapacidadVolqueta } from '@/lib/volquetas';
import { traerTodo } from '@/lib/fetchTodo';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export interface OptimoPorDia {
  fecha: string;
  // Flota real asignada ese día (agregada sobre sílices)
  nSmallActual: number;
  /** Volquetas de 8 m³ asignadas (SWR157). */
  nMediumActual: number;
  nLargeActual: number;
  wActual: number;                // nSmall + nMedium + nLarge reales
  configActualLabel: string;      // p.ej. "2×7m³" o "1×14m³ + 1×7m³"
  m3Actual: number;               // m³ fase 1 que producirían las volquetas reales
  viajesActual: number;
  // Óptimo teórico (mejor combinación dados los tiempos)
  nSmallOptimo: number;
  nLargeOptimo: number;
  woRound: number;                // nSmallOptimo + nLargeOptimo (= "mín. volquetas para el máximo")
  configOptimoLabel: string;      // p.ej. "1×14m³ + 1×7m³"
  m3Optimo: number;               // máximo "Cant m³ fase 1/día" alcanzable
  /** m³ brutos óptimos desglosados por sílice, para comparar Peña vs Pozo. */
  m3OptimoPorSilice: Record<string, number>;
  viajesOptimo: number;
  woOptimo: number;               // Wo teórico (decimal)
  // Balance
  diferencia: number;             // wActual - woRound
  /** true si algún sílice usó una medición de otra fecha (la última anterior). */
  usedFallback: boolean;
  /**
   * Tiempos que se usaron ese día, por sílice, con la fecha de la que salieron.
   * Si `fecha` no es la del día, es la última medición registrada antes de él.
   */
  tiemposUsados: Record<string, { fecha: string; ida: number; vuelta: number }>;
}

interface Params {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice?: string;
}

interface TiempoRow { fecha: string; silice: string; tiempo_ida: number; tiempo_vuelta: number; }
/** Una medición de ida y vuelta con la fecha en que se tomó. */
interface MedicionTiempo { fecha: string; ida: number; vuelta: number; }
interface MovRow { fecha: string; placa: string; silice: string; }

/**
 * Las dos rutas de la operación. La capacidad instalada del día es la suma de
 * ambas, exista o no actividad registrada. Arena Fina no tiene ruta propia.
 */
const SILICES_CON_RUTA = ['Silice A - Peña', 'Silice B - Pozo'];

const vacio = (fecha: string): OptimoPorDia => ({
  fecha,
  nSmallActual: 0, nMediumActual: 0, nLargeActual: 0, wActual: 0, configActualLabel: '—',
  m3Actual: 0, viajesActual: 0,
  nSmallOptimo: 0, nLargeOptimo: 0, woRound: 0, configOptimoLabel: '—',
  m3Optimo: 0, m3OptimoPorSilice: {}, viajesOptimo: 0, woOptimo: 0,
  diferencia: 0, usedFallback: false, tiemposUsados: {},
});

export const useOptimoDiario = ({ fechaInicio, fechaFin, tipoSilice }: Params) => {
  return useQuery({
    queryKey: ['optimo-diario', fechaInicio, fechaFin, tipoSilice ?? 'todos'],
    queryFn: async (): Promise<Map<string, OptimoPorDia>> => {
      const [tiemposAll, movsRes] = await Promise.all([
        // Todas las mediciones, no solo las del rango: para cada día se usa la
        // última registrada hasta esa fecha.
        traerTodo<TiempoRow>((desde, hasta) =>
          supabase
            .from('tiempos')
            .select('fecha, silice, tiempo_ida, tiempo_vuelta')
            .order('fecha', { ascending: true })
            .range(desde, hasta) as unknown as PromiseLike<{ data: TiempoRow[] | null; error: unknown }>
        ),
        // Paginado: un rango de varios meses supera las 1.000 filas por petición.
        traerTodo<MovRow>((desde, hasta) =>
          supabase
            .from('movimientos')
            .select('fecha, placa, silice')
            .eq('origen', 'Punto de excavación')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('id', { ascending: true })
            .range(desde, hasta) as unknown as PromiseLike<{ data: MovRow[] | null; error: unknown }>
        ),
      ]);

      const movs = movsRes;

      /**
       * Historial de mediciones por sílice, ordenado por fecha. Para un día
       * dado se toma la última medición registrada hasta esa fecha: los tiempos
       * de ida y vuelta se mantienen mientras no se vuelva a medir, así que la
       * medición vigente es la más reciente, no un promedio de todo el histórico.
       */
      const historial = new Map<string, MedicionTiempo[]>();
      tiemposAll.forEach(t => {
        const lista = historial.get(t.silice) ?? [];
        lista.push({ fecha: t.fecha, ida: Number(t.tiempo_ida), vuelta: Number(t.tiempo_vuelta) });
        historial.set(t.silice, lista);
      });
      historial.forEach(lista => lista.sort((a, b) => a.fecha.localeCompare(b.fecha)));

      /** Promedio de todo el histórico: último recurso si un sílice nunca se midió. */
      const promedioHist: MedicionTiempo | null = tiemposAll.length === 0 ? null : {
        fecha: '',
        ida: tiemposAll.reduce((s, t) => s + Number(t.tiempo_ida), 0) / tiemposAll.length,
        vuelta: tiemposAll.reduce((s, t) => s + Number(t.tiempo_vuelta), 0) / tiemposAll.length,
      };

      /**
       * La medición vigente de un sílice en una fecha: la última con fecha menor
       * o igual. Si la fecha es anterior a la primera medición, se usa esa
       * primera (lo más cercano que existe) y si el sílice no tiene ninguna, el
       * promedio histórico.
       */
      const medicionVigente = (silice: string, fecha: string): MedicionTiempo | null => {
        const lista = historial.get(silice);
        if (!lista || lista.length === 0) return promedioHist;
        let elegida: MedicionTiempo | null = null;
        for (const m of lista) {
          if (m.fecha > fecha) break;
          elegida = m;
        }
        return elegida ?? lista[0];
      };

      const placasMap = new Map<string, Set<string>>();
      movs.forEach(m => {
        const filtroOk = !tipoSilice || tipoSilice === 'todos' || m.silice === tipoSilice;
        if (!filtroOk) return;
        const k = `${m.fecha}|${m.silice}`;
        if (!placasMap.has(k)) placasMap.set(k, new Set());
        placasMap.get(k)!.add(m.placa.toUpperCase());
      });

      const resultado = new Map<string, OptimoPorDia>();
      const dias = eachDayOfInterval({ start: parseISO(fechaInicio), end: parseISO(fechaFin) });

      for (const d of dias) {
        const fecha = format(d, 'yyyy-MM-dd');
        const jornada = jornadaSegundosParaFecha(fecha);
        if (jornada === 0) { resultado.set(fecha, vacio(fecha)); continue; }

        /**
         * La capacidad se calcula en TODOS los días hábiles, se haya operado o
         * no: un día hábil sin operación es capacidad perdida y debe pesar en
         * el cumplimiento. Antes solo se calculaba en los días con movimientos,
         * lo que inflaba el porcentaje (ago-2025 en Peña daba 99 % porque se
         * operaron pocos días y cada uno rindió bien).
         *
         * Las rutas de la operación son las dos: si no se filtra por sílice, la
         * capacidad del día es la de Peña más la de Pozo, hayan operado o no.
         */
        const silicesDelDia = tipoSilice && tipoSilice !== 'todos'
          ? [tipoSilice]
          : SILICES_CON_RUTA;

        let nSmallAct = 0, nMediumAct = 0, nLargeAct = 0;
        let viajesAct = 0, m3Act = 0;
        let viajesOpt = 0, m3Opt = 0, woOptSuma = 0;
        let nSmallOpt = 0, nLargeOpt = 0;
        const m3OptPorSil: Record<string, number> = {};
        let usedFallback = false;
        const tiemposUsados: Record<string, { fecha: string; ida: number; vuelta: number }> = {};
        const labelsActPorSil: string[] = [];
        const labelsOptPorSil: string[] = [];
        const multiSilice = silicesDelDia.length > 1;

        for (const sil of silicesDelDia) {
          const placas = placasMap.get(`${fecha}|${sil}`) ?? new Set<string>();
          let nSmall = 0, nMedium = 0, nLarge = 0;
          placas.forEach(p => {
            const clase = clasificarPorCapacidad(getCapacidadVolqueta(p));
            if (clase === 'large') nLarge++;
            else if (clase === 'medium') nMedium++;
            else nSmall++;
          });

          const tiempos = medicionVigente(sil, fecha);
          if (!tiempos) continue;
          if (tiempos.fecha !== fecha) usedFallback = true;
          tiemposUsados[sil] = { fecha: tiempos.fecha, ida: tiempos.ida, vuelta: tiempos.vuelta };

          // Actual (con volquetas realmente asignadas)
          if (nSmall + nMedium + nLarge > 0) {
            const real = calcularOptimoDia({
              tIda: tiempos.ida, tVuelta: tiempos.vuelta,
              nSmall, nMedium, nLarge, jornadaSeg: jornada,
            });
            nSmallAct += nSmall;
            nMediumAct += nMedium;
            nLargeAct += nLarge;
            viajesAct += real.viajes;
            m3Act += real.m3Bruto;
            const etiqueta = labelFlota(nSmall, nLarge, nMedium);
            if (multiSilice) labelsActPorSil.push(`${sil}: ${etiqueta}`);
            else labelsActPorSil.push(etiqueta);
          }

          // Óptimo teórico (mejor combinación dados los tiempos)
          const mejor = calcularMejorConfig(tiempos.ida, tiempos.vuelta, jornada);
          nSmallOpt += mejor.nSmall;
          nLargeOpt += mejor.nLarge;
          viajesOpt += mejor.viajes;
          m3Opt += mejor.m3Bruto;
          m3OptPorSil[sil] = (m3OptPorSil[sil] ?? 0) + mejor.m3Bruto;
          woOptSuma += mejor.Wo;
          if (multiSilice) labelsOptPorSil.push(`${sil}: ${mejor.label}`);
          else labelsOptPorSil.push(mejor.label);
        }

        const wActual = nSmallAct + nMediumAct + nLargeAct;
        const woRound = nSmallOpt + nLargeOpt;
        resultado.set(fecha, {
          fecha,
          nSmallActual: nSmallAct,
          nMediumActual: nMediumAct,
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
          m3OptimoPorSilice: m3OptPorSil,
          viajesOptimo: viajesOpt,
          woOptimo: Math.round(woOptSuma * 100) / 100,
          diferencia: wActual - woRound,
          usedFallback,
          tiemposUsados,
        });
      }

      return resultado;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
