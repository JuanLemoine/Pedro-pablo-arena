import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import { useOptimoDiario } from '@/hooks/useOptimoDiario';
import {
  calcularM3PorMovimiento,
  esDestinoAlmacenamiento,
  getCapacidadVolqueta,
} from '@/lib/volquetas';
import { RENDIMIENTO_PRODUCTO_F1, RENDIMIENTO_PRODUCTO_F2, type BaseCapacidad } from '@/lib/informe';
import { porcentaje } from '@/lib/formato';

export type Agrupacion = 'dia' | 'semana' | 'mes';
export type AmbitoSerie = 'todos' | 'Silice A - Peña' | 'Silice B - Pozo';

export interface PuntoSerie {
  clave: string;
  etiqueta: string;
  productoF1: number;
  productoF2: number;
  productoTotal: number;
  capacidadF1: number;
  capacidadF2: number;
  capacidadTotal: number;
  /** Producto final entregado = ventas (con yapa) + acopio. */
  entregado: number;
  entregadoVentas: number;
  entregadoAcopio: number;
  cumplimientoF1: number;
  cumplimientoF2: number;
  /** Sin movimientos registrados en el tramo: el 0 % puede ser falta de registro. */
  sinRegistros: boolean;
}

interface MovRow {
  fecha: string;
  silice: string;
  placa: string;
  mina: string | null;
  origen: string;
  destino: string;
  cantidad_movimientos: number;
}
interface VentaRow { fecha: string; silice: string; cantidad_m3: number; fuente: string | null; tipo_transaccion: string | null }
interface AcopioRow { fecha: string; silice: string; placa: string; cantidad_viajes: number }

type Consulta<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export interface FiltrosSerie {
  inicio: string;
  fin: string;
  ambito: AmbitoSerie;
  agrupacion: Agrupacion;
  /** Filtra la producción por mina. La capacidad NO se filtra: es por ruta. */
  mina?: string;
  baseCapacidad: BaseCapacidad;
}

const claveTramo = (fecha: string, agrupacion: Agrupacion): string => {
  if (agrupacion === 'mes') return fecha.slice(0, 7);
  if (agrupacion === 'semana')
    return format(startOfWeek(parseISO(fecha), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return fecha;
};

const etiquetaTramo = (clave: string, agrupacion: Agrupacion): string => {
  if (agrupacion === 'mes') return format(parseISO(`${clave}-01`), 'MMM yy', { locale: es });
  if (agrupacion === 'semana') return format(parseISO(clave), "d 'de' MMM", { locale: es });
  return format(parseISO(clave), 'd MMM', { locale: es });
};

/**
 * Serie de producción contra capacidad para un rango arbitrario, agrupable por
 * día, semana o mes, y filtrable por frente y por mina. Todo en m³ de producto.
 */
export const useSerieProduccion = (filtros: FiltrosSerie) => {
  const { inicio, fin } = filtros;

  const datos = useQuery({
    queryKey: ['serie-produccion-datos', inicio, fin],
    queryFn: async () => {
      const [movimientos, ventas, acopios] = await Promise.all([
        traerTodo<MovRow>((desde, hasta) =>
          supabase
            .from('movimientos')
            .select('fecha, silice, placa, mina, origen, destino, cantidad_movimientos')
            .gte('fecha', inicio)
            .lte('fecha', fin)
            .order('id', { ascending: true })
            .range(desde, hasta) as unknown as Consulta<MovRow>
        ),
        traerTodo<VentaRow>((desde, hasta) =>
          supabase
            .from('ventas')
            .select('fecha, silice, cantidad_m3, fuente, tipo_transaccion')
            .gte('fecha', inicio)
            .lte('fecha', fin)
            .order('id', { ascending: true })
            .range(desde, hasta) as unknown as Consulta<VentaRow>
        ),
        traerTodo<AcopioRow>((desde, hasta) =>
          supabase
            .from('acopios')
            .select('fecha, silice, placa, cantidad_viajes')
            .gte('fecha', inicio)
            .lte('fecha', fin)
            .order('id', { ascending: true })
            .range(desde, hasta) as unknown as Consulta<AcopioRow>
        ),
      ]);
      return { movimientos, ventas, acopios };
    },
    staleTime: 60000,
  });

  const optimo = useOptimoDiario({ fechaInicio: inicio, fechaFin: fin });

  /** Minas presentes en el rango, para poblar el filtro. */
  const minas = useMemo(() => {
    const s = new Set<string>();
    datos.data?.movimientos.forEach(m => { if (m.mina) s.add(m.mina); });
    return Array.from(s).sort();
  }, [datos.data]);

  const puntos = useMemo<PuntoSerie[]>(() => {
    if (!datos.data) return [];
    const { ambito, agrupacion, mina, baseCapacidad } = filtros;
    const coincideSilice = (s: string) => ambito === 'todos' || s === ambito;

    const tramos = new Map<string, PuntoSerie>();
    const nuevo = (clave: string): PuntoSerie => ({
      clave,
      etiqueta: etiquetaTramo(clave, agrupacion),
      productoF1: 0, productoF2: 0, productoTotal: 0,
      capacidadF1: 0, capacidadF2: 0, capacidadTotal: 0,
      entregado: 0, entregadoVentas: 0, entregadoAcopio: 0,
      cumplimientoF1: 0, cumplimientoF2: 0, sinRegistros: true,
    });
    const dame = (fecha: string) => {
      const k = claveTramo(fecha, agrupacion);
      if (!tramos.has(k)) tramos.set(k, nuevo(k));
      return tramos.get(k)!;
    };

    // Días con operación real, para la base "solo días operados"
    const diasOperados = new Set<string>();
    datos.data.movimientos.forEach(mv => {
      if (mv.origen !== 'Punto de excavación' || esDestinoAlmacenamiento(mv.destino)) return;
      if (!coincideSilice(mv.silice)) return;
      if (mina && mv.mina !== mina) return;
      diasOperados.add(mv.fecha);
    });

    // Capacidad por día (todos los días del rango entran como tramo)
    optimo.data?.forEach(dia => {
      const p = dame(dia.fecha);
      if (baseCapacidad === 'operados' && !diasOperados.has(dia.fecha)) return;
      const bruto = ambito === 'todos' ? dia.m3Optimo : dia.m3OptimoPorSilice?.[ambito] ?? 0;
      p.capacidadF1 += bruto * RENDIMIENTO_PRODUCTO_F1;
      p.capacidadF2 += bruto * RENDIMIENTO_PRODUCTO_F2;
    });

    // Producción real
    datos.data.movimientos.forEach(mv => {
      if (!coincideSilice(mv.silice)) return;
      if (mina && mv.mina !== mina) return;
      if (esDestinoAlmacenamiento(mv.destino)) return;
      const p = dame(mv.fecha);
      const producto =
        calcularM3PorMovimiento(mv.placa, mv.silice, mv.origen, mv.destino).m3Producidos *
        (Number(mv.cantidad_movimientos) || 0);
      if (mv.origen === 'Punto de excavación') { p.productoF1 += producto; p.sinRegistros = false; }
      else if (mv.origen === 'Zaranda') { p.productoF2 += producto; p.sinRegistros = false; }
    });

    // Producto final entregado = ventas (con la yapa de 1 m³ por despacho) más
    // lo llevado al acopio. La mina no aplica: ventas y acopios se registran por
    // sílice, no por frente.
    datos.data.ventas.forEach(v => {
      if (!coincideSilice(v.silice)) return;
      dame(v.fecha).entregadoVentas += (Number(v.cantidad_m3) || 0) + 1;
    });
    datos.data.acopios.forEach(a => {
      if (!coincideSilice(a.silice)) return;
      dame(a.fecha).entregadoAcopio +=
        getCapacidadVolqueta(a.placa) * (Number(a.cantidad_viajes) || 0);
    });

    const r = (n: number) => Math.round(n * 10) / 10;
    return Array.from(tramos.values())
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .map(p => ({
        ...p,
        productoF1: r(p.productoF1),
        productoF2: r(p.productoF2),
        productoTotal: r(p.productoF1 + p.productoF2),
        capacidadF1: r(p.capacidadF1),
        capacidadF2: r(p.capacidadF2),
        capacidadTotal: r(p.capacidadF1 + p.capacidadF2),
        entregadoVentas: r(p.entregadoVentas),
        entregadoAcopio: r(p.entregadoAcopio),
        entregado: r(p.entregadoVentas + p.entregadoAcopio),
        cumplimientoF1: porcentaje(p.productoF1, p.capacidadF1),
        cumplimientoF2: porcentaje(p.productoF2, p.capacidadF2),
      }));
  }, [datos.data, optimo.data, filtros]);

  return { puntos, minas, isLoading: datos.isLoading || optimo.isLoading };
};
