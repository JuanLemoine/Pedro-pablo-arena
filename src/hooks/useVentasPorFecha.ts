import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';

export type AgrupacionVentas = 'dia' | 'semana' | 'mes';

export interface PuntoVentas {
  clave: string;
  etiqueta: string;
  /** m³ facturados: la suma de `cantidad_m3` de las ventas del tramo. */
  m3: number;
  /**
   * Valor cobrado. Deja por fuera los consumos de anticipo, que no son ingreso
   * nuevo: ese dinero ya entró cuando se registró el anticipo.
   */
  valor: number;
  /** Lo que se consumió de anticipo en el tramo, para poder mostrarlo aparte. */
  valorAnticipo: number;
  ventas: number;
}

interface VentaRow {
  fecha: string;
  silice: string;
  cantidad_m3: number;
  valor_total: number;
  fuente: string | null;
  tipo_transaccion: string | null;
  descuenta_anticipo: boolean | null;
}

type Consulta<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

const claveTramo = (fecha: string, agrupacion: AgrupacionVentas): string => {
  if (agrupacion === 'mes') return fecha.slice(0, 7);
  if (agrupacion === 'semana')
    return format(startOfWeek(parseISO(fecha), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return fecha;
};

const etiquetaTramo = (clave: string, agrupacion: AgrupacionVentas): string => {
  if (agrupacion === 'mes') return format(parseISO(`${clave}-01`), 'MMM yy', { locale: es });
  if (agrupacion === 'semana') return format(parseISO(clave), "d 'de' MMM", { locale: es });
  return format(parseISO(clave), 'd MMM', { locale: es });
};

/**
 * Ventas por fecha en m³ y en pesos. Respeta los mismos filtros del dashboard
 * y se pagina, porque un mes de operación supera las 1.000 filas por petición.
 */
export const useVentasPorFecha = (filtros: DashboardFiltros, agrupacion: AgrupacionVentas) => {
  const { fechaInicio, fechaFin, tipoSilice, tipoTransaccion, fuente } = filtros;

  const consulta = useQuery({
    queryKey: ['ventas-por-fecha', fechaInicio, fechaFin, tipoSilice, tipoTransaccion, fuente],
    queryFn: async (): Promise<VentaRow[]> =>
      traerTodo<VentaRow>((desde, hasta) => {
        let q = supabase
          .from('ventas')
          .select('fecha, silice, cantidad_m3, valor_total, fuente, tipo_transaccion, descuenta_anticipo')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin);
        if (tipoSilice !== 'todos') q = q.eq('silice', tipoSilice);
        if (tipoTransaccion !== 'todos') q = q.eq('tipo_transaccion', tipoTransaccion);
        if (fuente !== 'todos') q = q.eq('fuente', fuente);
        return q.order('id', { ascending: true }).range(desde, hasta) as unknown as Consulta<VentaRow>;
      }),
    staleTime: 30000,
  });

  const tramos = new Map<string, PuntoVentas>();
  consulta.data?.forEach(v => {
    const clave = claveTramo(v.fecha, agrupacion);
    const p = tramos.get(clave) ?? {
      clave,
      etiqueta: etiquetaTramo(clave, agrupacion),
      m3: 0,
      valor: 0,
      valorAnticipo: 0,
      ventas: 0,
    };
    const valor = Number(v.valor_total) || 0;
    p.m3 += Number(v.cantidad_m3) || 0;
    p.ventas += 1;
    if (v.descuenta_anticipo) p.valorAnticipo += valor;
    else p.valor += valor;
    tramos.set(clave, p);
  });

  const r = (n: number) => Math.round(n * 100) / 100;
  const puntos = Array.from(tramos.values())
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map(p => ({ ...p, m3: r(p.m3), valor: Math.round(p.valor), valorAnticipo: Math.round(p.valorAnticipo) }));

  return {
    puntos,
    totalM3: r(puntos.reduce((s, p) => s + p.m3, 0)),
    totalValor: puntos.reduce((s, p) => s + p.valor, 0),
    totalAnticipo: puntos.reduce((s, p) => s + p.valorAnticipo, 0),
    totalVentas: puntos.reduce((s, p) => s + p.ventas, 0),
    isLoading: consulta.isLoading,
    error: consulta.error,
  };
};
