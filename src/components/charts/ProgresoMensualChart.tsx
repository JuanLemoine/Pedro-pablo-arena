import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useProgresoMensual } from '@/hooks/useProgresoMensual';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-medium text-slate-800">
            {entry.value != null
              ? `${Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 1 })} m³`
              : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProgresoMensualChart = () => {
  const { data, isLoading, error } = useProgresoMensual();

  const mesActual = format(new Date(), 'MMMM yyyy', { locale: es });

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-center text-destructive text-sm">
          Error al cargar proyección mensual
        </CardContent>
      </Card>
    );
  }

  const getBadgeVariant = (pct: number) => {
    if (pct >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (pct >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getStatusIcon = (pct: number) => {
    if (pct >= 90) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (pct >= 60) return <TrendingUp className="h-4 w-4 text-amber-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Progreso vs Meta Mensual
            </CardTitle>
            <CardDescription>
              Producción acumulada en {mesActual} vs la simulación objetivo
            </CardDescription>
          </div>
          {!isLoading && data && (
            <Badge
              variant="outline"
              className={cn('flex items-center gap-1.5 px-3 py-1', getBadgeVariant(data.porcentajeAvance))}
            >
              {getStatusIcon(data.porcentajeAvance)}
              {data.porcentajeAvance.toFixed(1)}% de la meta
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ) : data ? (
          <>
            {/* KPIs rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-600 mb-0.5">Producido hoy</p>
                <p className="text-xl font-bold text-amber-800">
                  {data.acumuladoReal.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
                <p className="text-xs text-amber-500">en {data.diasTranscurridos} días</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 mb-0.5">Ritmo diario</p>
                <p className="text-xl font-bold text-blue-800">
                  {data.promedioM3Dia.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
                <p className="text-xs text-blue-500">promedio / día</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-600 mb-0.5">Proyección cierre</p>
                <p className="text-xl font-bold text-purple-800">
                  {data.proyeccionCierre.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                </p>
                <p className="text-xs text-purple-500">al ritmo actual</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                <p className="text-xs text-green-600 mb-0.5">Meta simulación</p>
                <p className="text-xl font-bold text-green-800">
                  {data.targetMes.toLocaleString(undefined, { maximumFractionDigits: 0 })} m³
                </p>
                <p className="text-xs text-green-500">objetivo mensual</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Avance del mes ({data.diasTranscurridos}/{data.diasTotales} días)</span>
                <span className="font-semibold text-foreground">{data.porcentajeAvance.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(data.porcentajeAvance, 100)} className="h-2.5" />
            </div>

            {/* Gráfica acumulada */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.dias}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(32,80%,50%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(32,80%,50%)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradProyectado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(255,70%,60%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(255,70%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,94%)" vertical={false} />
                  <XAxis
                    dataKey="fechaLabel"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(30,15%,50%)"
                    interval={Math.floor(data.dias.length / 7)}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(30,15%,50%)"
                    tickFormatter={v => `${v}`}
                    width={42}
                  />
                  <Tooltip content={<TooltipPersonalizado />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 12, fontSize: 11 }}
                  />

                  {/* Meta de la simulación (línea verde punteada) */}
                  <Line
                    dataKey="metaAcumulada"
                    name="Meta simulación"
                    stroke="hsl(142,70%,40%)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />

                  {/* Proyección al ritmo actual (línea morada punteada) */}
                  <Area
                    dataKey="proyectado"
                    name="Proyección cierre"
                    stroke="hsl(255,70%,60%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#gradProyectado)"
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />

                  {/* Producción real acumulada (área sólida) */}
                  <Area
                    dataKey="acumuladoReal"
                    name="Producción real"
                    stroke="hsl(32,80%,50%)"
                    strokeWidth={2.5}
                    fill="url(#gradReal)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    connectNulls={false}
                  />

                  {/* Línea vertical "hoy" */}
                  <ReferenceLine
                    x={data.dias[data.diasTranscurridos - 1]?.fechaLabel}
                    stroke="hsl(220,14%,70%)"
                    strokeDasharray="3 3"
                    label={{ value: 'Hoy', position: 'top', fontSize: 10, fill: 'hsl(220,14%,50%)' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ProgresoMensualChart;
