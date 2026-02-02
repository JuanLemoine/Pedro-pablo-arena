import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Volqueta } from '@/types/database';

export const useVolquetas = () => {
  return useQuery({
    queryKey: ['volquetas'],
    queryFn: async (): Promise<Volqueta[]> => {
      const { data, error } = await supabase
        .from('volquetas')
        .select('*')
        .eq('activa', true)
        .order('placa', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    }
  });
};

export const usePlacas = () => {
  const { data: volquetas, ...rest } = useVolquetas();
  return {
    ...rest,
    data: volquetas?.map(v => v.placa) || []
  };
};

