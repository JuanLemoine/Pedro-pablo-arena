import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatoM3, formatoPorcentaje, calcularVariacion } from '@/lib/formato';
import type { MetricasPeriodo } from '@/lib/informe';
import { cn } from '@/lib/utils';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo | null;
}

interface TooltipDiaProps {
  active?: boolean;
  label?: string;
  payload?: { payload?: { m3: number; promedio: number } }[];
}

const TooltipDia = ({ active, payload, label }: TooltipDiaProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-slate-600">Excavado: {formatoM3(d.m3, 0)}</p>
      <p className="text-slate-500">Promedio del período: {formatoM3(d.promedio, 0)}</p>
    </div>
  );
};

const EstabilidadOperacion = ({ actual, anterior }: Props) => {
  const datos = actual.serieDiaria
    .filter(d => d.operado)
    .map(d => ({
      fecha: format(parseISO(d.fecha), 'd MMM', { locale: es }),
      m3: d.fase1Real,
      promedio: actual.m3PromedioDia,
      // Área de rango [mín, máx]: recharts pinta la banda entre ambos valores.
      banda: [
        Math.max(0, actual.m3PromedioDia - actual.desviacion),
        actual.m3PromedioDia + actual.desviacion,
      ] as [number, number],
    }));

  const varCV = anterior ? calcularVariacion(actual.coefVariacion, anterior.coefVariacion) : null;

  const veredicto =
    actual.diasOperados < 3
      ? 'Hay muy pocos días operados en el período para evaluar la estabilidad.'
      : actual.coefVariacion > 45
      ? 'La producción diaria es muy irregular. Con esta variación no se pueden fijar metas diarias confiables.'
      : actual.coefVariacion > 25
      ? 'La producción diaria tiene una variación moderada. Se puede planear, pero conviene seguir reduciéndola.'
      : 'La producción diaria es estable: la operación es predecible y se le pueden poner metas.';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Promedio por día operado</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatoM3(actual.m3PromedioDia, 0)}</p>
        </div>
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Desviación estándar</p>
          <p className="mt-1 text-xl font-bold tabular-nums">± {formatoM3(actual.desviacion, 0)}</p>
        </div>
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Variación (CV)</p>
          <p
            className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              actual.coefVariacion > 45
                ? 'text-red-600'
                : actual.coefVariacion > 25
                ? 'text-amber-600'
                : 'text-green-700'
            )}
          >
            {formatoPorcentaje(actual.coefVariacion, 0)}
          </p>
          {varCV?.pct !== null && varCV && (
            <p
              className={cn(
                'text-[11px] font-medium',
                varCV.direccion === 'baja' ? 'text-green-600' : varCV.direccion === 'sube' ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {varCV.texto} vs. período anterior
            </p>
          )}
        </div>
        <div className="evitar-corte rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Días operados</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{actual.diasOperados}</p>
          <p className="text-[11px] text-muted-foreground">de {actual.diasHabiles} hábiles</p>
        </div>
      </div>

      {datos.length > 0 ? (
        <div className="evitar-corte space-y-2">
          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(32,80%,50%)]" /> m³ excavados del día
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-[hsl(210,75%,52%)]" /> Promedio del período
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded-sm bg-[hsl(210,75%,52%)]/20" /> Banda de ±1 desviación
            </span>
          </div>
          <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" vertical={false} />
              <XAxis
                dataKey="fecha"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                stroke="hsl(0,0%,50%)"
                interval={Math.max(0, Math.floor(datos.length / 12) - 1)}
              />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(0,0%,50%)" width={44} />
              <Tooltip content={<TooltipDia />} />
              {/* Banda ±1 desviación estándar alrededor del promedio */}
              <Area
                dataKey="banda"
                stroke="none"
                fill="hsl(210,75%,52%)"
                fillOpacity={0.12}
                isAnimationActive={false}
              />
              <Bar dataKey="m3" name="m³ excavados" fill="hsl(32,80%,50%)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <ReferenceLine
                y={actual.m3PromedioDia}
                stroke="hsl(210,75%,52%)"
                strokeDasharray="5 4"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay días con producción registrada en el período.
        </p>
      )}

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
        {veredicto}
      </p>
    </div>
  );
};

export default EstabilidadOperacion;
