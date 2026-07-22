import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Anticipo {
  id: string;
  fecha: string;
  nit: string;
  nombre: string | null;
  correo: string | null;
  valor: number;
  created_at: string;
}

export interface AnticipoPorNIT {
  nit: string;
  nombre: string;
  correo: string | null;
  totalAnticipo: number;
  consumo: number;
  saldo: number;
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export const useAnticipos = () =>
  useQuery({
    queryKey: ['anticipos'],
    queryFn: async (): Promise<Anticipo[]> => {
      const { data, error } = await supabase
        .from('anticipos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 30000,
  });

export const useCreateAnticipo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (anticipo: Omit<Anticipo, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('anticipos').insert(anticipo).select();
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anticipos'] });
      queryClient.invalidateQueries({ queryKey: ['anticipos-por-nit'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
      toast.success('Anticipo registrado exitosamente');
    },
    onError: (e: Error) => toast.error(`Error al guardar: ${e.message}`),
  });
};

export const useUpdateAnticipo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, anticipo }: { id: string; anticipo: Omit<Anticipo, 'id' | 'created_at'> }) => {
      const { data, error } = await supabase.from('anticipos').update(anticipo).eq('id', id).select();
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anticipos'] });
      queryClient.invalidateQueries({ queryKey: ['anticipos-por-nit'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
      toast.success('Anticipo actualizado exitosamente');
    },
    onError: (e: Error) => toast.error(`Error al actualizar: ${e.message}`),
  });
};

export const useDeleteAnticipo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('anticipos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anticipos'] });
      queryClient.invalidateQueries({ queryKey: ['anticipos-por-nit'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
      toast.success('Anticipo eliminado');
    },
    onError: (e: Error) => toast.error(`Error al eliminar: ${e.message}`),
  });
};

// ── Saldos por NIT (global, sin filtro de fecha) ────────────────────────────

export const useAnticiposPorNIT = () =>
  useQuery({
    queryKey: ['anticipos-por-nit'],
    queryFn: async (): Promise<AnticipoPorNIT[]> => {
      // Todos los anticipos registrados
      const { data: anticiposData, error: e1 } = await supabase
        .from('anticipos')
        .select('nit, nombre, correo, valor');
      if (e1) throw new Error(e1.message);

      if (!anticiposData || anticiposData.length === 0) return [];

      const nits = [...new Set(anticiposData.map(a => a.nit))];

      // Consumo: ventas de esos NITs (que ya no tienen banco='Anticipo')
      const { data: ventasData, error: e2 } = await supabase
        .from('ventas')
        .select('nit_cliente, valor_total')
        .in('nit_cliente', nits);
      if (e2) throw new Error(e2.message);

      // Acumular anticipos por NIT
      const nitMap = new Map<string, { nombre: string; correo: string | null; totalAnticipo: number; consumo: number }>();
      anticiposData.forEach(a => {
        const prev = nitMap.get(a.nit) || { nombre: a.nombre || a.nit, correo: a.correo, totalAnticipo: 0, consumo: 0 };
        if (a.nombre) prev.nombre = a.nombre;
        if (a.correo) prev.correo = a.correo;
        prev.totalAnticipo += Number(a.valor);
        nitMap.set(a.nit, prev);
      });

      // Acumular consumo de ventas
      ventasData?.forEach(v => {
        if (!v.nit_cliente) return;
        const entry = nitMap.get(v.nit_cliente);
        if (entry) entry.consumo += Number(v.valor_total);
      });

      return Array.from(nitMap.entries())
        .map(([nit, d]) => ({
          nit,
          nombre: d.nombre,
          correo: d.correo,
          totalAnticipo: Math.round(d.totalAnticipo),
          consumo: Math.round(d.consumo),
          saldo: Math.round(d.totalAnticipo - d.consumo),
        }))
        .sort((a, b) => b.totalAnticipo - a.totalAnticipo);
    },
    staleTime: 30000,
  });

// ── Clientes conocidos para autocompletado en el formulario ─────────────────

export const useClientesAnticipo = () =>
  useQuery({
    queryKey: ['clientes-anticipo'],
    queryFn: async (): Promise<{ nit: string; nombre: string; correo: string | null }[]> => {
      const { data, error } = await supabase
        .from('anticipos')
        .select('nit, nombre, correo')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      // Deduplicar por NIT, conservar datos más recientes
      const seen = new Map<string, { nit: string; nombre: string; correo: string | null }>();
      data?.forEach(a => {
        if (!seen.has(a.nit)) seen.set(a.nit, { nit: a.nit, nombre: a.nombre || '', correo: a.correo });
      });
      return Array.from(seen.values());
    },
    staleTime: 30000,
  });
