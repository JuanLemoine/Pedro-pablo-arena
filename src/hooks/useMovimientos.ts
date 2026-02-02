import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Movimiento, MovimientoInsert } from '@/types/database';
import { toast } from 'sonner';

export const useMovimientos = () => {
  return useQuery({
    queryKey: ['movimientos'],
    queryFn: async (): Promise<Movimiento[]> => {
      const { data, error } = await supabase
        .from('movimientos')
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

export const useCreateMovimiento = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movimiento: Omit<MovimientoInsert, 'usuario_id'>): Promise<Movimiento> => {
      // No enviamos usuario_id para evitar el constraint de foreign key
      const movimientoSinUsuario = {
        ...movimiento,
        usuario_id: null
      };
      
      const { data, error } = await supabase
        .from('movimientos')
        .insert(movimientoSinUsuario)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Movimiento registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });
};

export const useDeleteMovimiento = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Movimiento eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  });
};
