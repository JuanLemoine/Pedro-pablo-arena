import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Venta, VentaInsert } from '@/types/database';
import { toast } from 'sonner';

export const FUENTE_ACOPIO = 'Acopio';

export const useVentasEnAcopio = () => {
  return useQuery({
    queryKey: ['ventas-en-acopio'],
    queryFn: async (): Promise<Venta[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .eq('fuente', FUENTE_ACOPIO)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

export const useCreateVentaAcopio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (venta: Omit<VentaInsert, 'fuente' | 'usuario_id'>): Promise<Venta> => {
      const { data, error } = await supabase
        .from('ventas')
        .insert({ ...venta, fuente: FUENTE_ACOPIO, usuario_id: null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas-en-acopio'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta registrada');
    },
    onError: (e: Error) => toast.error(`Error al guardar: ${e.message}`),
  });
};

export const useUpdateVentaAcopio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, venta }: { id: string; venta: Partial<VentaInsert> }): Promise<Venta> => {
      const { data, error } = await supabase
        .from('ventas')
        .update({ ...venta, fuente: FUENTE_ACOPIO })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas-en-acopio'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta actualizada');
    },
    onError: (e: Error) => toast.error(`Error al actualizar: ${e.message}`),
  });
};

export const useDeleteVentaAcopio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ventas').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas-en-acopio'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta eliminada');
    },
    onError: (e: Error) => toast.error(`Error al eliminar: ${e.message}`),
  });
};
