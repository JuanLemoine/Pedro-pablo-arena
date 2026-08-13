import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import { useOptimoDiario } from '@/hooks/useOptimoDiario';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';
import {
  calcularMetricasPeriodo,
  calcularPeriodoAnterior,
  generarConclusiones,
  type AcopioRow,
  type BaseCapacidad,
  type Conclusion,
  type MetricasPeriodo,
  type MovimientoRow,
  type VentaRow,
} from '@/lib/informe';

export interface InformeGerencial {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo | null;
  conclusiones: Conclusion[];
  rangoAnterior: { inicio: string; fin: string };
}

interface DatosCrudos {
  actual: { ventas: VentaRow[]; acopios: AcopioRow[]; movimientos: MovimientoRow[] };
  anterior: { ventas: VentaRow[]; acopios: AcopioRow[]; movimientos: MovimientoRow[] };
}

/**
 * Los tipos generados de Supabase están desactualizados y colapsan a `never`
 * para varias columnas reales, así que la consulta se normaliza a la forma que
 * espera `traerTodo`.
 */
type ConsultaPaginada<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

const COLUMNAS_VENTAS =
  'fecha, silice, placa, cantidad_m3, valor_total, fuente, tipo_transaccion, nombre_cliente, nit_cliente, descuenta_anticipo';
const COLUMNAS_ACOPIOS = 'fecha, silice, fuente, placa, cantidad_viajes';
const COLUMNAS_MOVIMIENTOS =
  'fecha, mina, silice, placa, origen, destino, cantidad_movimientos';

const traerPeriodo = async (
  inicio: string,
  fin: string,
  filtros: DashboardFiltros
): Promise<DatosCrudos['actual']> => {
  const [ventas, acopios, movimientos] = await Promise.all([
    traerTodo<VentaRow>((desde, hasta) => {
      let q = supabase
        .from('ventas')
        .select(COLUMNAS_VENTAS)
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (filtros.tipoSilice !== 'todos') q = q.eq('silice', filtros.tipoSilice);
      if (filtros.tipoTransaccion !== 'todos') q = q.eq('tipo_transaccion', filtros.tipoTransaccion);
      if (filtros.fuente !== 'todos') q = q.eq('fuente', filtros.fuente);
      return q.order('fecha', { ascending: true }).order('id', { ascending: true }).range(desde, hasta) as unknown as ConsultaPaginada<VentaRow>;
    }),
    traerTodo<AcopioRow>((desde, hasta) => {
      let q = supabase
        .from('acopios')
        .select(COLUMNAS_ACOPIOS)
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (filtros.tipoSilice !== 'todos') q = q.eq('silice', filtros.tipoSilice);
      return q.order('fecha', { ascending: true }).order('id', { ascending: true }).range(desde, hasta) as unknown as ConsultaPaginada<AcopioRow>;
    }),
    traerTodo<MovimientoRow>((desde, hasta) => {
      let q = supabase
        .from('movimientos')
        .select(COLUMNAS_MOVIMIENTOS)
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (filtros.tipoSilice !== 'todos') q = q.eq('silice', filtros.tipoSilice);
      return q.order('fecha', { ascending: true }).order('id', { ascending: true }).range(desde, hasta) as unknown as ConsultaPaginada<MovimientoRow>;
    }),
  ]);

  return { ventas, acopios, movimientos };
};

/**
 * Datos del Informe de Gestión: métricas del período seleccionado, las del
 * período inmediatamente anterior de igual duración, y las conclusiones.
 *
 * Reutiliza `useOptimoDiario` (una vez por período) para no duplicar la lógica
 * del simulador, y pagina todas las consultas para no truncarse en 1.000 filas.
 */
export const useInformeGerencial = (
  filtros: DashboardFiltros,
  baseCapacidad: BaseCapacidad = 'habiles'
) => {
  const rangoAnterior = useMemo(
    () => calcularPeriodoAnterior(filtros.fechaInicio, filtros.fechaFin),
    [filtros.fechaInicio, filtros.fechaFin]
  );

  const datos = useQuery({
    queryKey: ['informe-gerencial-datos', filtros, rangoAnterior],
    queryFn: async (): Promise<DatosCrudos> => {
      const [actual, anterior] = await Promise.all([
        traerPeriodo(filtros.fechaInicio, filtros.fechaFin, filtros),
        traerPeriodo(rangoAnterior.inicio, rangoAnterior.fin, filtros),
      ]);
      return { actual, anterior };
    },
    staleTime: 15000,
  });

  const optimoActual = useOptimoDiario({
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    tipoSilice: filtros.tipoSilice,
  });

  const optimoAnterior = useOptimoDiario({
    fechaInicio: rangoAnterior.inicio,
    fechaFin: rangoAnterior.fin,
    tipoSilice: filtros.tipoSilice,
  });

  const isLoading = datos.isLoading || optimoActual.isLoading || optimoAnterior.isLoading;

  const data = useMemo<InformeGerencial | undefined>(() => {
    if (!datos.data) return undefined;

    const actual = calcularMetricasPeriodo(
      filtros.fechaInicio,
      filtros.fechaFin,
      datos.data.actual.ventas,
      datos.data.actual.acopios,
      datos.data.actual.movimientos,
      optimoActual.data ?? new Map(),
      baseCapacidad
    );

    const anterior = calcularMetricasPeriodo(
      rangoAnterior.inicio,
      rangoAnterior.fin,
      datos.data.anterior.ventas,
      datos.data.anterior.acopios,
      datos.data.anterior.movimientos,
      optimoAnterior.data ?? new Map(),
      baseCapacidad
    );

    return {
      actual,
      anterior,
      conclusiones: generarConclusiones(actual, anterior),
      rangoAnterior,
    };
  }, [
    datos.data,
    optimoActual.data,
    optimoAnterior.data,
    filtros.fechaInicio,
    filtros.fechaFin,
    rangoAnterior,
    baseCapacidad,
  ]);

  return { data, isLoading, error: datos.error };
};
