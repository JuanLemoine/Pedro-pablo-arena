import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Formato válido de placa: 3 letras seguidas de 3 dígitos, ej. BMW345 */
export const PLACA_REGEX = /^[A-Z]{3}[0-9]{3}$/;

export const validarPlaca = (placa: string): boolean => PLACA_REGEX.test(placa);

export const formatearPlaca = (valor: string): string => {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letras = limpio.slice(0, 3).replace(/[^A-Z]/g, '');
  const numeros = limpio.slice(3, 6).replace(/[^0-9]/g, '');
  return letras + numeros;
};

export interface ClienteInfo {
  nombre: string;
  nit: string;
}

/** Devuelve un mapa de placa → [array de nombres_clientes] */
export const usePlacasClientes = () => {
  return useQuery({
    queryKey: ['placas-clientes'],
    queryFn: async (): Promise<Map<string, string[]>> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('placa, nombre_cliente')
        .not('nombre_cliente', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const mapa = new Map<string, Set<string>>();
      data?.forEach(v => {
        if (v.nombre_cliente) {
          if (!mapa.has(v.placa)) mapa.set(v.placa, new Set());
          mapa.get(v.placa)!.add(v.nombre_cliente);
        }
      });

      const resultado = new Map<string, string[]>();
      mapa.forEach((clientes, placa) => {
        resultado.set(placa, Array.from(clientes));
      });

      return resultado;
    },
    staleTime: 30000,
  });
};

/**
 * Devuelve todos los clientes únicos con su NIT más reciente.
 * Usado para autocompletado en el campo nombre_cliente.
 */
export const useClientesInfo = () => {
  return useQuery({
    queryKey: ['clientes-info'],
    queryFn: async (): Promise<ClienteInfo[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('nombre_cliente, nit_cliente')
        .not('nombre_cliente', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Deduplicar por nombre, conservando el NIT más reciente
      const mapa = new Map<string, string>();
      data?.forEach(v => {
        if (v.nombre_cliente && !mapa.has(v.nombre_cliente)) {
          mapa.set(v.nombre_cliente, v.nit_cliente || '');
        }
      });

      return Array.from(mapa.entries()).map(([nombre, nit]) => ({ nombre, nit }));
    },
    staleTime: 30000,
  });
};
