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
