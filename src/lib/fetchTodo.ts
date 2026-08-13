/**
 * Supabase devuelve como máximo 1.000 filas por petición. Los reportes deben
 * incluir el periodo completo, así que se pide por páginas hasta agotarlo.
 */
export const TAMANO_PAGINA = 1000;

export const traerTodo = async <T,>(
  construirQuery: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> => {
  const todo: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await construirQuery(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const pagina = data || [];
    todo.push(...pagina);
    if (pagina.length < TAMANO_PAGINA) return todo;
  }
};
