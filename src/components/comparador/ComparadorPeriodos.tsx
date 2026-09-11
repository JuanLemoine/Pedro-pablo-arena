import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftRight, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import FechaPicker from '@/components/FechaPicker';
import { useDashboardResumen, type DashboardFiltros } from '@/hooks/useDashboardResumen';
import { useOptimoDiario, totalizarOptimo } from '@/hooks/useOptimoDiario';
import { calcularVariacion, esBuenaNoticia, type Sentido } from '@/lib/formato';
import {
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  /** Qué métricas se comparan. */
  seccion: 'comercial' | 'produccion';
  /**
   * Filtros del dashboard. Solo se heredan sílice, transacción y fuente: las
   * fechas las manda el comparador, que para eso tiene las suyas.
   */
  filtros: DashboardFiltros;
}

interface Rango {
  inicio: string;
  fin: string;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** "1 – 31 de agosto de 2026", o con los dos meses si el rango los cruza. */
const etiquetaRango = ({ inicio, fin }: Rango): string => {
  const a = parseISO(inicio);
  const b = parseISO(fin);
  if (format(a, 'yyyy-MM') === format(b, 'yyyy-MM')) {
    return `${format(a, 'd', { locale: es })} – ${format(b, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  }
  return `${format(a, "d MMM yyyy", { locale: es })} – ${format(b, 'd MMM yyyy', { locale: es })}`;
};

interface Metrica {
  clave: string;
  /** Cómo se lee un valor ya calculado. */
  formato: (v: number) => string;
  sentido: Sentido;
  /** Sangrada bajo la métrica anterior, como detalle suyo. */
  detalle?: boolean;
}

/** Datos de un período, ya reducidos a los números que se comparan. */
type Valores = Record<string, number>;

const FlechaVariacion = ({ bueno, direccion }: { bueno: boolean | null; direccion: string }) => {
  if (direccion === 'sinDato') return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (direccion === 'igual') return <Minus className="h-3 w-3 text-muted-foreground" />;
  const Icono = direccion === 'sube' ? ArrowUp : ArrowDown;
  return (
    <Icono
      className={cn(
        'h-3 w-3',
        bueno === null ? 'text-muted-foreground' : bueno ? 'text-green-600' : 'text-red-600'
      )}
    />
  );
};

const ComparadorPeriodos = ({ seccion, filtros }: Props) => {
  /** Período A: arranca con el rango que tengan los filtros del dashboard. */
  const [rangoA, setRangoA] = useState<Rango>({
    inicio: filtros.fechaInicio,
    fin: filtros.fechaFin,
  });
  /** Período B: por defecto, el mismo rango del año pasado. */
  const [rangoB, setRangoB] = useState<Rango>({
    inicio: iso(addYears(parseISO(filtros.fechaInicio), -1)),
    fin: iso(addYears(parseISO(filtros.fechaFin), -1)),
  });

  /** Atajos que mueven el período B relativo al A. */
  const atajos = useMemo(
    () => [
      {
        etiqueta: 'Mismo rango, año anterior',
        aplicar: () =>
          setRangoB({
            inicio: iso(addYears(parseISO(rangoA.inicio), -1)),
            fin: iso(addYears(parseISO(rangoA.fin), -1)),
          }),
      },
      {
        etiqueta: 'Mismo rango, mes anterior',
        aplicar: () =>
          setRangoB({
            inicio: iso(subMonths(parseISO(rangoA.inicio), 1)),
            fin: iso(subMonths(parseISO(rangoA.fin), 1)),
          }),
      },
      {
        etiqueta: 'Período inmediatamente anterior',
        aplicar: () => {
          const dias = differenceInCalendarDays(parseISO(rangoA.fin), parseISO(rangoA.inicio)) + 1;
          const fin = subDays(parseISO(rangoA.inicio), 1);
          setRangoB({ inicio: iso(subDays(fin, dias - 1)), fin: iso(fin) });
        },
      },
      {
        etiqueta: 'Mes completo de A',
        aplicar: () => {
          const base = parseISO(rangoA.inicio);
          setRangoA({ inicio: iso(startOfMonth(base)), fin: iso(endOfMonth(base)) });
          const previo = addYears(base, -1);
          setRangoB({ inicio: iso(startOfMonth(previo)), fin: iso(endOfMonth(previo)) });
        },
      },
    ],
    [rangoA]
  );

  const filtrosA: DashboardFiltros = { ...filtros, fechaInicio: rangoA.inicio, fechaFin: rangoA.fin };
  const filtrosB: DashboardFiltros = { ...filtros, fechaInicio: rangoB.inicio, fechaFin: rangoB.fin };

  const { data: resA, isLoading: cargandoA } = useDashboardResumen(filtrosA);
  const { data: resB, isLoading: cargandoB } = useDashboardResumen(filtrosB);

  const esProduccion = seccion === 'produccion';
  const { data: optimoA } = useOptimoDiario({
    fechaInicio: rangoA.inicio,
    fechaFin: rangoA.fin,
    tipoSilice: filtros.tipoSilice,
  });
  const { data: optimoB } = useOptimoDiario({
    fechaInicio: rangoB.inicio,
    fechaFin: rangoB.fin,
    tipoSilice: filtros.tipoSilice,
  });

  const metricas: Metrica[] = esProduccion
    ? [
        { clave: 'Movimientos', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor' },
        { clave: 'm³ producidos', formato: m3, sentido: 'masEsMejor' },
        { clave: 'm³ Fase 1', formato: m3, sentido: 'masEsMejor', detalle: true },
        { clave: 'Viajes Fase 1', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor', detalle: true },
        { clave: 'm³ Fase 2', formato: m3, sentido: 'masEsMejor', detalle: true },
        { clave: 'Viajes Fase 2', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor', detalle: true },
        { clave: 'Óptimo Fase 1 (m³ brutos)', formato: m3, sentido: 'neutro' },
        { clave: 'Días L-V del rango', formato: n => n.toLocaleString('es-CO'), sentido: 'neutro', detalle: true },
        { clave: 'Días operados', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor', detalle: true },
        { clave: 'Volquetas activas', formato: n => n.toLocaleString('es-CO'), sentido: 'neutro' },
        { clave: 'm³ por volqueta', formato: m3, sentido: 'masEsMejor', detalle: true },
      ]
    : [
        { clave: 'Ingreso total', formato: pesos, sentido: 'masEsMejor' },
        { clave: 'Valor vendido', formato: pesos, sentido: 'masEsMejor', detalle: true },
        { clave: 'Valor al acopio', formato: pesos, sentido: 'neutro', detalle: true },
        { clave: 'Ventas registradas', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor' },
        { clave: 'm³ facturados', formato: m3, sentido: 'masEsMejor' },
        { clave: 'm³ a clientes (con yapa)', formato: m3, sentido: 'masEsMejor', detalle: true },
        { clave: 'm³ al acopio', formato: m3, sentido: 'neutro', detalle: true },
        { clave: 'Producto final entregado', formato: m3, sentido: 'masEsMejor' },
        { clave: 'Precio promedio por m³', formato: pesos, sentido: 'masEsMejor' },
        { clave: 'Clientes distintos', formato: n => n.toLocaleString('es-CO'), sentido: 'masEsMejor' },
      ];

  const valores = (
    res?: ReturnType<typeof useDashboardResumen>['data'],
    mapa?: Parameters<typeof totalizarOptimo>[0]
  ): Valores | null => {
    if (!res) return null;
    if (esProduccion) {
      const total = totalizarOptimo(mapa);
      const operados = mapa
        ? Array.from(mapa.values()).filter(d => d.wActual > 0).length
        : 0;
      const volquetas = res.movimientos.porVolqueta.length;
      return {
        'Movimientos': res.movimientos.totalMovimientos,
        'm³ producidos': res.movimientos.totalM3Producidos,
        'm³ Fase 1': res.movimientos.m3Fase1,
        'Viajes Fase 1': res.movimientos.viajesFase1,
        'm³ Fase 2': res.movimientos.m3Fase2,
        'Viajes Fase 2': res.movimientos.viajesFase2,
        'Óptimo Fase 1 (m³ brutos)': total.m3Optimo,
        'Días L-V del rango': total.diasLV,
        'Días operados': operados,
        'Volquetas activas': volquetas,
        'm³ por volqueta': volquetas > 0 ? res.movimientos.totalM3Producidos / volquetas : 0,
      };
    }
    const m3Clientes = res.ventas.totalM3Entregados;
    return {
      'Ingreso total': res.totalCombinado,
      'Valor vendido': res.ventas.totalValor,
      'Valor al acopio': res.acopio.totalValor,
      'Ventas registradas': res.ventas.totalRegistros,
      'm³ facturados': res.ventas.totalM3Vendidos,
      'm³ a clientes (con yapa)': m3Clientes,
      'm³ al acopio': res.acopio.totalM3,
      'Producto final entregado': res.productoFinalEntregado,
      'Precio promedio por m³': m3Clientes > 0 ? res.ventas.totalValor / m3Clientes : 0,
      'Clientes distintos': res.clientes.length,
    };
  };

  const valoresA = valores(resA, optimoA);
  const valoresB = valores(resB, optimoB);
  const cargando = cargandoA || cargandoB;

  return (
    <Card className="shadow-card border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Comparar dos períodos
            </CardTitle>
            <CardDescription>
              {esProduccion
                ? 'Cómo cambió la operación entre un período y otro, por ejemplo agosto de 2026 contra agosto de 2025.'
                : 'Cómo cambiaron las ventas entre un período y otro, por ejemplo agosto de 2026 contra agosto de 2025.'}
              {' '}Los filtros de sílice, transacción y fuente de arriba también aplican aquí.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">Período A</p>
              <div className="flex flex-wrap gap-2">
                <FechaPicker
                  label="Desde"
                  value={rangoA.inicio}
                  onChange={v => setRangoA(r => ({ ...r, inicio: v }))}
                />
                <FechaPicker
                  label="Hasta"
                  value={rangoA.fin}
                  onChange={v => setRangoA(r => ({ ...r, fin: v }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">Período B</p>
              <div className="flex flex-wrap gap-2">
                <FechaPicker
                  label="Desde"
                  value={rangoB.inicio}
                  onChange={v => setRangoB(r => ({ ...r, inicio: v }))}
                />
                <FechaPicker
                  label="Hasta"
                  value={rangoB.fin}
                  onChange={v => setRangoB(r => ({ ...r, fin: v }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {atajos.map(a => (
              <Button
                key={a.etiqueta}
                variant="outline"
                size="sm"
                onClick={a.aplicar}
                className="h-7 text-xs font-normal"
              >
                {a.etiqueta}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {cargando ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !valoresA || !valoresB ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No se pudieron cargar los datos de alguno de los dos períodos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 text-left font-medium">Métrica</th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    <span className="block text-slate-700">Período A</span>
                    <span className="font-normal">{etiquetaRango(rangoA)}</span>
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    <span className="block text-slate-700">Período B</span>
                    <span className="font-normal">{etiquetaRango(rangoB)}</span>
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">Diferencia</th>
                  <th className="pb-2 text-right font-medium">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {metricas.map(met => {
                  const a = valoresA[met.clave] ?? 0;
                  const b = valoresB[met.clave] ?? 0;
                  const v = calcularVariacion(a, b);
                  const bueno = esBuenaNoticia(v, met.sentido);
                  const dif = a - b;
                  return (
                    <tr key={met.clave} className="hover:bg-muted/30">
                      <td
                        className={cn(
                          'py-2 pr-4',
                          met.detalle ? 'pl-4 text-xs text-muted-foreground' : 'font-medium'
                        )}
                      >
                        {met.detalle && <span className="mr-1 text-muted-foreground">·</span>}
                        {met.clave}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums font-semibold">
                        {met.formato(a)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                        {met.formato(b)}
                      </td>
                      <td
                        className={cn(
                          'py-2 pr-4 text-right tabular-nums',
                          bueno === null ? 'text-muted-foreground' : bueno ? 'text-green-700' : 'text-red-600'
                        )}
                      >
                        {dif > 0 ? '+' : ''}{met.formato(dif)}
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center justify-end gap-1 tabular-nums">
                          <FlechaVariacion bueno={bueno} direccion={v.direccion} />
                          <span
                            className={cn(
                              'text-xs',
                              bueno === null ? 'text-muted-foreground' : bueno ? 'text-green-700' : 'text-red-600'
                            )}
                          >
                            {v.texto}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {esProduccion && valoresA['Días L-V del rango'] !== valoresB['Días L-V del rango'] && (
              <p className="pt-3 text-[11px] leading-relaxed text-amber-700">
                Los dos períodos no tienen el mismo número de días hábiles
                ({valoresA['Días L-V del rango']} contra {valoresB['Días L-V del rango']}),
                así que los totales no son comparables uno a uno.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function m3(v: number): string {
  return `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³`;
}

function pesos(v: number): string {
  return `$${Math.round(v).toLocaleString('es-CO')}`;
}

export default ComparadorPeriodos;
