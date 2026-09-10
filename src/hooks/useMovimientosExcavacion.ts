import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import { getCapacidadVolqueta } from '@/lib/volquetas';
import { clasificarPorCapacidad } from '@/lib/simulador';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiaExcavacion {
  fecha: string;
  fechaLabel: string;
  movimientos: number;
  /** Viajes de las volquetas de 7 m³, que cargan 5,5 m³ por viaje. */
  mov7: number;
  /** Viajes de las volquetas de 8 m³. */
  mov8: number;
  /** Viajes de la volqueta de 14 m³. */
  mov14: number;
}

interface MovimientosExcavacionData {
  dias: DiaExcavacion[];
  totalMovimientos: number;
  total7: number;
  total8: number;
  total14: number;
  promedioDia: number;
  diaPico: DiaExcavacion | null;
}

interface Params {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface MovRow {
  fecha: string;
  placa: string;
  silice: string;
  cantidad_movimientos: number;
}
/** Los tipos generados de Supabase están desactualizados y colapsan a `never`. */
type ConsultaPaginada<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export const useMovimientosExcavacion = ({ tipoSilice, fechaInicio, fechaFin }: Params = {}) => {
  const now = new Date();
  const inicio = fechaInicio ?? format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const fin = fechaFin ?? format(now, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['movimientos-excavacion', inicio, fin, tipoSilice],
    queryFn: async (): Promise<MovimientosExcavacionData> => {
      // Paginado: un rango de varios meses supera las 1.000 filas por petición.
      const data = await traerTodo<MovRow>((desde, hasta) => {
        let q = supabase
          .from('movimientos')
          .select('fecha, placa, silice, cantidad_movimientos')
          .eq('origen', 'Punto de excavación')
          .gte('fecha', inicio)
          .lte('fecha', fin)
          .order('id', { ascending: true })
          .range(desde, hasta);
        if (tipoSilice && tipoSilice !== 'todos') q = q.eq('silice', tipoSilice);
        return q as unknown as ConsultaPaginada<MovRow>;
      });

      // Agrupar por día, separando los viajes según el tamaño de la volqueta.
      type Acum = { mov7: number; mov8: number; mov14: number };
      const porDia = new Map<string, Acum>();
      data?.forEach(m => {
        const acum = porDia.get(m.fecha) ?? { mov7: 0, mov8: 0, mov14: 0 };
        const viajes = Number(m.cantidad_movimientos) || 0;
        const clase = clasificarPorCapacidad(getCapacidadVolqueta(m.placa));
        if (clase === 'large') acum.mov14 += viajes;
        else if (clase === 'medium') acum.mov8 += viajes;
        else acum.mov7 += viajes;
        porDia.set(m.fecha, acum);
      });

      const dias: DiaExcavacion[] = Array.from(porDia.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, a]) => ({
          fecha,
          fechaLabel: format(parseISO(fecha), 'd MMM', { locale: es }),
          movimientos: a.mov7 + a.mov8 + a.mov14,
          ...a,
        }));

      const totalMovimientos = dias.reduce((s, d) => s + d.movimientos, 0);
      const total7 = dias.reduce((s, d) => s + d.mov7, 0);
      const total8 = dias.reduce((s, d) => s + d.mov8, 0);
      const total14 = dias.reduce((s, d) => s + d.mov14, 0);
      const diasConDatos = dias.filter(d => d.movimientos > 0).length;
      const promedioDia = diasConDatos > 0 ? Math.round((totalMovimientos / diasConDatos) * 10) / 10 : 0;
      const maxVal = Math.max(...dias.map(d => d.movimientos), 0);
      const diaPico = dias.find(d => d.movimientos === maxVal) ?? null;

      return { dias, totalMovimientos, total7, total8, total14, promedioDia, diaPico };
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
