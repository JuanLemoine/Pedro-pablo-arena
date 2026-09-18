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

/**
 * Qué tan holgada es la capacidad frente a lo vendido. Que sobre capacidad no
 * es malo en sí —es margen para crecer— pero si las ventas apenas rozan el
 * techo instalado, ahí sí hay un problema de capacidad.
 */
const tono = (veces: number) =>
  veces >= 1.5 ? 'text-green-700' : veces >= 1 ? 'text-amber-700' : 'text-red-600';
const barra = (veces: number) =>
  veces >= 1.5 ? 'bg-green-500' : veces >= 1 ? 'bg-amber-500' : 'bg-red-500';

/**
 * Una capacidad contra el total vendido, que es el punto de referencia: el
 * mismo par de la gráfica "Capacidad de producción frente a lo vendido".
 */
const Capacidad = ({
  encabezado,
  titulo,
  explicacion,
  capacidad,
  vendido,
  vecesAnterior,
}: {
  /** Lo que va arriba en pequeño: "Fase 1", "Fases 1 + 2"… */
  encabezado: string;
  titulo: string;
  explicacion: string;
  capacidad: number;
  /** m³ vendidos en el período: la referencia contra la que se lee todo. */
  vendido: number;
  vecesAnterior?: number;
}) => {
  /** Cuántas veces la capacidad cubre lo vendido. */
  const veces = vendido > 0 ? capacidad / vendido : 0;
  /** Y qué porción de esa capacidad se absorbió con las ventas. */
  const absorbido = capacidad > 0 ? (vendido / capacidad) * 100 : 0;
  const excedente = capacidad - vendido;
  const delta = vecesAnterior !== undefined && vecesAnterior > 0 ? veces - vecesAnterior : null;

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
          <p className={cn('text-3xl font-bold leading-none tabular-nums', tono(veces))}>
            {veces.toLocaleString('es-CO', { maximumFractionDigits: 1 })}×
          </p>
          <p className="text-[11px] text-muted-foreground">lo vendido</p>
          {delta !== null && (
            <p
              className={cn(
                'mt-1 text-[11px] font-medium',
                delta > 0.05 ? 'text-green-600' : delta < -0.05 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {delta > 0 ? '+' : '−'}
              {Math.abs(delta).toLocaleString('es-CO', { maximumFractionDigits: 1 })}× vs. anterior
            </p>
          )}
        </div>
      </div>

      {/* La barra es la capacidad; lo pintado es la parte que se vendió. */}
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-4 rounded-full transition-all', barra(veces))}
          style={{ width: `${Math.min(100, Math.max(0, absorbido))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Las ventas absorbieron el {formatoPorcentaje(absorbido, 0)} de esta capacidad
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Capacidad</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{formatoM3(capacidad, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Total vendido</p>
          <p className="text-sm font-bold tabular-nums text-sky-700">{formatoM3(vendido, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">
            {excedente >= 0 ? 'Capacidad sin vender' : 'Vendido de más'}
          </p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              excedente >= 0 ? 'text-foreground' : 'text-red-600'
            )}
          >
            {formatoM3(Math.abs(excedente), 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

const ProduccionVsCapacidad = ({ actual, anterior, tipoSilice }: Props) => {
  /** El total vendido es la referencia: los m³ de las ventas registradas. */
  const vendido = actual.m3Facturados;
  const vecesF1 = vendido > 0 ? actual.capacidadProductoF1 / vendido : 0;
  const vecesTotal = vendido > 0 ? actual.capacidadProductoTotal / vendido : 0;
  const vecesAnteriorF1 =
    anterior && anterior.m3Facturados > 0
      ? anterior.capacidadProductoF1 / anterior.m3Facturados
      : undefined;
  const vecesAnteriorTotal =
    anterior && anterior.m3Facturados > 0
      ? anterior.capacidadProductoTotal / anterior.m3Facturados
      : undefined;

  const veredicto =
    vendido === 0
      ? 'No hubo ventas registradas en el período, así que no hay referencia contra la cual leer la capacidad.'
      : vecesF1 >= 1
      ? `Solo con la Fase 1 la planta podía producir ${vecesF1.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces lo que se vendió, y sumando el reproceso ${vecesTotal.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces. Quedaron ${formatoM3(actual.capacidadProductoTotal - vendido, 0)} de capacidad sin vender: el límite del negocio hoy está en la demanda, no en la planta.`
      : vecesTotal >= 1
      ? `La Fase 1 sola no daba para cubrir lo vendido (${vecesF1.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces), y solo sumando el reproceso la capacidad alcanza (${vecesTotal.toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces). El negocio depende de la Fase 2 para sostener las ventas.`
      : `Ni con el reproceso la capacidad instalada alcanza para lo que se está vendiendo: faltaron ${formatoM3(vendido - actual.capacidadProductoTotal, 0)}. Se está despachando contra inventario y la planta es el cuello de botella.`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Capacidad
          encabezado="Fase 1"
          titulo="Capacidad Fase 1"
          explicacion="Lo que la planta podía producir sacando arena directa de zaranda, sin reprocesar nada"
          capacidad={actual.capacidadProductoF1}
          vendido={vendido}
          vecesAnterior={vecesAnteriorF1}
        />
        <Capacidad
          encabezado="Fases 1 + 2"
          titulo="Capacidad total"
          explicacion="La de Fase 1 más el 23,1 % que aporta reprocesar el residuo de la zaranda"
          capacidad={actual.capacidadProductoTotal}
          vendido={vendido}
          vecesAnterior={vecesAnteriorTotal}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Es el mismo par de la gráfica de arriba: las dos capacidades contra el total vendido, que
        son los {formatoM3(vendido, 0)} de las ventas registradas, sin la yapa y sin el acopio.
        Aparte de eso se produjo de verdad {formatoM3(actual.productoFinalTotal, 0)} y se llevaron{' '}
        {formatoM3(actual.m3Acopio, 0)} al acopio.{' '}
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
