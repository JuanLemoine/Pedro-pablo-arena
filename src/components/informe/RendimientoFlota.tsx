import { cn } from '@/lib/utils';
import { formatoM3, formatoNumero } from '@/lib/formato';
import { VOLQUETAS_OPTIMAS_POR_RUTA, type MetricasPeriodo } from '@/lib/informe';
import { getInventarioVolquetas } from '@/lib/volquetas';

interface Props {
  actual: MetricasPeriodo;
}

/** Inventario completo de la flota, agrupado por capacidad real (7 / 8 / 13 m³). */
const InventarioFlota = ({ actual }: Props) => {
  const { grupos, total } = getInventarioVolquetas();
  const enFase1 = new Set(actual.porPlaca.map(p => p.placa.toUpperCase()));
  const conActividad = new Set(actual.placasConActividad);

  return (
    <div className="evitar-corte space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Inventario de la flota ({total} volquetas)
        </p>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Movió material (Fase 1)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> Solo acopio u otra fase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" /> Sin registros
          </span>
        </div>
      </div>

      {grupos.map(g => {
        const activasFase1 = g.placas.filter(p => enFase1.has(p)).length;
        return (
          <div key={g.capacidad} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {formatoNumero(g.capacidad, 1)} m³ — {g.total} volqueta(s) · {activasFase1} con
              movimientos de Fase 1 en el período
            </p>
            <div className="flex flex-wrap gap-1">
              {g.placas.map(p => (
                <span
                  key={p}
                  title={
                    enFase1.has(p)
                      ? 'Movió material desde el punto de excavación'
                      : conActividad.has(p)
                      ? 'Tiene registros de acopio u otra fase, pero no de Fase 1'
                      : 'Sin ningún registro en el período'
                  }
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[11px] tracking-wider',
                    enFase1.has(p)
                      ? 'bg-green-500 text-white'
                      : conActividad.has(p)
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        La capacidad sale de <code>CAPACIDAD_VOLQUETAS</code> en <code>src/lib/volquetas.ts</code>.
        Si una placa nueva no aparece aquí, hay que registrarla ahí con sus m³.
      </p>
    </div>
  );
};

const RendimientoFlota = ({ actual }: Props) => {
  const placas = actual.porPlaca;
  const activas = placas.filter(p => p.diasActivos > 0);
  // El "mejor rendimiento" es por m³ por día activo, no por volumen total:
  // una volqueta que trabajó todos los días mueve más sin rendir más.
  const mejor = activas.reduce<typeof activas[number] | undefined>(
    (best, p) => (!best || p.m3PorDia > best.m3PorDia ? p : best),
    undefined
  );
  const promedio = activas.length
    ? activas.reduce((s, p) => s + p.m3PorDia, 0) / activas.length
    : 0;

  if (placas.length === 0) {
    return (
      <div className="space-y-4">
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay movimientos de Fase 1 registrados en el período.
        </p>
        <InventarioFlota actual={actual} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Volquetas que trabajaron</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{placas.length}</p>
        </div>
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Rendimiento promedio</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatoM3(promedio, 1)}</p>
          <p className="text-[11px] text-muted-foreground">por volqueta y día activo</p>
        </div>
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Mejor rendimiento</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{mejor ? mejor.placa : '—'}</p>
          <p className="text-[11px] text-muted-foreground">
            {mejor ? `${formatoM3(mejor.m3PorDia, 1)} por día activo` : 'sin datos'}
          </p>
        </div>
        <div
          className={cn(
            'evitar-corte rounded-lg border p-3',
            actual.diasExcesoFlota > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-border bg-muted/30'
          )}
        >
          <p className="text-xs text-muted-foreground">Jornadas con exceso de flota</p>
          <p
            className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              actual.diasExcesoFlota > 0 && 'text-amber-700'
            )}
          >
            {actual.diasExcesoFlota}
          </p>
          <p className="text-[11px] text-muted-foreground">
            más de {VOLQUETAS_OPTIMAS_POR_RUTA} volquetas en una misma ruta
          </p>
        </div>
      </div>

      <div className="evitar-corte overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pr-4 text-left font-medium">Placa</th>
              <th className="pb-2 pr-4 text-right font-medium">Capacidad</th>
              <th className="pb-2 pr-4 text-right font-medium">Días activos</th>
              <th className="pb-2 pr-4 text-right font-medium">Viajes</th>
              <th className="pb-2 pr-4 text-right font-medium">m³ excavados</th>
              <th className="pb-2 text-right font-medium">m³ por día</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {placas.map(p => (
              <tr key={p.placa} className="hover:bg-muted/30">
                <td className="py-2 pr-4 font-mono text-xs font-medium tracking-widest">{p.placa}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                  {formatoNumero(p.capacidad, 1)} m³
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{p.diasActivos}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatoNumero(p.viajes)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(p.m3Fase1, 0)}</td>
                <td
                  className={cn(
                    'py-2 text-right font-semibold tabular-nums',
                    promedio > 0 && p.m3PorDia < promedio * 0.7 ? 'text-red-600' : 'text-foreground'
                  )}
                >
                  {formatoM3(p.m3PorDia, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        El rendimiento se mide en m³ por día activo, no en viajes: una volqueta de 13 m³ hace menos
        viajes que una de 7 m³ y aun así mueve más material. En rojo, las que rinden menos del 70 %
        del promedio de la flota.
      </p>

      <InventarioFlota actual={actual} />
    </div>
  );
};

export default RendimientoFlota;
