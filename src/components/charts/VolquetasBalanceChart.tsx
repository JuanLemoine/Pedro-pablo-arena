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
  Cell,
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

const TooltipPersonalizado = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const dif = d.diferencia as number;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1.5">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
        <span className="text-slate-500">Volquetas reales:</span>
        <span className="font-bold text-slate-800">{d.wActual}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="text-slate-500">Wo (óptimo):</span>
        <span className="font-bold text-slate-800">{d.woOptimo} → mín. {d.woRound}</span>
      </div>
      <div className={`flex items-center gap-2 font-semibold ${dif > 0 ? 'text-orange-600' : dif < 0 ? 'text-red-600' : 'text-green-600'}`}>
        <span>{dif > 0 ? `+${dif} de más` : dif < 0 ? `${dif} faltan` : '✓ Exacto'}</span>
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
        }))
    : [];

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
            <div className="flex gap-4 text-xs mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />
                De más
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                Faltan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
                Exacto
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
                  <Bar dataKey="diferencia" name="Balance" radius={[3, 3, 0, 0]} maxBarSize={32}>
                    {datos.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.diferencia > 0
                            ? 'hsl(30,90%,60%)'   // naranja — de más
                            : entry.diferencia < 0
                            ? 'hsl(0,72%,56%)'    // rojo — faltan
                            : 'hsl(142,60%,45%)'  // verde — exacto
                        }
                      />
                    ))}
                  </Bar>
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
