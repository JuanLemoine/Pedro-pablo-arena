import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Anticipo {
  id: string;
  fecha: string;
  nit: string;
  nombre: string | null;
  correo: string | null;
  banco: string | null;
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
        // Orden cronológico: más reciente primero. El id (uuid inmutable) es el
        // desempate estable — sin él, editar una fila la mueve de posición
        // porque los registros importados comparten el mismo created_at.
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
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

// Saldo por NIT a la fecha de hoy. Se exporta aparte del hook para poder
// reutilizarlo fuera de React (p. ej. el reporte de facturación en Excel).
export const fetchAnticiposPorNIT = async (): Promise<AnticipoPorNIT[]> => {
  // Anticipos registrados + ventas con descuenta_anticipo en paralelo
  const [{ data: anticiposData, error: e1 }, { data: ventasConsumo, error: e2 }] = await Promise.all([
    supabase.from('anticipos').select('nit, nombre, correo, valor'),
    supabase.from('ventas').select('nit_cliente, nombre_cliente, valor_total').eq('descuenta_anticipo', true),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  type Entry = { nombre: string; correo: string | null; totalAnticipo: number; consumo: number };
  const nitMap = new Map<string, Entry>();

  // 1. Cargar anticipos registrados
  anticiposData?.forEach(a => {
    const prev = nitMap.get(a.nit) || { nombre: a.nombre || a.nit, correo: a.correo, totalAnticipo: 0, consumo: 0 };
    if (a.nombre) prev.nombre = a.nombre;
    if (a.correo) prev.correo = a.correo;
    prev.totalAnticipo += Number(a.valor);
    nitMap.set(a.nit, prev);
  });

  // 2. Cargar consumo de ventas — incluye NITs sin anticipo (quedan en negativo)
  ventasConsumo?.forEach(v => {
    if (!v.nit_cliente) return;
    const prev = nitMap.get(v.nit_cliente) || {
      nombre: (v as any).nombre_cliente || v.nit_cliente,
      correo: null,
      totalAnticipo: 0,
      consumo: 0,
    };
    prev.consumo += Number(v.valor_total);
    nitMap.set(v.nit_cliente, prev);
  });

  if (nitMap.size === 0) return [];

  return Array.from(nitMap.entries())
    .map(([nit, d]) => ({
      nit,
      nombre: d.nombre,
      correo: d.correo,
      totalAnticipo: Math.round(d.totalAnticipo),
      consumo: Math.round(d.consumo),
      saldo: Math.round(d.totalAnticipo - d.consumo),
    }))
    .sort((a, b) => a.saldo - b.saldo); // más negativo primero
};

export const useAnticiposPorNIT = () =>
  useQuery({
    queryKey: ['anticipos-por-nit'],
    queryFn: fetchAnticiposPorNIT,
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
