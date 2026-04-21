import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento } from '@/lib/volquetas';

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
      // Ventas del período filtrado
      let ventasQuery = supabase
        .from('ventas')
        .select('valor_total, cantidad_m3, silice')
        .gte('fecha', inicio)
        .lte('fecha', fin);

      if (tipoSilice !== 'todos') {
        ventasQuery = ventasQuery.eq('silice', tipoSilice);
      }

      const { data: ventasMes, error: errorVentas } = await ventasQuery;
      if (errorVentas) console.error('Error fetching ventas:', errorVentas);

      // Movimientos internos filtrados
      let movQuery = supabase
        .from('movimientos')
        .select('placa, silice, origen, destino, cantidad_movimientos')
        .gte('fecha', inicio)
        .lte('fecha', fin);

      if (tipoSilice !== 'todos') {
        movQuery = movQuery.eq('silice', tipoSilice);
      }

      const { data: movimientosData, error: errorMov } = await movQuery;
      if (errorMov) console.error('Error fetching movimientos:', errorMov);

      // Acopios (no filtrados por sílice ya que no tienen ese campo)
      const { data: acopiosData, error: errorAcopios } = await supabase
        .from('acopios')
        .select('cantidad_viajes')
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (errorAcopios) console.error('Error fetching acopios:', errorAcopios);

      // Ventas recientes (respetando filtro sílice)
      let recientesQuery = supabase
        .from('ventas')
        .select('id, fecha, placa, valor_total, silice, cantidad_m3')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tipoSilice !== 'todos') {
        recientesQuery = recientesQuery.eq('silice', tipoSilice);
      }

      const { data: ventasRecientes, error: errorRecientes } = await recientesQuery;
      if (errorRecientes) console.error('Error fetching ventas recientes:', errorRecientes);

      // Calcular totales de ventas
      const totalVentasMes = ventasMes?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;
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
