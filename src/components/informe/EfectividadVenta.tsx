import { formatoM3, formatoNumero } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { MetricasPeriodo } from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo;
}

const Barra = ({ pct, tono }: { pct: number; tono: string }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
    <div className={cn('h-2.5 rounded-full', tono)} style={{ width: `${Math.min(pct, 100)}%` }} />
  </div>
);

/**
 * ¿Se vende lo que se produce? Contrasta el producto final generado en el
 * período contra el que salió hacia clientes y hacia el acopio. Por encima del
 * 100 % se está consumiendo inventario acumulado; por debajo, acumulándolo.
 */
const EfectividadVenta = ({ actual, anterior }: Props) => {
  const producido = actual.productoFinalTotal;
  const entregado = actual.m3Entregados;
  const cobertura = actual.coberturaVentas;
  const diferencia = producido - entregado;
  const consumeInventario = diferencia < 0;
  const coberturaAnterior = anterior.coberturaVentas;

  const maximo = Math.max(producido, entregado, 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs text-amber-700">Producto final producido</p>
          <p className="text-2xl font-bold text-amber-800">{formatoM3(producido, 0)}</p>
          <p className="text-[11px] text-amber-700/80">
            Fase 1 {formatoM3(actual.productoFase1, 0)} + Fase 2 {formatoM3(actual.productoFase2, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
          <p className="text-xs text-sky-700">Producto final entregado</p>
          <p className="text-2xl font-bold text-sky-800">{formatoM3(entregado, 0)}</p>
          <p className="text-[11px] text-sky-700/80">
            {formatoM3(actual.m3EntregadoVentas, 0)} a clientes + {formatoM3(actual.m3Acopio, 0)} al
            acopio
          </p>
        </div>
        <div
          className={cn(
            'rounded-lg border p-3',
            consumeInventario ? 'border-red-200 bg-red-50/60' : 'border-green-200 bg-green-50/60'
          )}
        >
          <p className={cn('text-xs', consumeInventario ? 'text-red-700' : 'text-green-700')}>
            Cobertura de la producción
          </p>
          <p
            className={cn(
              'text-2xl font-bold',
              consumeInventario ? 'text-red-800' : 'text-green-800'
            )}
          >
            {formatoNumero(cobertura, 0)} %
          </p>
          <p
            className={cn(
              'text-[11px]',
              consumeInventario ? 'text-red-700/80' : 'text-green-700/80'
            )}
          >
            {consumeInventario
              ? `Faltaron ${formatoM3(Math.abs(diferencia), 0)} que salieron de inventario`
              : `Sobraron ${formatoM3(diferencia, 0)} que quedaron en inventario`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Producido</span>
          <span className="font-semibold tabular-nums">{formatoM3(producido, 0)}</span>
        </div>
        <Barra pct={(producido / maximo) * 100} tono="bg-amber-500" />
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Entregado</span>
          <span className="font-semibold tabular-nums">{formatoM3(entregado, 0)}</span>
        </div>
        <Barra pct={(entregado / maximo) * 100} tono="bg-sky-500" />
      </div>

      {/* Por frente: dónde se está acumulando o consumiendo inventario */}
      {actual.porSilice.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 pr-4 text-left font-medium">Frente</th>
                <th className="pb-2 pr-4 text-right font-medium">Producido</th>
                <th className="pb-2 pr-4 text-right font-medium">A clientes</th>
                <th className="pb-2 pr-4 text-right font-medium">Al acopio</th>
                <th className="pb-2 pr-4 text-right font-medium">Entregado</th>
                <th className="pb-2 text-right font-medium">Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {actual.porSilice.map(s => {
                const prod = s.productoFase1 + s.productoFase2;
                const cob = s.m3Entregados > 0 ? (prod / s.m3Entregados) * 100 : 0;
                return (
                  <tr key={s.silice}>
                    <td className="py-2 pr-4 font-medium">{s.silice.replace('Silice ', '')}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(prod, 0)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatoM3(s.m3EntregadoVentas, 0)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(s.m3Acopio, 0)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums font-medium text-sky-700">
                      {formatoM3(s.m3Entregados, 0)}
                    </td>
                    <td
                      className={cn(
                        'py-2 text-right font-semibold tabular-nums',
                        cob < 100 ? 'text-red-600' : 'text-green-700'
                      )}
                    >
                      {formatoNumero(cob, 0)} %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
            El reproceso convierte arena de Pozo en Peña, así que la cobertura de un frente por
            separado no es un balance cerrado: parte de lo que se entrega como Peña salió del
            material de Pozo.
          </p>
        </div>
      )}

      <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
        <span className="font-semibold">Lectura. </span>
        {consumeInventario
          ? `Se entregó más de lo que se produjo: la operación cubrió el ${formatoNumero(cobertura, 0)} % de lo despachado y el resto salió del inventario acumulado. Sostenido en el tiempo, esto vacía el patio.`
          : `Se produjo más de lo que se entregó: sobraron ${formatoM3(diferencia, 0)} que engrosan el inventario. Hay margen para vender más sin tocar la capacidad instalada.`}
        {coberturaAnterior > 0 && (
          <>
            {' '}
            En el período anterior la cobertura fue de {formatoNumero(coberturaAnterior, 0)} %
            {Math.abs(cobertura - coberturaAnterior) < 1
              ? ', prácticamente igual.'
              : cobertura > coberturaAnterior
                ? ', así que la producción ganó terreno frente a las entregas.'
                : ', así que las entregas ganaron terreno frente a la producción.'}
          </>
        )}
      </p>
    </div>
  );
};

export default EfectividadVenta;
