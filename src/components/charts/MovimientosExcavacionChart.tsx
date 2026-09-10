import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Pickaxe } from 'lucide-react';
import { useMovimientosExcavacion } from '@/hooks/useMovimientosExcavacion';
import { useOptimoDiario, totalizarOptimo } from '@/hooks/useOptimoDiario';
import { format } from 'date-fns';

interface Props {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const optimo = payload.find((p: any) => p.dataKey === 'optimo');
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1.5 max-w-[300px]">
      <p className="font-semibold text-slate-700">{label}</p>
      {d && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500">Movimientos reales:</span>
          <span className="font-bold text-slate-800">{d.movimientos}</span>
        </div>
      )}
      {d && (d.mov7 > 0 || d.mov8 > 0 || d.mov14 > 0) && (
        <div className="pl-[18px] text-[11px] text-slate-500 space-y-0.5">
          {d.mov14 > 0 && <p>{d.mov14} de la volqueta de 14 m³</p>}
          {d.mov8 > 0 && <p>{d.mov8} de volquetas de 8 m³</p>}
          {d.mov7 > 0 && <p>{d.mov7} de volquetas de 7 m³ (5,5 m³/viaje)</p>}
        </div>
      )}
      {d?.configActualLabel && d.configActualLabel !== '—' && (
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-slate-400 shrink-0" />
          <div>
            <div className="text-slate-500">Flota usada: <span className="font-semibold text-slate-700">{d.configActualLabel}</span></div>
            <div className="text-slate-500 text-[11px]">Haría {d.viajesActual} viajes</div>
          </div>
        </div>
      )}
      {optimo && optimo.value > 0 && (
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-blue-500 shrink-0" />
          <div>
            <div><span className="text-slate-500">Óptimo:</span> <span className="font-bold text-slate-800">{optimo.value} viajes</span></div>
            <div className="text-slate-500 text-[11px]">Config ideal: {d?.configOptimoLabel ?? '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const MovimientosExcavacionChart = ({ tipoSilice, fechaInicio, fechaFin }: Props) => {
  const { data, isLoading, error } = useMovimientosExcavacion({ tipoSilice, fechaInicio, fechaFin });

  const now = new Date();
  const rangoInicio = fechaInicio ?? format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const rangoFin = fechaFin ?? format(now, 'yyyy-MM-dd');
  const { data: optimoMap } = useOptimoDiario({
    fechaInicio: rangoInicio,
    fechaFin: rangoFin,
    tipoSilice,
  });

  const diasConOptimo = (data?.dias ?? []).map(d => {
    const o = optimoMap?.get(d.fecha);
    return {
      ...d,
      optimo: o?.viajesOptimo ?? 0,
      configOptimoLabel: o?.configOptimoLabel ?? '—',
      configActualLabel: o?.configActualLabel ?? '—',
      viajesActual: o?.viajesActual ?? 0,
    };
  });

  /**
   * Óptimo del período: la suma de TODOS los días de lunes a viernes del rango
   * filtrado, no solo la de los días con movimientos. Un día L-V sin operar es
   * capacidad perdida y debe pesar en el cumplimiento; el sábado no cuenta.
   */
  const totalOptimo = totalizarOptimo(optimoMap);
  const cumplimiento = totalOptimo.viajesOptimo > 0
    ? ((data?.totalMovimientos ?? 0) / totalOptimo.viajesOptimo) * 100
    : 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Pickaxe className="h-5 w-5 text-primary" />
              Movimientos desde Punto de Excavación
            </CardTitle>
            <CardDescription>
              Cantidad de movimientos diarios con origen en el punto de excavación
            </CardDescription>
          </div>
          {!isLoading && data && data.dias.length > 0 && (
            <div className="flex gap-4 text-sm shrink-0">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-emerald-600">{data.totalMovimientos.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.total7.toLocaleString('es-CO')} de 7 m³
                  {data.total8 > 0 && ` · ${data.total8.toLocaleString('es-CO')} de 8 m³`}
                  {` · ${data.total14.toLocaleString('es-CO')} de 14 m³`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Óptimo · {totalOptimo.diasLV} día(s) L-V
                </p>
                <p className="font-bold text-blue-600">
                  {totalOptimo.viajesOptimo.toLocaleString('es-CO')}
                </p>
                <p className="text-[10px] text-muted-foreground">{totalOptimo.viajesPorDia}/día</p>
              </div>
              {totalOptimo.viajesOptimo > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Cumplimiento</p>
                  <p className="font-bold text-slate-700">
                    {cumplimiento.toLocaleString('es-CO', { maximumFractionDigits: 0 })}%
                  </p>
                </div>
              )}
              {data.diaPico && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Pico</p>
                  <p className="font-bold text-green-600">{data.diaPico.movimientos}</p>
                  <p className="text-[10px] text-muted-foreground">{data.diaPico.fechaLabel}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="h-[300px] flex items-center justify-center text-destructive text-sm">
            Error al cargar datos
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data && data.dias.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-4 text-xs mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(152,60%,40%)' }} />
                Volquetas de 7 m³ (5,5 m³ por viaje)
              </span>
              {data.total8 > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(38,85%,48%)' }} />
                  Volquetas de 8 m³
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(262,60%,55%)' }} />
                Volqueta de 14 m³
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: 'hsl(210,75%,52%)' }} />
                Óptimo
              </span>
            </div>
            <div className="h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={diasConOptimo}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradPeq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152,60%,40%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(152,60%,40%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradMed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38,85%,48%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(38,85%,48%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradGrande" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262,60%,55%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(262,60%,55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,20%,92%)" vertical={false} />
                <XAxis
                  dataKey="fechaLabel"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(150,10%,50%)"
                  interval={Math.max(0, Math.floor(data.dias.length / 10) - 1)}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(150,10%,50%)"
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip content={<TooltipPersonalizado />} />

                {/* Línea de óptimo diario según simulador */}
                <Line
                  type="monotone"
                  dataKey="optimo"
                  name="Óptimo"
                  stroke="hsl(210,75%,52%)"
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'white', fill: 'hsl(210,75%,52%)' }}
                  isAnimationActive={false}
                  connectNulls
                />

                {/* Apiladas por tamaño de volqueta: el alto total sigue siendo
                    el mismo número de movimientos del día. */}
                <Area
                  type="monotone"
                  stackId="flota"
                  dataKey="mov7"
                  name="7 m³ (5,5 m³/viaje)"
                  stroke="hsl(152,60%,40%)"
                  strokeWidth={2}
                  fill="url(#gradPeq)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
                />
                {data.total8 > 0 && (
                  <Area
                    type="monotone"
                    stackId="flota"
                    dataKey="mov8"
                    name="8 m³"
                    stroke="hsl(38,85%,48%)"
                    strokeWidth={2}
                    fill="url(#gradMed)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
                  />
                )}
                <Area
                  type="monotone"
                  stackId="flota"
                  dataKey="mov14"
                  name="14 m³"
                  stroke="hsl(262,60%,55%)"
                  strokeWidth={2}
                  fill="url(#gradGrande)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'white' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Pickaxe className="h-10 w-10 opacity-40" />
            <p className="text-sm">No hay movimientos desde punto de excavación en este período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MovimientosExcavacionChart;
