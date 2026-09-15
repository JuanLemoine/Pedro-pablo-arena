import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type TonoIndicador =
  | 'amber' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'rose' | 'slate';

export interface Indicador {
  etiqueta: string;
  /** Ya formateado: el tablero no sabe si es dinero, m³ o un conteo. */
  valor: string;
  /** Línea pequeña de contexto bajo el valor. */
  nota?: string;
  icono: LucideIcon;
  tono: TonoIndicador;
}

/**
 * Las clases van completas y no compuestas, porque Tailwind solo conserva las
 * que aparecen literales en el código.
 */
const TONOS: Record<TonoIndicador, { card: string; icono: string; texto: string; valor: string; nota: string }> = {
  amber:  { card: 'bg-amber-50 border-amber-200',   icono: 'bg-amber-500/20 text-amber-600',   texto: 'text-amber-700',   valor: 'text-amber-800',   nota: 'text-amber-600' },
  blue:   { card: 'bg-blue-50 border-blue-200',     icono: 'bg-blue-500/20 text-blue-600',     texto: 'text-blue-700',    valor: 'text-blue-800',    nota: 'text-blue-600' },
  green:  { card: 'bg-green-50 border-green-200',   icono: 'bg-green-500/20 text-green-600',   texto: 'text-green-700',   valor: 'text-green-800',   nota: 'text-green-600' },
  purple: { card: 'bg-purple-50 border-purple-200', icono: 'bg-purple-500/20 text-purple-600', texto: 'text-purple-700',  valor: 'text-purple-800',  nota: 'text-purple-600' },
  orange: { card: 'bg-orange-50 border-orange-200', icono: 'bg-orange-500/20 text-orange-600', texto: 'text-orange-700',  valor: 'text-orange-800',  nota: 'text-orange-600' },
  teal:   { card: 'bg-teal-50 border-teal-200',     icono: 'bg-teal-500/20 text-teal-600',     texto: 'text-teal-700',    valor: 'text-teal-800',    nota: 'text-teal-600' },
  rose:   { card: 'bg-rose-50 border-rose-200',     icono: 'bg-rose-500/20 text-rose-600',     texto: 'text-rose-700',    valor: 'text-rose-800',    nota: 'text-rose-600' },
  slate:  { card: 'bg-slate-50 border-slate-200',   icono: 'bg-slate-500/20 text-slate-600',   texto: 'text-slate-700',   valor: 'text-slate-800',   nota: 'text-slate-600' },
};

/** Cuántas columnas caben sin que las tarjetas queden apretadas. */
const COLUMNAS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

/**
 * Fila de totales de lo que esté filtrado en la pantalla. Es la misma pieza en
 * Ventas, Acopio, Anticipos y Movimientos para que las cuatro secciones se lean
 * igual; lo único que cambia son los indicadores de cada una.
 */
const TableroTotales = ({ indicadores }: { indicadores: Indicador[] }) => {
  if (indicadores.length === 0) return null;
  return (
    <div className={cn('grid gap-4', COLUMNAS[indicadores.length] ?? COLUMNAS[4])}>
      {indicadores.map(ind => {
        const t = TONOS[ind.tono];
        const Icono = ind.icono;
        return (
          <Card key={ind.etiqueta} className={cn('shadow-card', t.card)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('w-12 h-12 shrink-0 rounded-xl flex items-center justify-center', t.icono)}>
                <Icono className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm', t.texto)}>{ind.etiqueta}</p>
                <p className={cn('text-2xl font-bold leading-tight', t.valor)}>{ind.valor}</p>
                {ind.nota && <p className={cn('text-[11px]', t.nota)}>{ind.nota}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TableroTotales;
