import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Acopio, AcopioInsert } from '@/types/database';
import { toast } from 'sonner';

export const useAcopios = () => {
  return useQuery({
    queryKey: ['acopios'],
    queryFn: async (): Promise<Acopio[]> => {
      const { data, error } = await supabase
        .from('acopios')
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

export const useCreateAcopios = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (acopios: Omit<AcopioInsert, 'usuario_id'>[]): Promise<Acopio[]> => {
      // No enviamos usuario_id para evitar el constraint de foreign key
      const acopiosSinUsuario = acopios.map(a => ({
        ...a,
        usuario_id: null
      }));
      
      const { data, error } = await supabase
        .from('acopios')
        .insert(acopiosSinUsuario)
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['acopios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`${data.length} registro(s) de acopio guardado(s) exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });
};

export const useUpdateAcopio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, acopio }: { id: string; acopio: Omit<AcopioInsert, 'usuario_id'> }): Promise<Acopio> => {
      console.log('[useUpdateAcopio] Iniciando actualización para ID:', id);
      console.log('[useUpdateAcopio] Datos a actualizar:', acopio);

      const { data, error } = await supabase
        .from('acopios')
        .update(acopio)
        .eq('id', id)
        .select();

      console.log('[useUpdateAcopio] Respuesta de Supabase - Data:', data);
      console.log('[useUpdateAcopio] Respuesta de Supabase - Error:', error);

      if (error) {
        console.error('[useUpdateAcopio] Error en actualización:', error.message);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        console.warn('[useUpdateAcopio] Data es null, undefined o array vacío:', data);
        return {} as Acopio;
      }

      console.log('[useUpdateAcopio] Retornando primer elemento:', data[0]);
      return data[0];
    },
    onSuccess: () => {
      console.log('[useUpdateAcopio] onSuccess - Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['acopios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Registro de acopio actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('[useUpdateAcopio] onError:', error.message);
      toast.error(`Error al actualizar: ${error.message}`);
    }
  });
};

export const useDeleteAcopio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('acopios')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acopios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Registro de acopio eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  });
};
