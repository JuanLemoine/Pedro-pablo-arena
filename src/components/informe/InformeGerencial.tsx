import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  ClipboardList,
  FileDown,
  Gauge,
  Layers,
  LineChart,
  Printer,
  ShoppingCart,
  Truck,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInformeGerencial } from '@/hooks/useInformeGerencial';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';
import type { BaseCapacidad } from '@/lib/informe';
import { exportarInformeExcel } from '@/lib/exportarInforme';
import SeccionInforme from './SeccionInforme';
import ProduccionVsCapacidad from './ProduccionVsCapacidad';
import ResumenEjecutivo from './ResumenEjecutivo';
import CumplimientoCapacidad from './CumplimientoCapacidad';
import EmbudoFases from './EmbudoFases';
import EstabilidadOperacion from './EstabilidadOperacion';
import RendimientoFlota from './RendimientoFlota';
import AnalisisComercial from './AnalisisComercial';
import ConclusionesRecomendaciones from './ConclusionesRecomendaciones';

interface Props {
  filtros: DashboardFiltros;
}

const rangoEnTexto = (inicio: string, fin: string) => {
  const d0 = parseISO(inicio);
  const d1 = parseISO(fin);
  const mismoMes = d0.getMonth() === d1.getMonth() && d0.getFullYear() === d1.getFullYear();
  return mismoMes
    ? `${format(d0, 'd', { locale: es })} – ${format(d1, "d 'de' MMMM 'de' yyyy", { locale: es })}`
    : `${format(d0, "d 'de' MMM", { locale: es })} – ${format(d1, "d 'de' MMM 'de' yyyy", { locale: es })}`;
};

const InformeGerencial = ({ filtros }: Props) => {
  const [baseCapacidad, setBaseCapacidad] = useState<BaseCapacidad>('habiles');
  const { data, isLoading, error } = useInformeGerencial(filtros, baseCapacidad);
  const [exportando, setExportando] = useState(false);

  const descargarExcel = () => {
    if (!data) return;
    setExportando(true);
    try {
      exportarInformeExcel(data);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo generar el Excel del informe');
    } finally {
      setExportando(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        No se pudo cargar el informe de gestión: {(error as Error).message}
      </div>
    );
  }

  return (
    <div id="informe-gerencial" className="space-y-5">
      {/* ── Encabezado ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-amber-50/60 to-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Sucesores Pedro Pablo Rozo Guaquetá e Hijos S.A.S.
          </p>
          <h2 className="font-display text-2xl font-bold leading-tight text-foreground">
            Informe de Gestión
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rangoEnTexto(filtros.fechaInicio, filtros.fechaFin)}
            {data && (
              <>
                {' · comparado con '}
                {rangoEnTexto(data.rangoAnterior.inicio, data.rangoAnterior.fin)}
              </>
            )}
          </p>
          {(filtros.tipoSilice !== 'todos' ||
            filtros.tipoTransaccion !== 'todos' ||
            filtros.fuente !== 'todos') && (
            <p className="mt-1 text-xs text-muted-foreground">
              Filtrado por:{' '}
              {[
                filtros.tipoSilice !== 'todos' && filtros.tipoSilice,
                filtros.tipoTransaccion !== 'todos' && filtros.tipoTransaccion,
                filtros.fuente !== 'todos' && filtros.fuente,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="no-print flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={isLoading || !data}
            className="gap-2"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={descargarExcel}
            disabled={isLoading || !data || exportando}
            className="gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            <FileDown className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <ResumenEjecutivo actual={data.actual} anterior={data.anterior} />

          <SeccionInforme
            numero={1}
            titulo="Producción vs. capacidad, fase por fase"
            pregunta="¿Cuánto produjimos en cada fase frente a lo que se debió producir?"
            icono={Gauge}
          >
            <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
              <span className="text-xs font-medium text-muted-foreground">Comparar contra la capacidad de:</span>
              <div className="flex rounded-lg border border-border bg-background p-0.5">
                {([
                  ['habiles', 'Todos los días hábiles'],
                  ['operados', 'Solo los días operados'],
                ] as const).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    onClick={() => setBaseCapacidad(valor)}
                    className={
                      baseCapacidad === valor
                        ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                        : 'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground'
                    }
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {baseCapacidad === 'habiles'
                  ? 'Incluye el costo de los días que no se trabajó.'
                  : 'Aísla el rendimiento de los días en que sí se trabajó.'}
              </span>
            </div>

            <ProduccionVsCapacidad
              actual={data.actual}
              anterior={data.anterior}
              tipoSilice={filtros.tipoSilice}
            />
          </SeccionInforme>

          <SeccionInforme
            numero={2}
            titulo="Conclusiones y recomendaciones"
            pregunta="¿Qué hay que hacer con lo que muestran los datos de este período?"
            icono={ClipboardList}
          >
            <ConclusionesRecomendaciones conclusiones={data.conclusiones} />
          </SeccionInforme>

          <SeccionInforme
            numero={3}
            titulo="Uso de la flota y días de operación"
            pregunta="¿La brecha es por no trabajar, por faltar volquetas o por bajo rendimiento?"
            icono={CalendarDays}
          >
            <CumplimientoCapacidad actual={data.actual} />
          </SeccionInforme>

          <SeccionInforme
            numero={4}
            titulo="Fase 1 y Fase 2: del material excavado al producto"
            pregunta="¿Dónde está el cuello de botella: en sacar material o en reprocesarlo?"
            icono={Layers}
          >
            <EmbudoFases actual={data.actual} />
          </SeccionInforme>

          <SeccionInforme
            numero={5}
            titulo="Estabilidad de la operación"
            pregunta="¿La producción diaria es predecible o cambia de un día para otro?"
            icono={LineChart}
          >
            <EstabilidadOperacion actual={data.actual} anterior={data.anterior} />
          </SeccionInforme>

          <SeccionInforme
            numero={6}
            titulo="Rendimiento de la flota"
            pregunta="¿Cuánto mueve cada volqueta y estamos usando la cantidad correcta?"
            icono={Truck}
          >
            <RendimientoFlota actual={data.actual} />
          </SeccionInforme>

          <SeccionInforme
            numero={7}
            titulo="Resultado comercial"
            pregunta="¿A quién le vendimos, a qué precio y cuánto material regalamos?"
            icono={ShoppingCart}
          >
            <AnalisisComercial actual={data.actual} anterior={data.anterior} />
          </SeccionInforme>

          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <Activity className="mt-0.5 h-3 w-3 shrink-0" />
            Informe generado con los registros de ventas, acopios, movimientos internos y tiempos de
            recorrido cargados en el sistema. La capacidad óptima usa los tiempos de ida y vuelta del
            día (o la última medición registrada antes de él, si ese día no tiene la suya) y la
            jornada legal: 7,5 h de lunes a viernes y 4 h el sábado.
          </p>
        </>
      )}
    </div>
  );
};

export default InformeGerencial;
