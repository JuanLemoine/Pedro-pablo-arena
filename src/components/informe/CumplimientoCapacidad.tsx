import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatoM3, formatoMoneda, formatoPorcentaje } from '@/lib/formato';
import type { MetricasPeriodo } from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
}

const BarraCumplimiento = ({
  etiqueta,
  descripcion,
  pct,
  real,
  referencia,
  color,
}: {
  etiqueta: string;
  descripcion: string;
  pct: number;
  real: number;
  referencia: number;
  color: string;
}) => {
  const ancho = Math.min(100, Math.max(0, pct));
  return (
    <div className="evitar-corte space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{etiqueta}</p>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums text-foreground">
          {formatoPorcentaje(pct, 0)}
        </p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-3 rounded-full transition-all', color)} style={{ width: `${ancho}%` }} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatoM3(real, 0)} de {formatoM3(referencia, 0)}
      </p>
    </div>
  );
};

const nombreCorto = (silice: string) => silice.replace('Silice ', '');

const CumplimientoCapacidad = ({ actual }: Props) => {
  const veredicto =
    actual.m3Optimo === 0
      ? 'No hay tiempos de recorrido registrados en el período, así que no se puede calcular la capacidad instalada.'
      : actual.cumplimientoFlota >= 85 && actual.cumplimientoCapacidad < 70
      ? 'Las volquetas que trabajaron rindieron bien, pero se asignaron menos de las necesarias: la brecha es de asignación de flota, no de ejecución.'
      : actual.cumplimientoFlota < 70
      ? 'Las volquetas asignadas rindieron por debajo de lo que podían: la brecha está en la ejecución (arranque tardío, esperas, paradas), no en la cantidad de volquetas.'
      : 'La operación estuvo cerca de lo que la capacidad instalada permite con los tiempos registrados.';

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <BarraCumplimiento
          etiqueta="Rendimiento de la flota asignada"
          descripcion="¿Las volquetas que trabajaron dieron lo que podían dar?"
          pct={actual.cumplimientoFlota}
          real={actual.fase1}
          referencia={actual.m3FlotaAsignada}
          color="bg-amber-500"
        />
        <BarraCumplimiento
          etiqueta="Uso de la capacidad instalada"
          descripcion="¿Produjimos lo máximo que permite la operación, en los días que se trabajó?"
          pct={actual.cumplimientoCapacidad}
          real={actual.fase1}
          referencia={actual.m3Optimo}
          color="bg-blue-500"
        />
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
        {veredicto}
      </p>

      {/* Desglose por tipo de arena */}
      {actual.porSilice.length > 0 && (
        <div className="evitar-corte overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 pr-4 text-left font-medium">Tipo de arena</th>
                <th className="pb-2 pr-4 text-right font-medium">m³ excavados</th>
                <th className="pb-2 pr-4 text-right font-medium">Producto de zaranda</th>
                <th className="pb-2 text-right font-medium">Producto final entregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {actual.porSilice.map(s => (
                <tr key={s.silice}>
                  <td className="py-2 pr-4 font-medium">{nombreCorto(s.silice)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.fase1, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-amber-700">
                    {formatoM3(s.productoZaranda, 0)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-blue-700">
                    {formatoM3(s.m3Entregados, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendario de operación */}
      <div className="evitar-corte space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Días del período</p>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Operado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-400" /> Hábil sin operar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" /> No hábil
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {actual.serieDiaria.map(d => (
            <div
              key={d.fecha}
              title={`${format(parseISO(d.fecha), "EEEE d 'de' MMMM", { locale: es })} — ${
                !d.esHabil ? 'no hábil' : d.operado ? formatoM3(d.fase1Real, 0) : 'sin operación'
              }`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded text-[10px] font-semibold',
                !d.esHabil
                  ? 'bg-slate-200 text-slate-500'
                  : d.operado
                  ? 'bg-green-500 text-white'
                  : 'bg-red-400 text-white'
              )}
            >
              {format(parseISO(d.fecha), 'd')}
            </div>
          ))}
        </div>

        {actual.diasSinOperar > 0 && (
          <p className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm leading-relaxed text-red-900">
            <strong>{actual.diasSinOperar} día(s) hábiles sin operación.</strong>{' '}
            {actual.m3PerdidosSinOperar > 0 ? (
              <>
                Equivalen a unos {formatoM3(actual.m3PerdidosSinOperar, 0)} que no entraron a zaranda
                ≈ {formatoM3(actual.productoPerdidoSinOperar, 0)} de producto terminado
                {actual.valorPerdidoSinOperar > 0 && <> ({formatoMoneda(actual.valorPerdidoSinOperar)})</>},
                estimados con el ritmo de los días que sí se trabajaron.
              </>
            ) : (
              <>No hubo días operados en el período, así que no hay base para estimar lo que se dejó de producir.</>
            )}{' '}
            La nómina y los equipos se pagan igual esos días.
          </p>
        )}
      </div>
    </div>
  );
};

export default CumplimientoCapacidad;
