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
  totalM3Vendidos: number;   // suma de cantidad_m3 del recibo
  totalM3Entregados: number; // totalM3Vendidos + 1 por cada venta (m³ de yapa)
  totalValor: number;
  porTipo: { tipo: string; registros: number; valor: number }[];
  porSilice: { silice: string; registros: number; m3Vendidos: number; m3Entregados: number }[];
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

export interface ResumenCliente {
  nombre: string;         // nombre_cliente o placa si no tiene nombre
  placa: string;
  tieneNombre: boolean;
  totalCompras: number;
  m3Facturados: number;
  m3Entregados: number;
  valorTotal: number;
  ultimaCompra: string;
  silices: string[];
  tiposTransaccion: string[];
}

export interface DashboardResumen {
  ventas: ResumenVentas;
  acopio: ResumenAcopio;
  movimientos: ResumenMovimientos;
  clientes: ResumenCliente[];
  totalCombinado: number;
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
      const ventasPorSiliceMap = new Map<string, { registros: number; m3Vendidos: number; m3Entregados: number }>();
      let totalM3Vendidos = 0;
      let totalValorVentas = 0;
      const totalRegistrosVentas = ventasData?.length || 0;

      ventasData?.forEach(v => {
        const tipo = (v as any).tipo_transaccion || 'Venta';
        const sil = v.silice;
        const m3 = Number(v.cantidad_m3);
        const val = Number(v.valor_total);
        totalM3Vendidos += m3;
        totalValorVentas += val;

        const pt = ventasPorTipoMap.get(tipo) || { registros: 0, valor: 0 };
        ventasPorTipoMap.set(tipo, { registros: pt.registros + 1, valor: pt.valor + val });

        const ps = ventasPorSiliceMap.get(sil) || { registros: 0, m3Vendidos: 0, m3Entregados: 0 };
        ventasPorSiliceMap.set(sil, {
          registros: ps.registros + 1,
          m3Vendidos: ps.m3Vendidos + m3,
          m3Entregados: ps.m3Entregados + m3 + 1, // +1 yapa por venta
        });
      });

      const ventas: ResumenVentas = {
        totalRegistros: totalRegistrosVentas,
        totalM3Vendidos: Math.round(totalM3Vendidos * 100) / 100,
        totalM3Entregados: Math.round((totalM3Vendidos + totalRegistrosVentas) * 100) / 100,
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

      // ── Clientes ────────────────────────────────────────────────
      let clientesQ = supabase
        .from('ventas')
        .select('placa, nombre_cliente, cantidad_m3, valor_total, silice, tipo_transaccion, fecha')
        .gte('fecha', filtros.fechaInicio)
        .lte('fecha', filtros.fechaFin);
      if (filtros.tipoSilice !== 'todos') clientesQ = clientesQ.eq('silice', filtros.tipoSilice);
      if (filtros.tipoTransaccion !== 'todos') clientesQ = clientesQ.eq('tipo_transaccion', filtros.tipoTransaccion);
      const { data: clientesData } = await clientesQ;

      // Agrupar por placa (identificador único del cliente)
      const clienteMap = new Map<string, ResumenCliente>();
      clientesData?.forEach(v => {
        const placa = v.placa;
        const nombre = (v as any).nombre_cliente as string | null;
        const m3 = Number(v.cantidad_m3);
        const val = Number(v.valor_total);
        const tipo = (v as any).tipo_transaccion || 'Venta';

        const prev = clienteMap.get(placa) || {
          nombre: nombre || placa,
          placa,
          tieneNombre: !!nombre,
          totalCompras: 0,
          m3Facturados: 0,
          m3Entregados: 0,
          valorTotal: 0,
          ultimaCompra: v.fecha,
          silices: [] as string[],
          tiposTransaccion: [] as string[],
        };

        // Si en alguna fila tiene nombre, lo actualizamos
        if (nombre && !prev.tieneNombre) { prev.nombre = nombre; prev.tieneNombre = true; }

        prev.totalCompras += 1;
        prev.m3Facturados += m3;
        prev.m3Entregados += m3 + 1;
        prev.valorTotal += val;
        if (v.fecha > prev.ultimaCompra) prev.ultimaCompra = v.fecha;
        if (!prev.silices.includes(v.silice)) prev.silices.push(v.silice);
        if (!prev.tiposTransaccion.includes(tipo)) prev.tiposTransaccion.push(tipo);

        clienteMap.set(placa, prev);
      });

      // Ordenar por valor total descendente
      const clientes = Array.from(clienteMap.values())
        .map(c => ({
          ...c,
          m3Facturados: Math.round(c.m3Facturados * 100) / 100,
          m3Entregados: Math.round(c.m3Entregados * 100) / 100,
          valorTotal: Math.round(c.valorTotal),
        }))
        .sort((a, b) => b.valorTotal - a.valorTotal);

      return { ventas, acopio, movimientos, clientes, totalCombinado: Math.round(ventas.totalValor + acopio.totalValor) };
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
