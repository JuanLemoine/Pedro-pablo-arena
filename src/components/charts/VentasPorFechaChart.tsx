import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { piezasGrafico } from './marcoGrafico';
import { useVentasPorFecha, type AgrupacionVentas } from '@/hooks/useVentasPorFecha';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';

interface Props {
  filtros: DashboardFiltros;
  /** Sin la tarjeta envolvente, para incrustarla en una sección del informe. */
  sinTarjeta?: boolean;
}

const AGRUPACIONES: { valor: AgrupacionVentas; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
];

const COLOR = { m3: 'hsl(210,75%,55%)', valor: 'hsl(152,60%,38%)' };

const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;
const m3 = (v: number) => `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³`;
/** Los pesos completos no caben en el eje: $12.500.000 se lee "$12,5 M". */
const pesosCorto = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)} k`;
  return `$${v}`;
};

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: {
    payload?: { m3: number; m3Facturado: number; valor: number; valorAnticipo: number; ventas: number };
  }[];
}

const TooltipVentas = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const fila = (t: string, v: string, c?: string) => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-slate-500">{t}</span>
      <span className={`font-semibold tabular-nums ${c ?? ''}`}>{v}</span>
    </div>
  );
  return (
    <div className="min-w-[230px] space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold capitalize text-slate-700">{label}</p>
      {fila('m³ a clientes', m3(d.m3), 'text-blue-700')}
      {fila('· facturados', m3(d.m3Facturado))}
      {fila('· de yapa', m3(d.ventas))}
      {fila('Valor cobrado', pesos(d.valor), 'text-green-700')}
      {d.valorAnticipo > 0 && fila('Contra anticipo', pesos(d.valorAnticipo))}
      {fila('Ventas', d.ventas.toLocaleString('es-CO'))}
      {d.m3 > 0 && fila('Precio por m³ entregado', pesos((d.valor + d.valorAnticipo) / d.m3))}
    </div>
  );
};

/**
 * Ventas por fecha en sus dos unidades a la vez: los m³ como barras contra el
 * eje izquierdo y los pesos como línea contra el derecho. Puestas juntas se ve
 * cuándo se vendió más material y cuándo se vendió más caro.
 */
const VentasPorFechaChart = ({ filtros, sinTarjeta }: Props) => {
  const { Marco, Encabezado, Cuerpo, Titulo, Descripcion } = piezasGrafico(sinTarjeta);
  const [agrupacion, setAgrupacion] = useState<AgrupacionVentas>('dia');
  const { puntos, totalM3, totalM3Facturado, totalValor, totalAnticipo, totalVentas, isLoading, error } =
    useVentasPorFecha(filtros, agrupacion);

  const precioPromedio = totalM3 > 0 ? (totalValor + totalAnticipo) / totalM3 : 0;

  return (
    <Marco className={sinTarjeta ? undefined : 'shadow-card'}>
      <Encabezado>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Titulo className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Ventas por fecha
            </Titulo>
            <Descripcion>
              m³ entregados a clientes y valor cobrado en cada fecha. Los m³ incluyen la yapa de
              1 m³ por despacho; el valor deja por fuera los consumos de anticipo, que ya se
              cobraron antes.
            </Descripcion>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isLoading && puntos.length > 0 && (
              <div className="flex gap-4 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">m³ a clientes</p>
                  <p className="font-bold text-blue-600">{m3(totalM3)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {m3(totalM3Facturado)} facturados · {totalVentas.toLocaleString('es-CO')} venta(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valor cobrado</p>
                  <p className="font-bold text-green-600">{pesos(totalValor)}</p>
                  {totalAnticipo > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      + {pesos(totalAnticipo)} de anticipo
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Precio por m³ entregado</p>
                  <p className="font-bold text-slate-700">{pesos(precioPromedio)}</p>
                </div>
              </div>
            )}
            <Select value={agrupacion} onValueChange={v => setAgrupacion(v as AgrupacionVentas)}>
              <SelectTrigger className="no-print h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGRUPACIONES.map(a => (
                  <SelectItem key={a.valor} value={a.valor}>{a.etiqueta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Encabezado>

      <Cuerpo>
        {error ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-destructive">
            Error al cargar las ventas
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : puntos.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-40" />
            <p className="text-sm">No hay ventas en el período seleccionado</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={puntos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(0,0%,50%)"
                  interval={Math.max(0, Math.floor(puntos.length / 12) - 1)}
                />
                <YAxis
                  yAxisId="m3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={COLOR.m3}
                  width={44}
                  tickFormatter={v => v.toLocaleString('es-CO')}
                />
                <YAxis
                  yAxisId="valor"
                  orientation="right"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={COLOR.valor}
                  width={58}
                  tickFormatter={pesosCorto}
                />
                <Tooltip content={<TooltipVentas />} cursor={{ fill: 'hsl(0,0%,96%)' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  yAxisId="m3"
                  dataKey="m3"
                  name="m³ entregados a clientes"
                  fill={COLOR.m3}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
                <Line
                  yAxisId="valor"
                  type="monotone"
                  dataKey="valor"
                  name="Valor cobrado"
                  stroke={COLOR.valor}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Cuerpo>
    </Marco>
  );
};

export default VentasPorFechaChart;
