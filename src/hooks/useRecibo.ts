import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface VentaConRecibo {
  id: string;
  fecha: string;
  placa: string;
  silice: string;
  nombre_cliente: string | null;
  valor_total: number;
}

/**
 * Busca si un número de recibo ya está registrado. La unicidad es global: el
 * mismo control existe en la base de datos mediante el trigger
 * ventas_recibo_unico, así que esto es solo el aviso temprano al usuario.
 *
 * `ignorarId` evita que un registro en edición se detecte a sí mismo.
 */
export const buscarRecibo = async (
  recibo: string,
  ignorarId?: string | null
): Promise<VentaConRecibo | null> => {
  const valor = recibo.trim();
  if (!valor) return null;

  let query = supabase
    .from('ventas')
    .select('id, fecha, placa, silice, nombre_cliente, valor_total')
    .eq('recibo', valor)
    .order('fecha', { ascending: false })
    .limit(1);

  if (ignorarId) query = query.neq('id', ignorarId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.[0] as VentaConRecibo) || null;
};

/**
 * Verifica el recibo contra la base de datos con un retardo, para no consultar
 * en cada tecla mientras se escribe.
 */
export const useVerificarRecibo = (recibo: string, ignorarId?: string | null) => {
  const [existente, setExistente] = useState<VentaConRecibo | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    const valor = recibo.trim();
    if (!valor) {
      setExistente(null);
      setVerificando(false);
      return;
    }

    setVerificando(true);
    let cancelado = false;

    const timer = setTimeout(async () => {
      try {
        const encontrada = await buscarRecibo(valor, ignorarId);
        if (!cancelado) setExistente(encontrada);
      } catch {
        // Si la consulta falla no se bloquea al usuario: la base de datos
        // sigue siendo la que rechaza el duplicado al guardar.
        if (!cancelado) setExistente(null);
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [recibo, ignorarId]);

  return { existente, verificando };
};
