import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Pickaxe } from 'lucide-react';
import { useMovimientosExcavacion } from '@/hooks/useMovimientosExcavacion';

interface Props {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-slate-500">Movimientos:</span>
        <span className="font-bold text-slate-800">{payload[0].value}</span>
      </div>
    </div>
  );
};

const MovimientosExcavacionChart = ({ tipoSilice, fechaInicio, fechaFin }: Props) => {
  const { data, isLoading, error } = useMovimientosExcavacion({ tipoSilice, fechaInicio, fechaFin });

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
                <p className="font-bold text-emerald-600">{data.totalMovimientos.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Promedio/día</p>
                <p className="font-bold text-blue-600">{data.promedioDia}</p>
              </div>
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
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.dias}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradExcavacion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152,60%,40%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152,60%,40%)" stopOpacity={0.02} />
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

                {/* Línea de promedio */}
                {data.promedioDia > 0 && (
                  <ReferenceLine
                    y={data.promedioDia}
                    stroke="hsl(210,75%,52%)"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Prom. ${data.promedioDia}`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: 'hsl(210,75%,40%)',
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="movimientos"
                  name="Movimientos"
                  stroke="hsl(152,60%,40%)"
                  strokeWidth={2.5}
                  fill="url(#gradExcavacion)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.movimientos) return <g key={props.key} />;
                    const isPico = data.diaPico && payload.fecha === data.diaPico.fecha;
                    return (
                      <circle
                        key={props.key}
                        cx={cx}
                        cy={cy}
                        r={isPico ? 5 : 3}
                        fill={isPico ? 'hsl(142,70%,35%)' : 'hsl(152,60%,40%)'}
                        stroke="white"
                        strokeWidth={isPico ? 2 : 1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
