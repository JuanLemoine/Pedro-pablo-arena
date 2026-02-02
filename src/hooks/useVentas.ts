import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Venta, VentaInsert } from '@/types/database';
import { toast } from 'sonner';

export const useVentas = () => {
  return useQuery({
    queryKey: ['ventas'],
    queryFn: async (): Promise<Venta[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    }
  });
};

export const useCreateVentas = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ventas: Omit<VentaInsert, 'usuario_id'>[]): Promise<Venta[]> => {
      // No enviamos usuario_id para evitar el constraint de foreign key
      const ventasSinUsuario = ventas.map(v => ({
        ...v,
        usuario_id: null
      }));
      
      const { data, error } = await supabase
        .from('ventas')
        .insert(ventasSinUsuario)
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`${data.length} venta(s) registrada(s) exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });
};

export const useDeleteVenta = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Venta eliminada');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  });
};
