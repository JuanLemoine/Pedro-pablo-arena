import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';

export interface VentaDetalle {
  fecha: string;
  placa: string;
  nombre_cliente: string | null;
  nit_cliente: string | null;
  silice: string;
  cantidad_m3: number;
  valor_total: number;
  tipo_transaccion: string | null;
  fuente: string | null;
  descuenta_anticipo: boolean | null;
}

type Consulta<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Las ventas del período, fila por fila, para poder agruparlas en pantalla por
 * placa, por cliente o por fecha sin volver a consultar. Se pagina porque un
 * mes de operación supera las 1.000 filas que devuelve Supabase por petición.
 */
export const useVentasDetalle = (filtros: DashboardFiltros) => {
  const { fechaInicio, fechaFin, tipoSilice, tipoTransaccion, fuente } = filtros;

  return useQuery({
    queryKey: ['ventas-detalle', fechaInicio, fechaFin, tipoSilice, tipoTransaccion, fuente],
    queryFn: async (): Promise<VentaDetalle[]> =>
      traerTodo<VentaDetalle>((desde, hasta) => {
        let q = supabase
          .from('ventas')
          .select(
            'fecha, placa, nombre_cliente, nit_cliente, silice, cantidad_m3, valor_total, tipo_transaccion, fuente, descuenta_anticipo'
          )
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin);
        if (tipoSilice !== 'todos') q = q.eq('silice', tipoSilice);
        if (tipoTransaccion !== 'todos') q = q.eq('tipo_transaccion', tipoTransaccion);
        if (fuente !== 'todos') q = q.eq('fuente', fuente);
        return q.order('fecha', { ascending: false }).range(desde, hasta) as unknown as Consulta<VentaDetalle>;
      }),
    staleTime: 30000,
  });
};
