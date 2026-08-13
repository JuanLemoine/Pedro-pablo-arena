import { cn } from '@/lib/utils';
import { formatoM3, formatoPorcentaje, porcentaje } from '@/lib/formato';
import {
  FRACCION_RESIDUO,
  INTENSIDAD_BUENA,
  INTENSIDAD_MINIMA,
  type MetricasPeriodo,
} from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
}

const nombreCorto = (silice: string) => silice.replace('Silice ', '');

const colorIntensidad = (valor: number) =>
  valor >= INTENSIDAD_BUENA ? 'bg-green-500' : valor >= INTENSIDAD_MINIMA ? 'bg-amber-500' : 'bg-red-500';

const textoIntensidad = (valor: number) =>
  valor >= INTENSIDAD_BUENA ? 'text-green-700' : valor >= INTENSIDAD_MINIMA ? 'text-amber-700' : 'text-red-600';

/** Un eslabón del embudo: título, m³ y su peso relativo sobre la base indicada. */
const Paso = ({
  titulo,
  m3,
  base,
  detalle,
  color,
  borde,
}: {
  titulo: string;
  m3: number;
  base: number;
  detalle: string;
  color: string;
  borde: string;
}) => {
  const peso = porcentaje(m3, base);
  return (
    <div className={cn('evitar-corte flex-1 rounded-lg border p-3', color, borde)}>
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatoM3(m3, 0)}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-1.5 rounded-full bg-foreground/40"
          style={{ width: `${Math.min(100, Math.max(0, peso))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{detalle}</p>
    </div>
  );
};

const EmbudoFases = ({ actual }: Props) => {
  const intensidad = actual.intensidadReproceso;
  const conFase1 = actual.porSilice.filter(s => s.fase1 > 0);
  const orden = [...conFase1].sort((a, b) => b.intensidadReproceso - a.intensidadReproceso);
  const mejor = orden[0];
  const peor = orden[orden.length - 1];

  const veredicto =
    actual.fase1 === 0
      ? 'No se registraron movimientos desde el punto de excavación en el período.'
      : conFase1.length >= 2 && mejor.intensidadReproceso - peor.intensidadReproceso > 30
      ? `${nombreCorto(mejor.silice)} reprocesa ${formatoPorcentaje(mejor.intensidadReproceso, 0)} de lo que excava y ${nombreCorto(peor.silice)} solo ${formatoPorcentaje(peor.intensidadReproceso, 0)}. Los dos frentes generan residuo en la misma proporción: la oportunidad está en llevar a ${nombreCorto(peor.silice)} la operación de reproceso que ya funciona en ${nombreCorto(mejor.silice)}.`
      : intensidad < INTENSIDAD_MINIMA
      ? `Fase 1 está sacando material pero Fase 2 casi no se mueve (${formatoPorcentaje(intensidad, 0)}): el cuello de botella está en el reproceso, no en la excavación.`
      : actual.cumplimientoCapacidad < 70
      ? 'Fase 2 se está moviendo, pero Fase 1 está por debajo de su capacidad: primero hay que asegurar material suficiente antes de exigirle más al reproceso.'
      : `Ambas fases se están moviendo: Fase 2 aportó ${formatoM3(actual.productoFase2, 0)}, el ${formatoPorcentaje(actual.aporteFase2, 0)} del producto final del período.`;

  return (
    <div className="space-y-5">
      {/* Embudo */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <Paso
          titulo="1. Excavado (Fase 1)"
          m3={actual.fase1}
          base={actual.fase1}
          detalle={`${actual.viajesFase1} viaje(s) desde el punto de excavación`}
          color="bg-amber-50"
          borde="border-amber-200"
        />
        <Paso
          titulo="2. Producto directo de zaranda"
          m3={actual.productoZaranda}
          base={actual.fase1}
          detalle="67 % de lo excavado sale como arena lista"
          color="bg-green-50"
          borde="border-green-200"
        />
        <Paso
          titulo="3. Residuo generado"
          m3={actual.residuoGenerado}
          base={actual.fase1}
          detalle={`${Math.round(FRACCION_RESIDUO * 100)} % de lo excavado: ${formatoM3(actual.residuoRecuperable, 0)} recuperables + ${formatoM3(actual.granzon, 0)} de granzón`}
          color="bg-orange-50"
          borde="border-orange-200"
        />
        <Paso
          titulo="4. Movido en Fase 2"
          m3={actual.fase2}
          base={actual.fase1}
          detalle={`${actual.viajesFase2} viaje(s) de zaranda a trituradora, clasificadora, repaso o revolvedora`}
          color="bg-blue-50"
          borde="border-blue-200"
        />
        <Paso
          titulo="5. Producto recuperado en Fase 2"
          m3={actual.productoFase2}
          base={Math.max(actual.productoFinalTotal, 1)}
          detalle={`${formatoPorcentaje(actual.aporteFase2, 0)} del producto final del período`}
          color="bg-teal-50"
          borde="border-teal-200"
        />
      </div>

      {/* Residuo llevado a patio: dato medido vs. estimación del modelo */}
      <div className="evitar-corte rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-sm font-semibold text-foreground">Residuo llevado a patio (medido)</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">Granzón</span>
            <span className="text-right">
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatoM3(actual.m3AlmacenGranzon, 0)}
              </span>
              <span className="ml-1 text-[11px] text-muted-foreground">
                en {actual.viajesAlmacenGranzon} viaje(s)
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">Tierra</span>
            <span className="text-right">
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatoM3(actual.m3AlmacenTierra, 0)}
              </span>
              <span className="ml-1 text-[11px] text-muted-foreground">
                en {actual.viajesAlmacenTierra} viaje(s)
              </span>
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {actual.m3AlmacenGranzon > 0 ? (
            <>
              El modelo estima el granzón como el 9,9 % de la Fase 1 ({formatoM3(actual.granzon, 0)}).
              Lo medido en patio fue {formatoM3(actual.m3AlmacenGranzon, 0)}; cuando el registro sea
              constante, esta cifra puede reemplazar la estimación.
            </>
          ) : (
            <>
              No se registraron viajes a los patios de residuo en el período. Mientras no se
              registren, el granzón sigue siendo una estimación ({formatoM3(actual.granzon, 0)} = 9,9 %
              de la Fase 1) y no un dato medido.
            </>
          )}
        </p>
      </div>

      {/* Intensidad de reproceso */}
      <div className="evitar-corte space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Intensidad de reproceso</p>
            <p className="text-xs text-muted-foreground">
              m³ movidos en Fase 2 por cada 100 m³ excavados en Fase 1
            </p>
          </div>
          <p className={cn('text-2xl font-bold tabular-nums', textoIntensidad(intensidad))}>
            {formatoPorcentaje(intensidad, 0)}
          </p>
        </div>

        <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-4 rounded-full transition-all', colorIntensidad(intensidad))}
            style={{ width: `${Math.min(100, Math.max(0, intensidad))}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Menos de {INTENSIDAD_MINIMA} % indica que el frente no está reprocesando;{' '}
          {INTENSIDAD_BUENA} % o más es una operación de reproceso activa.
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
        {veredicto}
      </p>

      {/* Fase 1 vs Fase 2 por tipo de arena */}
      {actual.porSilice.length > 0 && (
        <div className="evitar-corte overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 pr-4 text-left font-medium">Tipo de arena</th>
                <th className="pb-2 pr-4 text-right font-medium">Fase 1</th>
                <th className="pb-2 pr-4 text-right font-medium">Residuo generado</th>
                <th className="pb-2 pr-4 text-right font-medium">Movido en Fase 2</th>
                <th className="pb-2 pr-4 text-right font-medium">Producto de Fase 2</th>
                <th className="pb-2 text-right font-medium">Intensidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {actual.porSilice.map(s => (
                <tr key={s.silice}>
                  <td className="py-2 pr-4 font-medium">{nombreCorto(s.silice)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.fase1, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.residuoGenerado, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.fase2, 0)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-teal-700">
                    {formatoM3(s.productoFase2, 0)}
                  </td>
                  <td
                    className={cn(
                      'py-2 text-right font-semibold tabular-nums',
                      s.fase1 === 0 ? 'text-muted-foreground' : textoIntensidad(s.intensidadReproceso)
                    )}
                  >
                    {s.fase1 === 0 ? '—' : formatoPorcentaje(s.intensidadReproceso, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        La intensidad de reproceso no es el porcentaje de residuo aprovechado: un mismo m³ puede
        pasar por varias etapas (trituradora, clasificadora, repaso, revolvedora) y cada paso queda
        registrado como un movimiento distinto, por lo que el volumen movido en Fase 2 puede superar
        al residuo generado.
      </p>
    </div>
  );
};

export default EmbudoFases;
