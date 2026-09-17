import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Download, Search, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
import { useVentasDetalle, type VentaDetalle } from '@/hooks/useVentasDetalle';
import type { DashboardFiltros } from '@/hooks/useDashboardResumen';
import { cn } from '@/lib/utils';

interface Props {
  filtros: DashboardFiltros;
}

type Agrupacion = 'cliente' | 'placa' | 'fecha' | 'clientePlaca' | 'detalle';

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string; ayuda: string }[] = [
  { valor: 'cliente', etiqueta: 'Cliente / NIT', ayuda: 'Una fila por empresa' },
  { valor: 'placa', etiqueta: 'Placa', ayuda: 'Una fila por volqueta que recogió' },
  { valor: 'fecha', etiqueta: 'Fecha', ayuda: 'Una fila por día' },
  { valor: 'clientePlaca', etiqueta: 'Cliente + Placa', ayuda: 'Qué volquetas usa cada empresa' },
  { valor: 'detalle', etiqueta: 'Cliente + Placa + Fecha', ayuda: 'El detalle completo' },
];

interface Fila {
  clave: string;
  cliente: string;
  nit: string;
  placa: string;
  fecha: string;
  ventas: number;
  m3Facturados: number;
  /** Lo que recibió el cliente: facturado más 1 m³ de yapa por despacho. */
  m3Recibidos: number;
  valor: number;
  valorAnticipo: number;
  silices: Set<string>;
  primera: string;
  ultima: string;
}

const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;
const m3 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const fechaCorta = (f: string) => format(parseISO(f), 'd MMM yy', { locale: es });

/**
 * El mismo universo de ventas visto por empresa, por volqueta o por fecha. La
 * pregunta que responde es "a quién le entregamos, en qué placa y qué día",
 * que es la que aparece cuando un cliente reclama un despacho.
 */
const InformeVentasDetalle = ({ filtros }: Props) => {
  const { data, isLoading, error } = useVentasDetalle(filtros);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('cliente');
  const [busqueda, setBusqueda] = useState('');

  const filas = useMemo<Fila[]>(() => {
    if (!data) return [];
    const mapa = new Map<string, Fila>();

    const claveDe = (v: VentaDetalle) => {
      const cliente = (v.nombre_cliente || '').trim().toUpperCase() || 'SIN NOMBRE';
      const placa = (v.placa || '').trim().toUpperCase() || '—';
      switch (agrupacion) {
        case 'cliente': return cliente;
        case 'placa': return placa;
        case 'fecha': return v.fecha;
        case 'clientePlaca': return `${cliente}|${placa}`;
        default: return `${cliente}|${placa}|${v.fecha}`;
      }
    };

    data.forEach(v => {
      const clave = claveDe(v);
      const f = mapa.get(clave) ?? {
        clave,
        cliente: (v.nombre_cliente || '').trim() || 'Sin nombre',
        nit: (v.nit_cliente || '').trim() || '—',
        placa: (v.placa || '').trim().toUpperCase() || '—',
        fecha: v.fecha,
        ventas: 0,
        m3Facturados: 0,
        m3Recibidos: 0,
        valor: 0,
        valorAnticipo: 0,
        silices: new Set<string>(),
        primera: v.fecha,
        ultima: v.fecha,
      };
      const facturado = Number(v.cantidad_m3) || 0;
      const valor = Number(v.valor_total) || 0;
      f.ventas += 1;
      f.m3Facturados += facturado;
      f.m3Recibidos += facturado + 1; // la yapa: 1 m³ de más por despacho
      if (v.descuenta_anticipo) f.valorAnticipo += valor;
      else f.valor += valor;
      f.silices.add(v.silice);
      if (v.fecha < f.primera) f.primera = v.fecha;
      if (v.fecha > f.ultima) f.ultima = v.fecha;
      // Con varios NIT para el mismo nombre se conserva el primero que traiga uno.
      if (f.nit === '—' && v.nit_cliente) f.nit = v.nit_cliente.trim();
      mapa.set(clave, f);
    });

    const orden = agrupacion === 'fecha'
      ? (a: Fila, b: Fila) => b.fecha.localeCompare(a.fecha)
      : (a: Fila, b: Fila) => b.m3Recibidos - a.m3Recibidos;

    return Array.from(mapa.values()).sort(orden);
  }, [data, agrupacion]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter(f =>
      f.cliente.toLowerCase().includes(q) ||
      f.nit.toLowerCase().includes(q) ||
      f.placa.toLowerCase().includes(q) ||
      f.fecha.includes(q)
    );
  }, [filas, busqueda]);

  const totales = useMemo(
    () =>
      visibles.reduce(
        (t, f) => ({
          ventas: t.ventas + f.ventas,
          m3Facturados: t.m3Facturados + f.m3Facturados,
          m3Recibidos: t.m3Recibidos + f.m3Recibidos,
          valor: t.valor + f.valor,
          valorAnticipo: t.valorAnticipo + f.valorAnticipo,
        }),
        { ventas: 0, m3Facturados: 0, m3Recibidos: 0, valor: 0, valorAnticipo: 0 }
      ),
    [visibles]
  );

  const muestraCliente = agrupacion !== 'placa' && agrupacion !== 'fecha';
  const muestraPlaca = agrupacion === 'placa' || agrupacion === 'clientePlaca' || agrupacion === 'detalle';
  const muestraFecha = agrupacion === 'fecha' || agrupacion === 'detalle';

  const exportar = () => {
    if (visibles.length === 0) {
      toast.error('No hay filas para exportar');
      return;
    }
    const datos = visibles.map(f => {
      const fila: Record<string, string | number> = {};
      if (muestraCliente) {
        fila['Cliente'] = f.cliente;
        fila['NIT'] = f.nit;
      }
      if (muestraPlaca) fila['Placa'] = f.placa;
      if (muestraFecha) fila['Fecha'] = f.fecha;
      fila['Ventas'] = f.ventas;
      fila['m³ facturados'] = Math.round(f.m3Facturados * 100) / 100;
      fila['m³ recibidos'] = Math.round(f.m3Recibidos * 100) / 100;
      fila['Valor cobrado'] = Math.round(f.valor);
      fila['Contra anticipo'] = Math.round(f.valorAnticipo);
      fila['Precio por m³ recibido'] =
        f.m3Recibidos > 0 ? Math.round((f.valor + f.valorAnticipo) / f.m3Recibidos) : 0;
      fila['Sílice(s)'] = Array.from(f.silices).map(s => s.replace('Silice ', '')).join(' · ');
      if (!muestraFecha) {
        fila['Primera compra'] = f.primera;
        fila['Última compra'] = f.ultima;
      }
      return fila;
    });
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = Object.keys(datos[0]).map(k => ({ wch: Math.max(12, k.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas_${agrupacion}_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx`);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              Ventas por cliente, placa y fecha
            </CardTitle>
            <CardDescription>
              A quién se le entregó, en qué volqueta y qué día. Los m³ recibidos incluyen la yapa de
              1 m³ por despacho; el valor cobrado deja por fuera los consumos de anticipo.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportar}
            className="no-print shrink-0 gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 pt-2">
          <div className="flex flex-wrap rounded-lg border border-border p-0.5">
            {AGRUPACIONES.map(a => (
              <button
                key={a.valor}
                onClick={() => setAgrupacion(a.valor)}
                title={a.ayuda}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  agrupacion === a.valor
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, NIT, placa o fecha…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="h-8 pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {visibles.length.toLocaleString('es-CO')} fila(s)
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">
            Error al cargar las ventas: {(error as Error).message}
          </p>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : visibles.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay ventas que coincidan con el período y los filtros seleccionados.
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-xs text-muted-foreground">
                  {muestraCliente && <th className="pb-2 pr-4 text-left font-medium">Cliente</th>}
                  {muestraCliente && <th className="pb-2 pr-4 text-left font-medium">NIT</th>}
                  {muestraPlaca && <th className="pb-2 pr-4 text-left font-medium">Placa</th>}
                  {muestraFecha && <th className="pb-2 pr-4 text-left font-medium">Fecha</th>}
                  <th className="pb-2 pr-4 text-center font-medium">Ventas</th>
                  <th className="pb-2 pr-4 text-right font-medium">m³ facturados</th>
                  <th className="pb-2 pr-4 text-right font-medium">m³ recibidos</th>
                  <th className="pb-2 pr-4 text-right font-medium">Valor cobrado</th>
                  <th className="pb-2 pr-4 text-right font-medium">$/m³</th>
                  <th className="pb-2 text-left font-medium">
                    {muestraFecha ? 'Sílice(s)' : 'Última compra'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {visibles.map(f => (
                  <tr key={f.clave} className="hover:bg-muted/30">
                    {muestraCliente && (
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className={cn('font-medium', f.cliente === 'Sin nombre' && 'italic text-muted-foreground')}>
                            {f.cliente}
                          </span>
                        </span>
                      </td>
                    )}
                    {muestraCliente && (
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{f.nit}</td>
                    )}
                    {muestraPlaca && (
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5 font-mono text-xs tracking-wider">
                          <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {f.placa}
                        </span>
                      </td>
                    )}
                    {muestraFecha && (
                      <td className="py-2 pr-4 text-xs">{fechaCorta(f.fecha)}</td>
                    )}
                    <td className="py-2 pr-4 text-center">
                      <Badge variant="secondary" className="text-xs">{f.ventas}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m3(f.m3Facturados)} m³</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums text-sky-700">
                      {m3(f.m3Recibidos)} m³
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold tabular-nums text-green-700">
                      {pesos(f.valor)}
                      {f.valorAnticipo > 0 && (
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          + {pesos(f.valorAnticipo)} anticipo
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {f.m3Recibidos > 0 ? pesos((f.valor + f.valorAnticipo) / f.m3Recibidos) : '—'}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {muestraFecha
                        ? Array.from(f.silices).map(s => s.replace('Silice ', '')).join(' · ')
                        : fechaCorta(f.ultima)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card">
                <tr className="border-t-2 text-sm font-semibold">
                  <td
                    className="py-2 pr-4"
                    colSpan={(muestraCliente ? 2 : 0) + (muestraPlaca ? 1 : 0) + (muestraFecha ? 1 : 0)}
                  >
                    Total
                  </td>
                  <td className="py-2 pr-4 text-center">{totales.ventas.toLocaleString('es-CO')}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{m3(totales.m3Facturados)} m³</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-sky-700">
                    {m3(totales.m3Recibidos)} m³
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-green-700">
                    {pesos(totales.valor)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {totales.m3Recibidos > 0
                      ? pesos((totales.valor + totales.valorAnticipo) / totales.m3Recibidos)
                      : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InformeVentasDetalle;
