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

export const useUpdateMovimiento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, movimiento }: { id: string; movimiento: Omit<MovimientoInsert, 'usuario_id'> }): Promise<Movimiento> => {
      console.log('[useUpdateMovimiento] Iniciando actualización para ID:', id);
      console.log('[useUpdateMovimiento] Datos a actualizar:', movimiento);

      const { data, error } = await supabase
        .from('movimientos')
        .update(movimiento)
        .eq('id', id)
        .select();

      console.log('[useUpdateMovimiento] Respuesta de Supabase - Data:', data);
      console.log('[useUpdateMovimiento] Respuesta de Supabase - Error:', error);

      if (error) {
        console.error('[useUpdateMovimiento] Error en actualización:', error.message);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        console.warn('[useUpdateMovimiento] Data es null, undefined o array vacío:', data);
        return {} as Movimiento;
      }

      console.log('[useUpdateMovimiento] Retornando primer elemento:', data[0]);
      return data[0];
    },
    onSuccess: () => {
      console.log('[useUpdateMovimiento] onSuccess - Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Movimiento actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('[useUpdateMovimiento] onError:', error.message);
      toast.error(`Error al actualizar: ${error.message}`);
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
