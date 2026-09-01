import { cn } from '@/lib/utils';
import {
  formatoM3,
  formatoMoneda,
  formatoNumero,
  formatoPorcentaje,
  porcentaje,
} from '@/lib/formato';
import type { MetricasPeriodo } from '@/lib/informe';

interface Props {
  actual: MetricasPeriodo;
  anterior: MetricasPeriodo | null;
}

const nombreCorto = (silice: string) => silice.replace('Silice ', '');

const AnalisisComercial = ({ actual, anterior }: Props) => {
  const topClientes = actual.clientes.slice(0, 8);
  const pesoVentas = porcentaje(actual.ingresoVentas, actual.ingresoTotal);
  const pesoAcopio = porcentaje(actual.ingresoAcopio, actual.ingresoTotal);

  // Clientes que compraron el período anterior y no en este
  const clavesActuales = new Set(actual.clientes.map(c => c.clave));
  const perdidos = (anterior?.clientes ?? [])
    .filter(c => c.ingreso > 0 && !clavesActuales.has(c.clave))
    .sort((a, b) => b.ingreso - a.ingreso)
    .slice(0, 6);

  let acumulado = 0;

  return (
    <div className="space-y-5">
      {/* Venta de planta vs acopio */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="evitar-corte rounded-lg border border-green-200 bg-green-50/60 p-4">
          <p className="text-xs font-medium text-green-800">Venta directa de planta</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-green-900">
            {formatoMoneda(actual.ingresoVentas)}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {formatoM3(actual.m3EntregadoVentas, 0)} entregados en {actual.ventasRegistros} despacho(s) ·{' '}
            {formatoPorcentaje(pesoVentas, 0)} del ingreso
          </p>
        </div>
        <div className="evitar-corte rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-medium text-amber-800">Acopio</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900">
            {formatoMoneda(actual.ingresoAcopio)}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {formatoM3(actual.m3Acopio, 0)} en {formatoNumero(actual.viajesAcopio)} viaje(s) ·{' '}
            {formatoPorcentaje(pesoAcopio, 0)} del ingreso
          </p>
        </div>
      </div>

      {/* Precio y yapa */}
      <div className="evitar-corte space-y-3">
        <p className="text-sm font-semibold text-foreground">Precio y material entregado de más</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Precio por m³ facturado</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {formatoMoneda(actual.precioPorM3Facturado)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Precio por m³ entregado</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {formatoMoneda(actual.precioPorM3Entregado)}
            </p>
            <p className="text-[11px] text-muted-foreground">incluyendo la yapa</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Yapa entregada</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatoM3(actual.m3Yapa, 0)}</p>
            <p className="text-[11px] text-muted-foreground">{formatoMoneda(actual.valorYapa)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Vendido bajo referencia</p>
            <p
              className={cn(
                'mt-1 text-lg font-bold tabular-nums',
                actual.valorNoPercibido > 0 ? 'text-amber-700' : 'text-foreground'
              )}
            >
              {formatoMoneda(actual.valorNoPercibido)}
            </p>
          </div>
        </div>

        {actual.preciosReferencia.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 text-left font-medium">Tipo de arena</th>
                  <th className="pb-2 pr-4 text-right font-medium">Precio de referencia</th>
                  <th className="pb-2 pr-4 text-right font-medium">m³ facturados</th>
                  <th className="pb-2 pr-4 text-right font-medium">Ventas bajo referencia</th>
                  <th className="pb-2 text-right font-medium">Valor no percibido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {actual.preciosReferencia.map(p => (
                  <tr key={p.silice}>
                    <td className="py-2 pr-4 font-medium">{nombreCorto(p.silice)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatoMoneda(p.referencia)} / m³
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(p.m3, 0)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {p.ventasBajoReferencia} de {p.ventas}
                    </td>
                    <td className="py-2 text-right tabular-nums text-amber-700">
                      {formatoMoneda(p.valorNoPercibido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          El precio de referencia es la mediana de lo efectivamente cobrado por cada tipo de arena en
          estos mismos días, no una lista fija: se recalcula con cada período.
        </p>
      </div>

      {/* Clientes */}
      <div className="evitar-corte space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Clientes ({actual.clientes.length} con compras en el período)
          </p>
          <p className="text-xs text-muted-foreground">
            Top 3 = {formatoPorcentaje(actual.concentracionTop3, 0)} del ingreso · Top 5 ={' '}
            {formatoPorcentaje(actual.concentracionTop5, 0)}
          </p>
        </div>

        {topClientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay ventas en el período seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 text-left font-medium">Cliente</th>
                  <th className="pb-2 pr-4 text-center font-medium">Despachos</th>
                  <th className="pb-2 pr-4 text-right font-medium">m³ entregados</th>
                  <th className="pb-2 pr-4 text-right font-medium">Ingreso</th>
                  <th className="pb-2 text-right font-medium">% acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {topClientes.map(c => {
                  acumulado += porcentaje(c.ingreso, actual.ingresoVentas);
                  return (
                    <tr key={c.clave} className="hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        <p className="font-medium leading-tight">{c.nombre}</p>
                        {c.nit && <p className="text-[11px] text-muted-foreground">{c.nit}</p>}
                      </td>
                      <td className="py-2 pr-4 text-center tabular-nums">{c.compras}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatoM3(c.m3Entregados, 0)}</td>
                      <td className="py-2 pr-4 text-right font-semibold tabular-nums text-green-700">
                        {formatoMoneda(c.ingreso)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {formatoPorcentaje(acumulado, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {actual.clientes.length > topClientes.length && (
              <p className="pt-2 text-xs text-muted-foreground">
                y {actual.clientes.length - topClientes.length} cliente(s) más — el listado completo
                está en el Excel del informe.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Clientes perdidos */}
      {perdidos.length > 0 && (
        <div className="evitar-corte rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-sm font-semibold text-amber-900">
            Compraron el período anterior y no en este
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {perdidos.map(c => (
              <li key={c.clave} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{c.nombre}</span>
                <span className="shrink-0 tabular-nums">{formatoMoneda(c.ingreso)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalisisComercial;
