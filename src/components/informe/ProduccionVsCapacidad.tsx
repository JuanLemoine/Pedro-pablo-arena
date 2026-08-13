import { cn } from '@/lib/utils';
import { formatoM3, formatoPorcentaje } from '@/lib/formato';
import type { MetricasPeriodo } from '@/lib/informe';
import SerieProduccion from './SerieProduccion';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo | null;
  tipoSilice: string;
}

const nombreCorto = (silice: string) => silice.replace('Silice ', '');

const tono = (pct: number) =>
  pct >= 85 ? 'text-green-700' : pct >= 60 ? 'text-amber-700' : 'text-red-600';
const barra = (pct: number) =>
  pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

/** Comparación grande de una fase: producido, capacidad, % y brecha. */
const Fase = ({
  numero,
  titulo,
  explicacion,
  producido,
  capacidad,
  cumplimiento,
  brecha,
  cumplimientoAnterior,
}: {
  numero: 1 | 2;
  titulo: string;
  explicacion: string;
  producido: number;
  capacidad: number;
  cumplimiento: number;
  brecha: number;
  cumplimientoAnterior?: number;
}) => {
  const ancho = Math.min(100, Math.max(0, cumplimiento));
  const delta =
    cumplimientoAnterior !== undefined && cumplimientoAnterior > 0
      ? cumplimiento - cumplimientoAnterior
      : null;

  return (
    <div className="evitar-corte rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fase {numero}
          </p>
          <p className="font-semibold leading-tight text-foreground">{titulo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{explicacion}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-3xl font-bold leading-none tabular-nums', tono(cumplimiento))}>
            {formatoPorcentaje(cumplimiento, 0)}
          </p>
          {delta !== null && (
            <p
              className={cn(
                'mt-1 text-[11px] font-medium',
                delta > 0.5 ? 'text-green-600' : delta < -0.5 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {delta > 0 ? '+' : ''}
              {formatoPorcentaje(delta, 1).replace(' %', ' pp')} vs. anterior
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-4 rounded-full transition-all', barra(cumplimiento))} style={{ width: `${ancho}%` }} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Producido</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{formatoM3(producido, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Debió producirse</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{formatoM3(capacidad, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Se dejó de producir</p>
          <p className="text-sm font-bold tabular-nums text-red-600">{formatoM3(brecha, 0)}</p>
        </div>
      </div>
    </div>
  );
};

const ProduccionVsCapacidad = ({ actual, anterior, tipoSilice }: Props) => {
  const veredicto =
    actual.capacidadProductoF1 === 0
      ? 'No hay días hábiles con tiempos de recorrido en el período, así que no se puede calcular la capacidad.'
      : actual.cumplimientoF1 >= 75 && actual.cumplimientoF2 < 40
      ? `Fase 1 está cumpliendo (${formatoPorcentaje(actual.cumplimientoF1, 0)}) pero Fase 2 no (${formatoPorcentaje(actual.cumplimientoF2, 0)}): hay material de sobra para reprocesar y no se está haciendo. Ahí están ${formatoM3(actual.brechaF2, 0)} de producto sin generar.`
      : actual.cumplimientoF1 < 60
      ? `Fase 1 solo alcanzó el ${formatoPorcentaje(actual.cumplimientoF1, 0)} de su capacidad: el cuello de botella está en sacar material, y mientras eso no mejore Fase 2 tampoco tiene con qué trabajar.`
      : `Entre las dos fases se dejaron de producir ${formatoM3(actual.brechaF1 + actual.brechaF2, 0)} de los ${formatoM3(actual.capacidadProductoTotal, 0)} que la operación podía dar.`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Fase
          numero={1}
          titulo="Arena directa de zaranda"
          explicacion="67 % de lo que se excava sale como producto sin reprocesar"
          producido={actual.productoFase1}
          capacidad={actual.capacidadProductoF1}
          cumplimiento={actual.cumplimientoF1}
          brecha={actual.brechaF1}
          cumplimientoAnterior={anterior?.cumplimientoF1}
        />
        <Fase
          numero={2}
          titulo="Arena recuperada del residuo"
          explicacion="23,1 % adicional que se obtiene reprocesando lo que la zaranda descarta"
          producido={actual.productoFase2}
          capacidad={actual.capacidadProductoF2}
          cumplimiento={actual.cumplimientoF2}
          brecha={actual.brechaF2}
          cumplimientoAnterior={anterior?.cumplimientoF2}
        />
      </div>

      <div className="evitar-corte rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">Producción total del período</p>
            <p className="text-xs text-muted-foreground">Las dos fases sumadas</p>
          </div>
          <p className={cn('text-3xl font-bold tabular-nums', tono(actual.cumplimientoTotal))}>
            {formatoPorcentaje(actual.cumplimientoTotal, 0)}
          </p>
        </div>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          {formatoM3(actual.productoFinalTotal, 0)} producidos de{' '}
          {formatoM3(actual.capacidadProductoTotal, 0)} posibles · se entregaron{' '}
          {formatoM3(actual.m3Entregados, 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {actual.baseCapacidad === 'habiles'
            ? `Capacidad medida sobre los ${actual.diasHabiles} días hábiles del período, hayan operado o no.`
            : `Capacidad medida solo sobre los ${actual.diasOperados} días en que sí se operó.`}
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
        {veredicto}
      </p>

      {/* Desglose por frente */}
      {actual.porSilice.length > 0 && (
        <div className="evitar-corte overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 pr-4 text-left font-medium">Frente</th>
                <th className="pb-2 pr-4 text-right font-medium">Fase 1 producido</th>
                <th className="pb-2 pr-4 text-right font-medium">Capacidad F1</th>
                <th className="pb-2 pr-4 text-right font-medium">%</th>
                <th className="pb-2 pr-4 text-right font-medium">Fase 2 producido</th>
                <th className="pb-2 pr-4 text-right font-medium">Capacidad F2</th>
                <th className="pb-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {actual.porSilice.map(s => (
                <tr key={s.silice}>
                  <td className="py-2 pr-4 font-medium">{nombreCorto(s.silice)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.productoFase1, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatoM3(s.capacidadProductoF1, 0)}
                  </td>
                  <td className={cn('py-2 pr-4 text-right font-semibold tabular-nums', tono(s.cumplimientoF1))}>
                    {formatoPorcentaje(s.cumplimientoF1, 0)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.productoFase2, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatoM3(s.capacidadProductoF2, 0)}
                  </td>
                  <td className={cn('py-2 text-right font-semibold tabular-nums', tono(s.cumplimientoF2))}>
                    {formatoPorcentaje(s.cumplimientoF2, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SerieProduccion tipoSilice={tipoSilice} baseCapacidad={actual.baseCapacidad} />

      {/* Sábados, aparte porque la jornada es de 4 h y no de 7,5 h */}
      <div className="evitar-corte rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Los sábados, aparte</p>
            <p className="text-xs text-muted-foreground">
              Jornada de 4 horas en vez de 7,5, por eso se analizan por separado
            </p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', tono(actual.cumplimientoSabados))}>
            {actual.sabadosHabiles > 0 ? formatoPorcentaje(actual.cumplimientoSabados, 0) : '—'}
          </p>
        </div>
        {actual.sabadosHabiles === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No hubo sábados en el período.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Sábados operados</p>
              <p className="text-lg font-bold tabular-nums">
                {actual.sabadosOperados} / {actual.sabadosHabiles}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Capacidad de esos sábados</p>
              <p className="text-lg font-bold tabular-nums">
                {formatoM3(actual.capacidadProductoSabados, 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Producido</p>
              <p className="text-lg font-bold tabular-nums">{formatoM3(actual.productoSabados, 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Sin producir</p>
              <p className="text-lg font-bold tabular-nums text-red-600">
                {formatoM3(Math.max(0, actual.capacidadProductoSabados - actual.productoSabados), 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProduccionVsCapacidad;
