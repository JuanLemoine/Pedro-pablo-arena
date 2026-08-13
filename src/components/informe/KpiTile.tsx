import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calcularVariacion, esBuenaNoticia, type Sentido } from '@/lib/formato';

export type TonoKpi = 'ambar' | 'azul' | 'verde' | 'morado' | 'teal' | 'gris';

const TONOS: Record<TonoKpi, { fondo: string; borde: string; icono: string; texto: string }> = {
  ambar:  { fondo: 'bg-amber-50/70',  borde: 'border-amber-200',  icono: 'text-amber-600',  texto: 'text-amber-900' },
  azul:   { fondo: 'bg-blue-50/70',   borde: 'border-blue-200',   icono: 'text-blue-600',   texto: 'text-blue-900' },
  verde:  { fondo: 'bg-green-50/70',  borde: 'border-green-200',  icono: 'text-green-600',  texto: 'text-green-900' },
  morado: { fondo: 'bg-purple-50/70', borde: 'border-purple-200', icono: 'text-purple-600', texto: 'text-purple-900' },
  teal:   { fondo: 'bg-teal-50/70',   borde: 'border-teal-200',   icono: 'text-teal-600',   texto: 'text-teal-900' },
  gris:   { fondo: 'bg-slate-50/70',  borde: 'border-slate-200',  icono: 'text-slate-600',  texto: 'text-slate-900' },
};

interface Props {
  titulo: string;
  valor: string;
  /** Texto pequeño bajo el valor: la explicación en español llano. */
  nota?: string;
  icono: LucideIcon;
  tono?: TonoKpi;
  /** Valor actual y anterior para calcular la variación. Si se omiten, no se muestra. */
  actual?: number;
  anterior?: number;
  sentido?: Sentido;
}

/**
 * Tarjeta de indicador con su variación frente al período anterior.
 * El color de la flecha depende de `sentido`: subir m³ es bueno, subir
 * descuentos no lo es.
 */
const KpiTile = ({
  titulo,
  valor,
  nota,
  icono: Icono,
  tono = 'gris',
  actual,
  anterior,
  sentido = 'masEsMejor',
}: Props) => {
  const t = TONOS[tono];
  const variacion =
    actual !== undefined && anterior !== undefined ? calcularVariacion(actual, anterior) : null;
  const bueno = variacion ? esBuenaNoticia(variacion, sentido) : null;

  const FlechaVar =
    variacion?.direccion === 'sube' ? ArrowUp : variacion?.direccion === 'baja' ? ArrowDown : ArrowRight;
  const sinBase = variacion?.direccion === 'sinDato';

  return (
    <div className={cn('evitar-corte rounded-xl border p-4 flex flex-col gap-2', t.fondo, t.borde)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground leading-tight">{titulo}</p>
        <Icono className={cn('h-4 w-4 shrink-0', t.icono)} />
      </div>

      <p className={cn('text-2xl font-bold leading-none tabular-nums', t.texto)}>{valor}</p>

      {variacion && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            bueno === true ? 'text-green-600' : bueno === false ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          {!sinBase && <FlechaVar className="h-3 w-3" />}
          <span>{variacion.texto}</span>
          {!sinBase && <span className="font-normal text-muted-foreground">vs. anterior</span>}
        </div>
      )}

      {nota && <p className="text-[11px] text-muted-foreground leading-snug">{nota}</p>}
    </div>
  );
};

export default KpiTile;
