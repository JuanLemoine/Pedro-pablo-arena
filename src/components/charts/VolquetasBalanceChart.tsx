import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Truck } from 'lucide-react';
import { useOptimoDiario } from '@/hooks/useOptimoDiario';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  tipoSilice?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

/** "+2 de más", "-1 falta" o "exacto", para leer el balance de una clase. */
const signo = (dif: number): string =>
  dif > 0 ? `${dif} de más` : dif < 0 ? `${Math.abs(dif)} falta(n)` : 'exacto';

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const dif = d.diferencia as number;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1.5 max-w-[300px]">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="flex items-start gap-2">
        <div className="w-2.5 h-2.5 mt-1 rounded-full bg-slate-500 shrink-0" />
        <div className="flex-1">
          <div><span className="text-slate-500">Flota real:</span> <span className="font-bold text-slate-800">{d.wActual}</span></div>
          <div className="text-slate-500 text-[11px]">{d.configActualLabel} · {d.m3Actual} m³</div>
        </div>
      </div>
      <div className="pl-[18px] text-[11px] text-slate-500 space-y-0.5">
        <p>7 m³: {d.nSmallActual} real(es) vs {d.nSmallOptimo} óptima(s) → {signo(d.dif7)}</p>
        {d.nMediumActual > 0 && <p>8 m³: {d.nMediumActual} real(es), el óptimo no la contempla</p>}
        <p>14 m³: {d.nLargeActual} real(es) vs {d.nLargeOptimo} óptima(s) → {signo(d.dif14)}</p>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-2.5 h-2.5 mt-1 rounded-full bg-blue-500 shrink-0" />
        <div className="flex-1">
          <div><span className="text-slate-500">Flota óptima:</span> <span className="font-bold text-slate-800">{d.woRound}</span></div>
          <div className="text-slate-500 text-[11px]">{d.configOptimoLabel} · {d.m3Optimo} m³</div>
        </div>
      </div>
      <div className={`font-semibold ${dif > 0 ? 'text-orange-600' : dif < 0 ? 'text-red-600' : 'text-green-600'}`}>
        {dif > 0 ? `+${dif} de más` : dif < 0 ? `${dif} faltan` : '✓ Exacto'}
      </div>
    </div>
  );
};

const VolquetasBalanceChart = ({ tipoSilice, fechaInicio, fechaFin }: Props) => {
  const now = new Date();
  const rangoInicio = fechaInicio ?? format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const rangoFin = fechaFin ?? format(now, 'yyyy-MM-dd');

  const { data: optimoMap, isLoading } = useOptimoDiario({
    fechaInicio: rangoInicio,
    fechaFin: rangoFin,
    tipoSilice,
  });

  // Sólo días con actividad real (wActual > 0)
  const datos = optimoMap
    ? Array.from(optimoMap.values())
        .filter(d => d.wActual > 0)
        .map(d => ({
          ...d,
          fechaLabel: format(parseISO(d.fecha), 'd MMM', { locale: es }),
          /**
           * El balance separado por tamaño de volqueta. Las tres partes suman
           * exactamente `diferencia`, así que la barra apilada mide lo mismo
           * que antes pero deja ver de qué flota sale el sobrante o el faltante.
           * La de 8 m³ siempre cuenta como sobrante: el óptimo no la contempla.
           */
          dif7: d.nSmallActual - d.nSmallOptimo,
          dif8: d.nMediumActual,
          dif14: d.nLargeActual - d.nLargeOptimo,
        }))
    : [];

  const hayMedianas = datos.some(d => d.dif8 > 0);

  const diasDeMas = datos.filter(d => d.diferencia > 0).length;
  const diasFaltan = datos.filter(d => d.diferencia < 0).length;
  const diasExacto = datos.filter(d => d.diferencia === 0).length;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Balance de volquetas vs óptimo
            </CardTitle>
            <CardDescription>
              Diferencia diaria entre volquetas reales y las necesarias para saturar la excavadora (Wo)
            </CardDescription>
          </div>
          {datos.length > 0 && (
            <div className="flex gap-3 text-xs shrink-0">
              <div className="text-right">
                <p className="text-muted-foreground">De más</p>
                <p className="font-bold text-orange-500">{diasDeMas} días</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Exacto</p>
                <p className="font-bold text-green-600">{diasExacto} días</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Faltan</p>
                <p className="font-bold text-red-500">{diasFaltan} días</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : datos.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Truck className="h-10 w-10 opacity-40" />
            <p className="text-sm">No hay datos de movimientos en el período</p>
          </div>
        ) : (
          <>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-4 text-xs mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(152,60%,40%)' }} />
                Volquetas de 7 m³ (5,5 m³ por viaje)
              </span>
              {hayMedianas && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(38,85%,48%)' }} />
                  Volquetas de 8 m³
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(262,60%,55%)' }} />
                Volqueta de 14 m³
              </span>
              <span className="text-muted-foreground">
                Arriba de la línea sobran volquetas, abajo faltan.
              </span>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={datos}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" vertical={false} />
                  <XAxis
                    dataKey="fechaLabel"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(0,0%,50%)"
                    interval={Math.max(0, Math.floor(datos.length / 10) - 1)}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(0,0%,50%)"
                    allowDecimals={false}
                    width={32}
                    tickFormatter={v => (v > 0 ? `+${v}` : `${v}`)}
                  />
                  <Tooltip content={<TooltipPersonalizado />} />
                  <ReferenceLine y={0} stroke="hsl(0,0%,60%)" strokeWidth={1.5} />
                  {/* Apiladas por tamaño: las tres suman el balance del día. */}
                  <Bar
                    dataKey="dif7"
                    stackId="bal"
                    name="7 m³"
                    fill="hsl(152,60%,40%)"
                    maxBarSize={32}
                  />
                  {hayMedianas && (
                    <Bar
                      dataKey="dif8"
                      stackId="bal"
                      name="8 m³"
                      fill="hsl(38,85%,48%)"
                      maxBarSize={32}
                    />
                  )}
                  <Bar
                    dataKey="dif14"
                    stackId="bal"
                    name="14 m³"
                    fill="hsl(262,60%,55%)"
                    maxBarSize={32}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VolquetasBalanceChart;
