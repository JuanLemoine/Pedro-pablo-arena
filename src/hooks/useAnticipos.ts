import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AnticipoPorNIT {
  nit: string;
  nombre: string;
  totalAnticipo: number;
  consumo: number;
  saldo: number;
}

/** Retorna el balance de anticipo por NIT (global, sin filtro de fecha). */
export const useAnticiposPorNIT = () => {
  return useQuery({
    queryKey: ['anticipos-por-nit'],
    queryFn: async (): Promise<AnticipoPorNIT[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('nit_cliente, nombre_cliente, banco, valor_total')
        .not('nit_cliente', 'is', null);

      if (error) throw new Error(error.message);

      // Identificar NITs que tienen al menos un registro de anticipo
      const nitsConAnticipo = new Set<string>();
      data?.forEach(v => {
        if (v.banco === 'Anticipo') nitsConAnticipo.add(v.nit_cliente!);
      });

      if (nitsConAnticipo.size === 0) return [];

      const nitMap = new Map<string, { nombre: string; totalAnticipo: number; consumo: number }>();

      data?.forEach(v => {
        const nit = v.nit_cliente!;
        if (!nitsConAnticipo.has(nit)) return;

        const entry = nitMap.get(nit) || { nombre: v.nombre_cliente || nit, totalAnticipo: 0, consumo: 0 };
        if (v.nombre_cliente) entry.nombre = v.nombre_cliente;

        if (v.banco === 'Anticipo') {
          entry.totalAnticipo += Number(v.valor_total);
        } else {
          entry.consumo += Number(v.valor_total);
        }

        nitMap.set(nit, entry);
      });

      return Array.from(nitMap.entries())
        .map(([nit, d]) => ({
          nit,
          nombre: d.nombre,
          totalAnticipo: Math.round(d.totalAnticipo),
          consumo: Math.round(d.consumo),
          saldo: Math.round(d.totalAnticipo - d.consumo),
        }))
        .sort((a, b) => b.totalAnticipo - a.totalAnticipo);
    },
    staleTime: 30000,
  });
};
