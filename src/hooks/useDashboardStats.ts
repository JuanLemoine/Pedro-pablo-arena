import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import { calcularM3PorMovimiento } from '@/lib/volquetas';

/**
 * Los tipos generados de Supabase están desactualizados y colapsan a `never`
 * para varias columnas reales, así que la consulta se normaliza a la forma que
 * espera `traerTodo`.
 */
type ConsultaPaginada<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

interface VentaStats {
  valor_total: number;
  cantidad_m3: number;
  silice: string;
  descuenta_anticipo: boolean | null;
}

interface MovimientoStats {
  placa: string;
  silice: string;
  origen: string;
  destino: string;
  cantidad_movimientos: number;
}

interface AcopioStats {
  cantidad_viajes: number;
}

interface DashboardStats {
  ventasMes: number;
  m3Vendidos: number;
  m3Producidos: number;
  m3Granzon: number;
  totalMovimientos: number;
  totalAcopios: number;
  totalViajes: number;
  ventasRecientes: Array<{
    id: string;
    fecha: string;
    placa: string;
    valor_total: number;
    silice: string;
    cantidad_m3: number;
  }>;
}

export interface DashboardFiltros {
  fechaInicio?: string;
  fechaFin?: string;
  tipoSilice?: string;
}

export const useDashboardStats = (filtros?: DashboardFiltros) => {
  const now = new Date();
  const defaultInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = now.toISOString().split('T')[0];

  const inicio = filtros?.fechaInicio || defaultInicio;
  const fin = filtros?.fechaFin || defaultFin;
  const tipoSilice = filtros?.tipoSilice || 'todos';

  return useQuery({
    queryKey: ['dashboard-stats', inicio, fin, tipoSilice],
    queryFn: async (): Promise<DashboardStats> => {
      // Ventas del período filtrado. Se pagina porque un mes de operación
      // supera las 1.000 filas que devuelve Supabase por petición.
      const ventasMes = await traerTodo<VentaStats>((desde, hasta) => {
        let q = supabase
          .from('ventas')
          .select('valor_total, cantidad_m3, silice, descuenta_anticipo')
          .gte('fecha', inicio)
          .lte('fecha', fin);
        if (tipoSilice !== 'todos') q = q.eq('silice', tipoSilice);
        return q.order('id', { ascending: true }).range(desde, hasta) as unknown as ConsultaPaginada<VentaStats>;
      });

      // Movimientos internos filtrados
      const movimientosData = await traerTodo<MovimientoStats>((desde, hasta) => {
        let q = supabase
          .from('movimientos')
          .select('placa, silice, origen, destino, cantidad_movimientos')
          .gte('fecha', inicio)
          .lte('fecha', fin);
        if (tipoSilice !== 'todos') q = q.eq('silice', tipoSilice);
        return q.order('id', { ascending: true }).range(desde, hasta) as unknown as ConsultaPaginada<MovimientoStats>;
      });

      // Acopios (no filtrados por sílice ya que no tienen ese campo)
      const acopiosData = await traerTodo<AcopioStats>((desde, hasta) =>
        supabase
          .from('acopios')
          .select('cantidad_viajes')
          .gte('fecha', inicio)
          .lte('fecha', fin)
          .order('id', { ascending: true })
          .range(desde, hasta) as unknown as ConsultaPaginada<AcopioStats>
      );

      // Ventas recientes (respetando filtro sílice)
      let recientesQuery = supabase
        .from('ventas')
        .select('id, fecha, placa, valor_total, silice, cantidad_m3')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        // Mismo orden cronológico que el historial de Ventas
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(5);

      if (tipoSilice !== 'todos') {
        recientesQuery = recientesQuery.eq('silice', tipoSilice);
      }

      const { data: ventasRecientes, error: errorRecientes } = await recientesQuery;
      if (errorRecientes) console.error('Error fetching ventas recientes:', errorRecientes);

      // Excluir ventas marcadas como consumo de anticipo (no son ingresos nuevos)
      const totalVentasMes = ventasMes.reduce(
        (sum, v) => sum + (v.descuenta_anticipo ? 0 : Number(v.valor_total)),
        0
      );
      const m3Vendidos = ventasMes?.reduce((sum, v) => sum + Number(v.cantidad_m3) + 1, 0) || 0;

      // Calcular m³ producidos y m³ granzón
      let m3Producidos = 0;
      let m3Granzon = 0;

      movimientosData?.forEach(mov => {
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        m3Producidos += resultado.m3Producidos * mov.cantidad_movimientos;
        if (resultado.tipoPF === 'Granzón') {
          m3Granzon += resultado.m3Producidos * mov.cantidad_movimientos;
        }
      });

      const totalMovimientos = movimientosData?.length || 0;
      const totalViajes = acopiosData?.reduce((sum, a) => sum + a.cantidad_viajes, 0) || 0;

      return {
        ventasMes: totalVentasMes,
        m3Vendidos,
        m3Producidos,
        m3Granzon,
        totalMovimientos,
        totalAcopios: acopiosData?.length || 0,
        totalViajes,
        ventasRecientes: ventasRecientes || [],
      };
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
};
