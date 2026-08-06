import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getPlacasDisponibles } from '@/lib/volquetas';
import { validarPlaca } from '@/lib/placas';
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

/**
 * Placas para los desplegables de registro.
 *
 * Une la tabla `volquetas` con el inventario de `lib/volquetas.ts`, que es donde
 * vive la capacidad en m³ de cada placa. Son dos fuentes distintas: sin la
 * unión, una volqueta nueva solo aparece si se agrega en los dos sitios, y si
 * falta en la tabla no se puede seleccionar aunque su capacidad ya esté
 * definida. Es unión, no reemplazo: ninguna placa que hoy esté en la tabla
 * desaparece.
 *
 * Se descarta lo que no tenga formato de placa: la lista es el origen de los
 * registros nuevos, así que una entrada mal escrita en la tabla no debe poder
 * seleccionarse.
 */
export const usePlacas = () => {
  const { data: volquetas, ...rest } = useVolquetas();
  const placas = new Set([
    ...(volquetas?.map(v => v.placa) || []),
    ...getPlacasDisponibles(),
  ]);
  return {
    ...rest,
    data: Array.from(placas)
      .filter(validarPlaca)
      .sort((a, b) => a.localeCompare(b)),
  };
};

