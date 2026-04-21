import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Formato válido de placa: 3 letras seguidas de 3 dígitos, ej. BMW345 */
export const PLACA_REGEX = /^[A-Z]{3}[0-9]{3}$/;

export const validarPlaca = (placa: string): boolean => PLACA_REGEX.test(placa);

export const formatearPlaca = (valor: string): string => {
  // Mantener solo letras y números, eliminar todo lo demás
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Limitar a 6 caracteres: los primeros 3 deben ser letras, los siguientes 3 números
  const letras = limpio.slice(0, 3).replace(/[^A-Z]/g, '');
  const numeros = limpio.slice(3, 6).replace(/[^0-9]/g, '');
  return letras + numeros;
};

/** Devuelve un mapa de placa → nombre_cliente a partir de todas las ventas */
export const usePlacasClientes = () => {
  return useQuery({
    queryKey: ['placas-clientes'],
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('placa, nombre_cliente')
        .not('nombre_cliente', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const mapa = new Map<string, string>();
      data?.forEach(v => {
        if (v.nombre_cliente && !mapa.has(v.placa)) {
          mapa.set(v.placa, v.nombre_cliente);
        }
      });
      return mapa;
    },
    staleTime: 30000,
  });
};
