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
