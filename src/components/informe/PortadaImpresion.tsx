import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatoM3, formatoNumero } from '@/lib/formato';
import {
  PF_EXCAVACION_ZARANDA,
  PF_ZARANDA_DESTINO,
  PF_GRANZON,
} from '@/lib/volquetas';
import { PRECIO_M3 } from '@/hooks/useDashboardResumen';
import type { MetricasPeriodo } from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo;
  rangoTexto: string;
  rangoAnteriorTexto: string;
  filtros: { tipoSilice: string; tipoTransaccion: string; fuente: string };
}

/** Las secciones del informe, en el orden en que salen impresas. */
const INDICE = [
  'Contexto y método de cálculo',
  'Producción frente a la capacidad, fase por fase',
  'Conclusiones y recomendaciones',
  'Uso de la flota y días de operación',
  'Fase 1 y Fase 2: del material excavado al producto',
  'Estabilidad de la operación',
  'Rendimiento de la flota',
  '¿Se vende lo que se produce?',
  'Resultado comercial',
];

const pct = (n: number) => `${formatoNumero(n * 100, 1)} %`;

/**
 * Portada, índice y nota metodológica. Solo salen al imprimir: en pantalla el
 * informe ya vive dentro del dashboard y no necesita carátula, pero el PDF que
 * se lleva al comité sí tiene que explicarse solo.
 */
const PortadaImpresion = ({
  actual,
  anterior,
  rangoTexto,
  rangoAnteriorTexto,
  filtros,
}: Props) => {
  const filtrosActivos = [
    filtros.tipoSilice !== 'todos' && `Sílice: ${filtros.tipoSilice}`,
    filtros.tipoTransaccion !== 'todos' && `Transacción: ${filtros.tipoTransaccion}`,
    filtros.fuente !== 'todos' && `Fuente: ${filtros.fuente}`,
  ].filter(Boolean) as string[];

  return (
    <div className="solo-impresion">
      {/* ── Carátula ──────────────────────────────────────────────────────── */}
      <section className="pagina-impresion flex min-h-[85vh] flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Sucesores Pedro Pablo Rozo Guaquetá e Hijos S.A.S.
          </p>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-foreground">
            Reporte de gestión
          </h1>
          <p className="mt-2 text-xl text-muted-foreground">{rangoTexto}</p>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Período comparado</dt>
              <dd className="font-semibold">{rangoAnteriorTexto}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Días hábiles / operados</dt>
              <dd className="font-semibold">
                {actual.diasHabiles} / {actual.diasOperados}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Producto final producido</dt>
              <dd className="font-semibold">{formatoM3(actual.productoFinalTotal, 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Producto final entregado</dt>
              <dd className="font-semibold">{formatoM3(actual.m3Entregados, 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cumplimiento de capacidad</dt>
              <dd className="font-semibold">{formatoNumero(actual.cumplimientoTotal, 0)} %</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ingreso del período</dt>
              <dd className="font-semibold">
                ${Math.round(actual.ingresoTotal).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>

          {filtrosActivos.length > 0 && (
            <p className="mt-6 text-xs text-muted-foreground">
              Informe filtrado por {filtrosActivos.join(' · ')}. Las cifras no corresponden a la
              operación completa.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Generado el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })} con los
            registros de ventas, acopios, movimientos internos y tiempos de recorrido cargados en el
            sistema.
          </p>
        </div>
      </section>

      {/* ── Índice ────────────────────────────────────────────────────────── */}
      <section className="pagina-impresion">
        <h2 className="font-display text-2xl font-bold text-foreground">Índice</h2>
        <ol className="mt-4 space-y-2 text-sm">
          {INDICE.map((t, i) => (
            <li key={t} className="flex gap-3 border-b border-border/50 pb-2">
              <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Contexto y método ─────────────────────────────────────────────── */}
      <section className="pagina-impresion evitar-corte">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Contexto y método de cálculo
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Con qué supuestos se calculó cada cifra de este informe. Sin esto los porcentajes no se
          pueden interpretar ni discutir.
        </p>

        <div className="mt-5 space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="font-semibold text-foreground">Jornada</h3>
            <p className="text-muted-foreground">
              7,5 horas de lunes a viernes y 4 horas el sábado. El sábado se analiza aparte: con
              poco más de medio turno, su capacidad no es comparable con la de un día entre semana.
              En este período hubo {actual.sabadosHabiles} sábado(s) hábil(es), de los cuales se
              operaron {actual.sabadosOperados}. El domingo no cuenta como día hábil.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Capacidad instalada</h3>
            <p className="text-muted-foreground">
              Sale del simulador: para cada día se busca la mejor combinación de volquetas dados los
              tiempos de ida y vuelta vigentes y la jornada. Peña se planea con flota homogénea de
              7 m³ y Pozo incluyendo la volqueta de 14 m³. Si un día no tiene medición propia de
              tiempos, se usa la última registrada antes de esa fecha, que es como se comporta la
              operación: los tiempos siguen vigentes mientras no se vuelva a medir.
            </p>
            <p className="mt-1 text-muted-foreground">
              La capacidad de este informe se acumuló sobre{' '}
              <span className="font-medium text-foreground">
                {actual.baseCapacidad === 'habiles'
                  ? 'todos los días hábiles del período'
                  : 'solo los días en que se operó'}
              </span>
              {actual.baseCapacidad === 'habiles'
                ? ', así que incluye el costo de los días que no se trabajó.'
                : ', así que aísla el rendimiento de los días en que sí se trabajó.'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Factores de producción</h3>
            <p className="text-muted-foreground">
              De cada m³ crudo que sube a la zaranda sale {pct(PF_EXCAVACION_ZARANDA)} de producto;
              el resto es residuo. Al reprocesar ese residuo se recupera {pct(PF_ZARANDA_DESTINO)} y{' '}
              {pct(PF_GRANZON)} sale como granzón. Los m³ brutos son capacidad de la volqueta por
              viajes, sin aplicar ningún factor.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Fase 1 y Fase 2</h3>
            <p className="text-muted-foreground">
              Fase 1 es llevar material del punto de excavación a la zaranda. Fase 2 es reprocesar
              lo que sale de la zaranda. Llevar material a un patio de residuos no es ninguna de las
              dos y se contabiliza aparte, para no inflar la intensidad de reproceso. Al reprocesar,
              la arena de Pozo sale convertida en Peña.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Producto final entregado</h3>
            <p className="text-muted-foreground">
              Lo despachado a clientes más lo llevado al acopio. A clientes se le suma 1 m³ de yapa
              por despacho, que en este período fueron {formatoM3(actual.m3Yapa, 0)} regalados en{' '}
              {formatoNumero(actual.ventasRegistros, 0)} despacho(s). Es la misma definición de la
              fila "Producto final entregado" del informe diario de la empresa.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Precios de referencia</h3>
            <p className="text-muted-foreground">
              El acopio se valora a precio de lista porque no se factura:{' '}
              {Object.entries(PRECIO_M3)
                .map(([sil, precio]) => `${sil.replace('Silice ', '')} $${precio.toLocaleString('es-CO')}/m³`)
                .join(' · ')}
              . Los consumos de anticipo no suman al ingreso del período: ese dinero ya entró cuando
              se registró el anticipo.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Comparación</h3>
            <p className="text-muted-foreground">
              Todas las variaciones son contra {rangoAnteriorTexto}, el período inmediatamente
              anterior de igual duración, que tuvo {anterior.diasHabiles} día(s) hábil(es) y{' '}
              {anterior.diasOperados} operado(s).
              {anterior.diasHabiles !== actual.diasHabiles &&
                ' Los dos períodos no tienen el mismo número de días hábiles, así que los totales no son comparables uno a uno.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PortadaImpresion;
