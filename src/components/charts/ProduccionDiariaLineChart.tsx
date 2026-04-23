import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useProduccionVentas } from '@/hooks/useProduccionVentas';
import { useOptimoDiario } from '@/hooks/useOptimoDiario';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const producido = payload.find((p: any) => p.dataKey === 'producido');
  const optimo = payload.find((p: any) => p.dataKey === 'optimo');
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      {producido && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-500">Producido:</span>
          <span className="font-bold text-slate-800">
            {Number(producido.value).toLocaleString(undefined, { maximumFractionDigits: 2 })} m³
          </span>
        </div>
      )}
      {optimo && optimo.value > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Óptimo (simulador):</span>
          <span className="font-bold text-slate-800">
            {Number(optimo.value).toLocaleString(undefined, { maximumFractionDigits: 2 })} m³
          </span>
        </div>
      )}
    </div>
  );
};

const ProduccionDiariaLineChart = ({ tipoSilice = 'todos', fechaInicio, fechaFin }: Props) => {
  const parsedInicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : undefined;
  const parsedFin = fechaFin ? new Date(fechaFin + 'T00:00:00') : undefined;

  const { data, isLoading, error } = useProduccionVentas({
    agrupacion: 'diario',
    tipoSilice: tipoSilice as 'todos' | 'Silice A - Peña' | 'Silice B - Pozo',
    fechaInicio: parsedInicio,
    fechaFin: parsedFin,
  });

  // Rango para el hook de óptimo (coincide con el del dashboard)
  const rangoInicio = fechaInicio ?? format(parsedInicio ?? subDays(new Date(), 14), 'yyyy-MM-dd');
  const rangoFin = fechaFin ?? format(parsedFin ?? new Date(), 'yyyy-MM-dd');
  const { data: optimoMap } = useOptimoDiario({
    fechaInicio: rangoInicio,
    fechaFin: rangoFin,
    tipoSilice,
  });

  // Fusionar óptimo con datos por fecha
  const datosConOptimo = (data?.datos ?? []).map(d => ({
    ...d,
    optimo: optimoMap?.get(d.fecha)?.m3Optimo ?? 0,
  }));

  // Promedio del óptimo (sólo días con óptimo > 0)
  const diasOptimo = datosConOptimo.filter(d => d.optimo > 0);
  const optimoPromedio = diasOptimo.length > 0
    ? diasOptimo.reduce((s, d) => s + d.optimo, 0) / diasOptimo.length
    : 0;

  // Máximo del período
  const maximo = data ? Math.max(...data.datos.map(d => d.producido)) : 0;
  const diaPico = data?.datos.find(d => d.producido === maximo);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Producción Diaria de Arena
            </CardTitle>
            <CardDescription>
              m³ producidos por día en el período seleccionado
            </CardDescription>
          </div>
          {!isLoading && data && data.datos.length > 0 && (
            <div className="flex gap-4 text-sm shrink-0">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-amber-600">
                  {data.totalProducido.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Óptimo prom./día</p>
                <p className="font-bold text-blue-600">
                  {optimoPromedio.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
              </div>
              {diaPico && maximo > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Pico</p>
                  <p className="font-bold text-green-600">
                    {maximo.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                  </p>
                  <p className="text-[10px] text-muted-foreground">{diaPico.fechaLabel}</p>
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
        ) : data && data.datos.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={datosConOptimo}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradProduccion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(32,80%,50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(32,80%,50%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,92%)" vertical={false} />
                <XAxis
                  dataKey="fechaLabel"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(30,15%,50%)"
                  interval={Math.max(0, Math.floor(data.datos.length / 10) - 1)}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(30,15%,50%)"
                  tickFormatter={v => `${v}`}
                  width={42}
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

                <Area
                  type="monotone"
                  dataKey="producido"
                  name="Producido"
                  stroke="hsl(32,80%,50%)"
                  strokeWidth={2.5}
                  fill="url(#gradProduccion)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.producido) return <g key={props.key} />;
                    const isPico = payload.producido === maximo && maximo > 0;
                    return (
                      <circle
                        key={props.key}
                        cx={cx}
                        cy={cy}
                        r={isPico ? 5 : 3}
                        fill={isPico ? 'hsl(142,70%,40%)' : 'hsl(32,80%,50%)'}
                        stroke="white"
                        strokeWidth={isPico ? 2 : 1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <TrendingUp className="h-10 w-10 opacity-40" />
            <p className="text-sm">No hay datos de producción en el período seleccionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduccionDiariaLineChart;
