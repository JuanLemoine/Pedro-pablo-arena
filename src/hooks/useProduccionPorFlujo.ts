import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento } from '@/lib/volquetas';

export interface FiltrosProduccion {
  silice?: string;
  origen?: string;
  destino?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ProduccionPorFlujo {
  silice: string;
  siliceResultante: string;
  origen: string;
  destino: string;
  viajes: number;
  m3Producidos: number;
}

export interface MovimientoDetallado {
  id: string;
  fecha: string;
  mina: string;
  silice: string;
  siliceResultante: string;
  placa: string;
  origen: string;
  destino: string;
  m3Producidos: number;
}

export interface VentaDetallada {
  id: string;
  fecha: string;
  placa: string;
  silice: string;
  cantidad_m3: number;
  cantidad_m3_con_yapa: number;
  valor_total: number;
}

interface ProduccionData {
  produccionPorFlujo: ProduccionPorFlujo[];
  movimientosDetallados: MovimientoDetallado[];
  ventasDetalladas: VentaDetallada[];
  totales: {
    viajes: number;
    m3Producidos: number;
    m3Vendidos: number;
    valorVentas: number;
  };
}

export const useProduccionPorFlujo = (filtros: FiltrosProduccion) => {
  return useQuery({
    queryKey: ['produccion-por-flujo', filtros],
    queryFn: async (): Promise<ProduccionData> => {
      // Obtener movimientos con filtros
      let movQuery = supabase
        .from('movimientos')
        .select('id, fecha, mina, silice, placa, origen, destino')
        .order('fecha', { ascending: false });

      if (filtros.fechaInicio) {
        movQuery = movQuery.gte('fecha', filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        movQuery = movQuery.lte('fecha', filtros.fechaFin);
      }
      if (filtros.silice) {
        movQuery = movQuery.eq('silice', filtros.silice);
      }
      if (filtros.origen) {
        movQuery = movQuery.eq('origen', filtros.origen);
      }
      if (filtros.destino) {
        movQuery = movQuery.eq('destino', filtros.destino);
      }

      const { data: movimientos, error: errorMov } = await movQuery;

      if (errorMov) {
        console.error('Error fetching movimientos:', errorMov);
        throw errorMov;
      }

      // Obtener ventas con filtros
      let ventasQuery = supabase
        .from('ventas')
        .select('id, fecha, placa, silice, cantidad_m3, valor_total')
        .order('fecha', { ascending: false });

      if (filtros.fechaInicio) {
        ventasQuery = ventasQuery.gte('fecha', filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        ventasQuery = ventasQuery.lte('fecha', filtros.fechaFin);
      }
      if (filtros.silice) {
        ventasQuery = ventasQuery.eq('silice', filtros.silice);
      }

      const { data: ventas, error: errorVentas } = await ventasQuery;

      if (errorVentas) {
        console.error('Error fetching ventas:', errorVentas);
        throw errorVentas;
      }

      // Agrupar producción por flujo (silice + origen + destino)
      const flujoMap = new Map<string, ProduccionPorFlujo>();

      const movimientosDetallados: MovimientoDetallado[] = [];

      movimientos?.forEach(mov => {
        const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
        
        // Agregar a detallados
        movimientosDetallados.push({
          id: mov.id,
          fecha: mov.fecha,
          mina: mov.mina,
          silice: mov.silice,
          siliceResultante: resultado.siliceResultante,
          placa: mov.placa,
          origen: mov.origen,
          destino: mov.destino,
          m3Producidos: resultado.m3Producidos,
        });

        // Agrupar por flujo
        const key = `${mov.silice}|${mov.origen}|${mov.destino}`;
        const existing = flujoMap.get(key);

        if (existing) {
          existing.viajes += 1;
          existing.m3Producidos += resultado.m3Producidos;
        } else {
          flujoMap.set(key, {
            silice: mov.silice,
            siliceResultante: resultado.siliceResultante,
            origen: mov.origen,
            destino: mov.destino,
            viajes: 1,
            m3Producidos: resultado.m3Producidos,
          });
        }
      });

      // Procesar ventas
      const ventasDetalladas: VentaDetallada[] = ventas?.map(v => ({
        id: v.id,
        fecha: v.fecha,
        placa: v.placa,
        silice: v.silice,
        cantidad_m3: Number(v.cantidad_m3),
        cantidad_m3_con_yapa: Number(v.cantidad_m3) + 1, // +1 por la yapa
        valor_total: Number(v.valor_total),
      })) || [];

      // Calcular totales
      const produccionPorFlujo = Array.from(flujoMap.values()).sort((a, b) => b.m3Producidos - a.m3Producidos);
      
      const totales = {
        viajes: produccionPorFlujo.reduce((sum, f) => sum + f.viajes, 0),
        m3Producidos: produccionPorFlujo.reduce((sum, f) => sum + f.m3Producidos, 0),
        m3Vendidos: ventasDetalladas.reduce((sum, v) => sum + v.cantidad_m3_con_yapa, 0),
        valorVentas: ventasDetalladas.reduce((sum, v) => sum + v.valor_total, 0),
      };

      return {
        produccionPorFlujo,
        movimientosDetallados,
        ventasDetalladas,
        totales,
      };
    },
    refetchInterval: 15000,
  });
};
