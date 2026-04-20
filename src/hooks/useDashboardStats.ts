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

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      // Ventas del mes actual (valor y m³)
      const { data: ventasMes, error: errorVentas } = await supabase
        .from('ventas')
        .select('valor_total, cantidad_m3')
        .gte('fecha', firstDayOfMonth)
        .lte('fecha', today);

      if (errorVentas) {
        console.error('Error fetching ventas:', errorVentas);
      }

      // Movimientos internos con placa, silice, origen, destino y cantidad_movimientos para calcular m³ producidos
      // El cálculo depende de la combinación sílice/origen/destino y se multiplica por cantidad_movimientos
      const { data: movimientosData, error: errorMov } = await supabase
        .from('movimientos')
        .select('placa, silice, origen, destino, cantidad_movimientos');

      if (errorMov) {
        console.error('Error fetching movimientos:', errorMov);
      }

      // Acopios para estadísticas
      const { data: acopiosData, error: errorAcopios } = await supabase
        .from('acopios')
        .select('cantidad_viajes');

      if (errorAcopios) {
        console.error('Error fetching acopios:', errorAcopios);
      }

      // Ventas recientes
      const { data: ventasRecientes, error: errorRecientes } = await supabase
        .from('ventas')
        .select('id, fecha, placa, valor_total, silice, cantidad_m3')
        .order('created_at', { ascending: false })
        .limit(5);

      if (errorRecientes) {
        console.error('Error fetching ventas recientes:', errorRecientes);
      }

      // Calcular totales de ventas
      const totalVentasMes = ventasMes?.reduce((sum, v) => sum + Number(v.valor_total), 0) || 0;
      // Por cada venta se suma 1 m³ adicional (yapa que se regala al comprador)
      const m3Vendidos = ventasMes?.reduce((sum, v) => sum + Number(v.cantidad_m3) + 1, 0) || 0;
      
      // Calcular m³ producidos y m³ granzón basándose en los MOVIMIENTOS INTERNOS
      // El cálculo depende de la combinación sílice/origen/destino, multiplicado por cantidad_movimientos
      let m3Producidos = 0;
      let m3Granzon = 0; // Se calculará cuando existan movimientos de tipo Granzón

      movimientosData?.forEach(mov => {
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        m3Producidos += resultado.m3Producidos * mov.cantidad_movimientos;
        if (resultado.tipoPF === 'Granzón') {
          m3Granzon += resultado.m3Producidos * mov.cantidad_movimientos;
        }
      });

      // Total de movimientos
      const totalMovimientos = movimientosData?.length || 0;
      
      // Total de viajes de acopio
      const totalViajes = acopiosData?.reduce((sum, a) => sum + a.cantidad_viajes, 0) || 0;

      return {
        ventasMes: totalVentasMes,
        m3Vendidos,
        m3Producidos,
        m3Granzon,
        totalMovimientos,
        totalAcopios: acopiosData?.length || 0,
        totalViajes,
        ventasRecientes: ventasRecientes || []
      };
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
};
