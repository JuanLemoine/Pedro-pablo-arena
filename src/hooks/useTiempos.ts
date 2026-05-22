import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tiempo, TiempoInsert } from '@/types/database';
import { toast } from 'sonner';

export const useTiempos = () => {
  return useQuery({
    queryKey: ['tiempos'],
    queryFn: async (): Promise<Tiempo[]> => {
      const { data, error } = await supabase
        .from('tiempos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

export const useCreateTiempo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tiempo: Omit<TiempoInsert, 'usuario_id'>): Promise<Tiempo> => {
      const { data, error } = await supabase
        .from('tiempos')
        .insert({ ...tiempo, usuario_id: null })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiempos'] });
      toast.success('Registro de tiempo guardado');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });
};

export const useUpdateTiempo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tiempo }: { id: string; tiempo: Omit<TiempoInsert, 'usuario_id'> }): Promise<Tiempo> => {
      console.log('[useUpdateTiempo] Iniciando actualización para ID:', id);
      console.log('[useUpdateTiempo] Datos a actualizar:', tiempo);

      const { data, error } = await supabase
        .from('tiempos')
        .update(tiempo)
        .eq('id', id)
        .select();

      console.log('[useUpdateTiempo] Respuesta de Supabase - Data:', data);
      console.log('[useUpdateTiempo] Respuesta de Supabase - Error:', error);

      if (error) {
        console.error('[useUpdateTiempo] Error en actualización:', error.message);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        console.warn('[useUpdateTiempo] Data es null, undefined o array vacío:', data);
        return {} as Tiempo;
      }

      console.log('[useUpdateTiempo] Retornando primer elemento:', data[0]);
      return data[0];
    },
    onSuccess: () => {
      console.log('[useUpdateTiempo] onSuccess - Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['tiempos'] });
      toast.success('Tiempo actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('[useUpdateTiempo] onError:', error.message);
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });
};

export const useDeleteTiempo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tiempos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiempos'] });
      toast.success('Registro eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });
};
