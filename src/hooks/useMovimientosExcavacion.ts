import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiaExcavacion {
  fecha: string;
  fechaLabel: string;
  movimientos: number;
}

interface MovimientosExcavacionData {
  dias: DiaExcavacion[];
  totalMovimientos: number;
  promedioDia: number;
  diaPico: DiaExcavacion | null;
}

interface Params {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export const useMovimientosExcavacion = ({ tipoSilice, fechaInicio, fechaFin }: Params = {}) => {
  const now = new Date();
  const inicio = fechaInicio ?? format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const fin = fechaFin ?? format(now, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['movimientos-excavacion', inicio, fin, tipoSilice],
    queryFn: async (): Promise<MovimientosExcavacionData> => {
      let q = supabase
        .from('movimientos')
        .select('fecha, cantidad_movimientos, silice')
        .eq('origen', 'Punto de excavación')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: true });

      if (tipoSilice && tipoSilice !== 'todos') {
        q = q.eq('silice', tipoSilice);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      // Agrupar por día
      const porDia = new Map<string, number>();
      data?.forEach(m => {
        porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + m.cantidad_movimientos);
      });

      const dias: DiaExcavacion[] = Array.from(porDia.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, movimientos]) => ({
          fecha,
          fechaLabel: format(parseISO(fecha), 'd MMM', { locale: es }),
          movimientos,
        }));

      const totalMovimientos = dias.reduce((s, d) => s + d.movimientos, 0);
      const diasConDatos = dias.filter(d => d.movimientos > 0).length;
      const promedioDia = diasConDatos > 0 ? Math.round((totalMovimientos / diasConDatos) * 10) / 10 : 0;
      const maxVal = Math.max(...dias.map(d => d.movimientos), 0);
      const diaPico = dias.find(d => d.movimientos === maxVal) ?? null;

      return { dias, totalMovimientos, promedioDia, diaPico };
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
