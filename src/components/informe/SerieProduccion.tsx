import { useMemo, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { addMonths, format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatoM3, formatoNumero, formatoPorcentaje } from '@/lib/formato';
import type { BaseCapacidad } from '@/lib/informe';
import {
  useSerieProduccion,
  type Agrupacion,
  type AmbitoSerie,
  type PuntoSerie,
} from '@/hooks/useSerieProduccion';

interface Props {
  /** Sílice seleccionado en los filtros del dashboard, para arrancar alineado. */
  tipoSilice: string;
  baseCapacidad: BaseCapacidad;
}

const AMBITOS: { valor: AmbitoSerie; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Total' },
  { valor: 'Silice A - Peña', etiqueta: 'Peña' },
  { valor: 'Silice B - Pozo', etiqueta: 'Pozo' },
];

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
];

const COLOR = {
  productoF1: 'hsl(32,80%,50%)',
  productoF2: 'hsl(152,55%,42%)',
  capacidadF1: 'hsl(32,55%,84%)',
  capacidadF2: 'hsl(48,85%,66%)',
  entregado: 'hsl(210,75%,52%)',
};

const Fecha = ({ valor, onChange, etiqueta }: { valor: string; onChange: (v: string) => void; etiqueta: string }) => {
  const [abierto, setAbierto] = useState(false);
  const d = valor ? parseISO(valor) : undefined;
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start gap-1.5 text-xs font-normal">
          <CalendarIcon className="h-3 w-3 shrink-0" />
          {d ? format(d, 'd MMM yy', { locale: es }) : etiqueta}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={d}
          onSelect={x => { if (x) { onChange(format(x, 'yyyy-MM-dd')); setAbierto(false); } }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

interface TooltipProps { active?: boolean; label?: string; payload?: { payload?: PuntoSerie }[] }

const TooltipPunto = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const fila = (t: string, v: string, c?: string) => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-slate-500">{t}</span>
      <span className={cn('font-semibold tabular-nums', c)}>{v}</span>
    </div>
  );
  return (
    <div className="min-w-[250px] space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold capitalize text-slate-700">{label}</p>
      {fila('Producido Fase 1', formatoM3(d.productoF1, 0), 'text-amber-700')}
      {fila('Capacidad Fase 1', formatoM3(d.capacidadF1, 0))}
      {fila('Cumplimiento F1', formatoPorcentaje(d.cumplimientoF1, 0), 'text-amber-700')}
      <div className="my-1 border-t border-slate-100" />
      {fila('Producido Fase 2', formatoM3(d.productoF2, 0), 'text-green-700')}
      {fila('Capacidad Fase 2', formatoM3(d.capacidadF2, 0))}
      {fila('Cumplimiento F2', formatoPorcentaje(d.cumplimientoF2, 0), 'text-green-700')}
      <div className="my-1 border-t border-slate-100" />
      {fila('Entregado', formatoM3(d.entregado, 0), 'text-blue-700')}
      {d.sinRegistros && (
        <p className="pt-1 text-[11px] font-medium text-red-600">
          Sin movimientos registrados en este tramo
        </p>
      )}
    </div>
  );
};

/**
 * Producción contra capacidad a lo largo del tiempo, con rango, agrupación y
 * filtros propios para poder mirar el mismo análisis desde distintos ángulos.
 */
const SerieProduccion = ({ tipoSilice, baseCapacidad }: Props) => {
  const hoy = new Date();
  const [inicio, setInicio] = useState(format(startOfMonth(addMonths(hoy, -11)), 'yyyy-MM-dd'));
  const [fin, setFin] = useState(format(endOfMonth(hoy), 'yyyy-MM-dd'));
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('mes');
  const [mina, setMina] = useState<string>('todas');
  const [ambito, setAmbito] = useState<AmbitoSerie>(
    tipoSilice === 'Silice A - Peña' || tipoSilice === 'Silice B - Pozo' ? tipoSilice : 'todos'
  );

  const filtros = useMemo(
    () => ({ inicio, fin, ambito, agrupacion, mina: mina === 'todas' ? undefined : mina, baseCapacidad }),
    [inicio, fin, ambito, agrupacion, mina, baseCapacidad]
  );
  const { puntos, minas, isLoading } = useSerieProduccion(filtros);
  const hayDatos = puntos.some(p => p.productoTotal > 0 || p.entregado > 0);
  const tramosSinRegistro = puntos.filter(p => p.sinRegistros && p.capacidadF1 > 0).length;

  return (
    <div className="evitar-corte space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Producción y entregas frente a la capacidad
          </p>
          <p className="text-xs text-muted-foreground">
            En m³ de producto ·{' '}
            {baseCapacidad === 'habiles'
              ? 'capacidad sobre todos los días hábiles'
              : 'capacidad solo sobre los días operados'}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Fecha valor={inicio} onChange={setInicio} etiqueta="Desde" />
          <Fecha valor={fin} onChange={setFin} etiqueta="Hasta" />

          <Select value={agrupacion} onValueChange={v => setAgrupacion(v as Agrupacion)}>
            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AGRUPACIONES.map(a => (
                <SelectItem key={a.valor} value={a.valor}>{a.etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {minas.length > 0 && (
            <Select value={mina} onValueChange={setMina}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las minas</SelectItem>
                {minas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-lg border border-border p-0.5">
            {AMBITOS.map(a => (
              <button
                key={a.valor}
                onClick={() => setAmbito(a.valor)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  ambito === a.valor
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : !hayDatos ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay producción ni entregas registradas en el rango seleccionado.
        </p>
      ) : (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={puntos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,92%)" vertical={false} />
              <XAxis
                dataKey="etiqueta"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                stroke="hsl(0,0%,50%)"
                interval={Math.max(0, Math.floor(puntos.length / 14) - 1)}
              />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(0,0%,50%)" width={52} tickFormatter={v => formatoNumero(v)} />
              <Tooltip content={<TooltipPunto />} cursor={{ fill: 'hsl(0,0%,96%)' }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="capacidadF1" name="Capacidad Fase 1" fill={COLOR.capacidadF1} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="productoF1" name="Producido Fase 1" fill={COLOR.productoF1} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="capacidadF2" name="Capacidad Fase 2" fill={COLOR.capacidadF2} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="productoF2" name="Producido Fase 2" fill={COLOR.productoF2} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Line dataKey="entregado" name="Entregado" stroke={COLOR.entregado} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Las barras claras son la capacidad de cada fase y las oscuras lo producido: la diferencia es
        lo que se dejó de producir. La línea azul es lo entregado a clientes.
        {mina !== 'todas' && ' El filtro de mina aplica a la producción; la capacidad es por ruta y no se filtra por mina, así que el porcentaje de un solo frente no es comparable con el total.'}
        {tramosSinRegistro > 0 &&
          ` ${tramosSinRegistro} tramo(s) del rango no tienen ningún movimiento registrado: ahí el 0 % puede ser falta de registro y no falta de producción.`}
      </p>
    </div>
  );
};

export default SerieProduccion;
