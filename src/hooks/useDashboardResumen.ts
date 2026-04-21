import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calcularM3PorMovimiento, getCapacidadVolqueta } from '@/lib/volquetas';

export interface DashboardFiltros {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice: string;
  tipoTransaccion: string;
}

export interface ResumenVentas {
  totalRegistros: number;
  totalM3: number;
  totalValor: number;
  porTipo: { tipo: string; registros: number; valor: number }[];
  porSilice: { silice: string; registros: number; m3: number }[];
}

export const PRECIO_M3: Record<string, number> = {
  'Silice B - Pozo': 85000,
  'Silice A - Peña': 75000,
};

export interface ResumenAcopio {
  totalRegistros: number;
  totalViajes: number;
  totalM3: number;
  totalValor: number;
  porSilice: { silice: string; viajes: number; m3: number; valor: number }[];
  porFuente: { fuente: string; viajes: number }[];
}

export interface ResumenMovimientos {
  totalRegistros: number;
  totalMovimientos: number;
  totalM3Producidos: number;
}

export interface DashboardResumen {
  ventas: ResumenVentas;
  acopio: ResumenAcopio;
  movimientos: ResumenMovimientos;
  totalCombinado: number; // ventas.totalValor + acopio.totalValor
}

export const useDashboardResumen = (filtros: DashboardFiltros) => {
  return useQuery({
    queryKey: ['dashboard-resumen', filtros],
    queryFn: async (): Promise<DashboardResumen> => {
      // ── Ventas ──────────────────────────────────────────────────
      let ventasQ = supabase
        .from('ventas')
        .select('cantidad_m3, valor_total, silice, tipo_transaccion')
        .gte('fecha', filtros.fechaInicio)
        .lte('fecha', filtros.fechaFin);
      if (filtros.tipoSilice !== 'todos') ventasQ = ventasQ.eq('silice', filtros.tipoSilice);
      if (filtros.tipoTransaccion !== 'todos') ventasQ = ventasQ.eq('tipo_transaccion', filtros.tipoTransaccion);
      const { data: ventasData } = await ventasQ;

      const ventasPorTipoMap = new Map<string, { registros: number; valor: number }>();
      const ventasPorSiliceMap = new Map<string, { registros: number; m3: number }>();
      let totalM3Ventas = 0;
      let totalValorVentas = 0;

      ventasData?.forEach(v => {
        const tipo = (v as any).tipo_transaccion || 'Venta';
        const sil = v.silice;
        const m3 = Number(v.cantidad_m3);
        const val = Number(v.valor_total);
        totalM3Ventas += m3;
        totalValorVentas += val;

        const pt = ventasPorTipoMap.get(tipo) || { registros: 0, valor: 0 };
        ventasPorTipoMap.set(tipo, { registros: pt.registros + 1, valor: pt.valor + val });

        const ps = ventasPorSiliceMap.get(sil) || { registros: 0, m3: 0 };
        ventasPorSiliceMap.set(sil, { registros: ps.registros + 1, m3: ps.m3 + m3 });
      });

      const ventas: ResumenVentas = {
        totalRegistros: ventasData?.length || 0,
        totalM3: Math.round(totalM3Ventas * 100) / 100,
        totalValor: Math.round(totalValorVentas),
        porTipo: Array.from(ventasPorTipoMap.entries()).map(([tipo, d]) => ({ tipo, ...d })),
        porSilice: Array.from(ventasPorSiliceMap.entries()).map(([silice, d]) => ({ silice, ...d })),
      };

      // ── Acopio ──────────────────────────────────────────────────
      let acopioQ = supabase
        .from('acopios')
        .select('cantidad_viajes, silice, fuente, placa')
        .gte('fecha', filtros.fechaInicio)
        .lte('fecha', filtros.fechaFin);
      if (filtros.tipoSilice !== 'todos') acopioQ = acopioQ.eq('silice', filtros.tipoSilice);
      const { data: acopioData } = await acopioQ;

      const acopioPorSiliceMap = new Map<string, { viajes: number; m3: number }>();
      const acopioPorFuenteMap = new Map<string, { viajes: number }>();
      let totalViajesAcopio = 0;
      let totalM3Acopio = 0;
      let totalValorAcopio = 0;

      acopioData?.forEach(a => {
        const viajes = a.cantidad_viajes;
        const capacidad = getCapacidadVolqueta(a.placa);
        const m3 = capacidad * viajes;
        const precio = PRECIO_M3[a.silice] ?? 0;
        const valor = m3 * precio;
        totalViajesAcopio += viajes;
        totalM3Acopio += m3;
        totalValorAcopio += valor;

        const ps = acopioPorSiliceMap.get(a.silice) || { viajes: 0, m3: 0, valor: 0 };
        acopioPorSiliceMap.set(a.silice, { viajes: ps.viajes + viajes, m3: ps.m3 + m3, valor: ps.valor + valor });

        const pf = acopioPorFuenteMap.get(a.fuente) || { viajes: 0 };
        acopioPorFuenteMap.set(a.fuente, { viajes: pf.viajes + viajes });
      });

      const acopio: ResumenAcopio = {
        totalRegistros: acopioData?.length || 0,
        totalViajes: totalViajesAcopio,
        totalM3: Math.round(totalM3Acopio * 100) / 100,
        totalValor: Math.round(totalValorAcopio),
        porSilice: Array.from(acopioPorSiliceMap.entries()).map(([silice, d]) => ({ silice, ...d })),
        porFuente: Array.from(acopioPorFuenteMap.entries()).map(([fuente, d]) => ({ fuente, ...d })),
      };

      // ── Movimientos ─────────────────────────────────────────────
      let movQ = supabase
        .from('movimientos')
        .select('placa, silice, origen, destino, cantidad_movimientos')
        .gte('fecha', filtros.fechaInicio)
        .lte('fecha', filtros.fechaFin);
      if (filtros.tipoSilice !== 'todos') movQ = movQ.eq('silice', filtros.tipoSilice);
      const { data: movData } = await movQ;

      let totalMovimientosCant = 0;
      let totalM3Mov = 0;
      movData?.forEach(m => {
        const r = calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino);
        totalMovimientosCant += m.cantidad_movimientos;
        totalM3Mov += r.m3Producidos * m.cantidad_movimientos;
      });

      const movimientos: ResumenMovimientos = {
        totalRegistros: movData?.length || 0,
        totalMovimientos: totalMovimientosCant,
        totalM3Producidos: Math.round(totalM3Mov * 100) / 100,
      };

      return { ventas, acopio, movimientos, totalCombinado: Math.round(ventas.totalValor + acopio.totalValor) };
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
