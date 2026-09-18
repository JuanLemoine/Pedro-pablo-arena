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

/** La meta es cubrir lo entregado: del 100 % para arriba está bien. */
const tono = (pct: number) =>
  pct >= 100 ? 'text-green-700' : pct >= 80 ? 'text-amber-700' : 'text-red-600';
const barra = (pct: number) =>
  pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500';

/** Comparación grande: producido contra lo entregado a clientes. */
const Fase = ({
  encabezado,
  titulo,
  explicacion,
  producido,
  entregado,
  cumplimientoAnterior,
}: {
  /** Lo que va arriba en pequeño: "Fase 1", "Fases 1 + 2"… */
  encabezado: string;
  titulo: string;
  explicacion: string;
  producido: number;
  /** m³ que salieron hacia clientes en el período. */
  entregado: number;
  cumplimientoAnterior?: number;
}) => {
  const cumplimiento = entregado > 0 ? (producido / entregado) * 100 : 0;
  const diferencia = producido - entregado;
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
            {encabezado}
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
          <p className="text-[11px] text-muted-foreground">Entregado en ventas</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{formatoM3(entregado, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">
            {diferencia >= 0 ? 'Sobró' : 'Salió de inventario'}
          </p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              diferencia >= 0 ? 'text-green-700' : 'text-red-600'
            )}
          >
            {formatoM3(Math.abs(diferencia), 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

const ProduccionVsCapacidad = ({ actual, anterior, tipoSilice }: Props) => {
  /** Cuánto de lo despachado a clientes cubrió cada nivel de producción. */
  const cobF1 = actual.m3EntregadoVentas > 0
    ? (actual.productoFase1 / actual.m3EntregadoVentas) * 100
    : 0;
  const cobTotal = actual.m3EntregadoVentas > 0
    ? (actual.productoFinalTotal / actual.m3EntregadoVentas) * 100
    : 0;

  const veredicto =
    actual.m3EntregadoVentas === 0
      ? 'No hubo ventas registradas en el período, así que no hay contra qué comparar la producción.'
      : cobF1 >= 100
      ? `La Fase 1 sola cubrió el ${formatoPorcentaje(cobF1, 0)} de lo despachado: lo que sale directo de la zaranda alcanza para atender la demanda, y todo lo que aporte el reproceso se suma al inventario.`
      : cobTotal >= 100
      ? `La Fase 1 sola no alcanzó (${formatoPorcentaje(cobF1, 0)} de lo despachado), pero con el reproceso la producción llegó al ${formatoPorcentaje(cobTotal, 0)}: la operación depende de la Fase 2 para cubrir las ventas.`
      : `Ni con el reproceso se cubrió lo despachado: la producción acumulada llegó al ${formatoPorcentaje(cobTotal, 0)} y los ${formatoM3(actual.m3EntregadoVentas - actual.productoFinalTotal, 0)} que faltaron salieron del inventario acumulado.`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Fase
          encabezado="Fase 1"
          titulo="Arena directa de zaranda"
          explicacion="67 % de lo que se excava sale como producto sin reprocesar. ¿Alcanza por sí sola para cubrir lo que se despachó?"
          producido={actual.productoFase1}
          entregado={actual.m3EntregadoVentas}
          cumplimientoAnterior={
            anterior && anterior.m3EntregadoVentas > 0
              ? (anterior.productoFase1 / anterior.m3EntregadoVentas) * 100
              : undefined
          }
        />
        <Fase
          encabezado="Fases 1 + 2"
          titulo="Producción acumulada"
          explicacion="La arena directa de zaranda más la recuperada del residuo, contra lo que se despachó a clientes"
          producido={actual.productoFinalTotal}
          entregado={actual.m3EntregadoVentas}
          cumplimientoAnterior={
            anterior && anterior.m3EntregadoVentas > 0
              ? (anterior.productoFinalTotal / anterior.m3EntregadoVentas) * 100
              : undefined
          }
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Las dos barras se miden contra los {formatoM3(actual.m3EntregadoVentas, 0)} que salieron
        hacia clientes, yapa incluida. Al acopio fueron {formatoM3(actual.m3Acopio, 0)} más, que no
        entran en esta comparación. Frente a la capacidad instalada, la producción acumulada llegó
        al {formatoPorcentaje(actual.cumplimientoTotal, 0)} de los{' '}
        {formatoM3(actual.capacidadProductoTotal, 0)} posibles, y el reproceso de Fase 2 aportó{' '}
        {formatoM3(actual.productoFase2, 0)} de una capacidad de{' '}
        {formatoM3(actual.capacidadProductoF2, 0)} ({formatoPorcentaje(actual.cumplimientoF2, 0)}).{' '}
        {actual.baseCapacidad === 'habiles'
          ? `La capacidad se midió sobre los ${actual.diasHabiles} días hábiles del período, hayan operado o no.`
          : `La capacidad se midió solo sobre los ${actual.diasOperados} días en que sí se operó.`}
      </p>

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
