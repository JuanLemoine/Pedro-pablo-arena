import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  Truck,
  Package,
  ArrowUpRight,
  BarChart3,
  ArrowDownUp,
  Layers,
  CalendarIcon,
  SlidersHorizontal,
  RotateCcw,
  ShoppingCart,
  Warehouse,
  Activity,
  BadgeDollarSign,
  Users,
  User,
  Wallet,
  FileDown,
  Loader2,
  Mountain,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { traerTodo } from '@/lib/fetchTodo';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardResumen } from '@/hooks/useDashboardResumen';
import { fetchAnticiposPorNIT } from '@/hooks/useAnticipos';
import { getCapacidadVolqueta, calcularM3PorMovimiento } from '@/lib/volquetas';
import { toast } from 'sonner';
import ProduccionDiariaLineChart from '@/components/charts/ProduccionDiariaLineChart';
import MovimientosExcavacionChart from '@/components/charts/MovimientosExcavacionChart';
import VolquetasBalanceChart from '@/components/charts/VolquetasBalanceChart';
import InformeGerencial from '@/components/informe/InformeGerencial';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const hoy = new Date();
const DEFAULT_INICIO = format(startOfMonth(hoy), 'yyyy-MM-dd');
const DEFAULT_FIN = format(hoy, 'yyyy-MM-dd');

interface Filtros {
  fechaInicio: string;
  fechaFin: string;
  tipoSilice: string;
  tipoTransaccion: string;
  fuente: string;
}

// ── Pequeño picker de fecha reutilizable ─────────────────────────────────────
const FechaPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('justify-start gap-2 text-left font-normal min-w-[130px]', !value && 'text-muted-foreground')}>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {date ? format(date, 'dd MMM yyyy', { locale: es }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); } }} initialFocus />
      </PopoverContent>
    </Popover>
  );
};

// ── Chip de métrica compacta ──────────────────────────────────────────────────
const ResumenChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${color}`}>
    <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    <span className="text-sm font-bold leading-tight">{value}</span>
  </div>
);

/** Cuántos clientes se muestran por defecto en el resumen de clientes. */
const TOP_CLIENTES = 5;

const Dashboard = () => {
  const navigate = useNavigate();

  /** Pestaña visible. Los filtros de arriba aplican a todas por igual. */
  const [seccion, setSeccion] = useState('resumen');
  /** El resumen de clientes muestra solo el top 5; esto lo expande a la lista completa. */
  const [verTodosClientes, setVerTodosClientes] = useState(false);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [filtros, setFiltros] = useState<Filtros>({
    fechaInicio: DEFAULT_INICIO,
    fechaFin: DEFAULT_FIN,
    tipoSilice: 'todos',
    tipoTransaccion: 'todos',
    fuente: 'todos',
  });

  const resetFiltros = useCallback(() => {
    setFiltros({ fechaInicio: DEFAULT_INICIO, fechaFin: DEFAULT_FIN, tipoSilice: 'todos', tipoTransaccion: 'todos', fuente: 'todos' });
  }, []);

  const setF = (key: keyof Filtros) => (val: string) => setFiltros(prev => ({ ...prev, [key]: val }));

  const filtrosActivos =
    filtros.fechaInicio !== DEFAULT_INICIO ||
    filtros.fechaFin !== DEFAULT_FIN ||
    filtros.tipoSilice !== 'todos' ||
    filtros.tipoTransaccion !== 'todos' ||
    filtros.fuente !== 'todos';

  // ── Datos ───────────────────────────────────────────────────────────────────
  const { data: stats, isLoading, error } = useDashboardStats({
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    tipoSilice: filtros.tipoSilice,
  });

  const { data: resumen, isLoading: resumenLoading } = useDashboardResumen(filtros);

  const [descargando, setDescargando] = useState(false);
  const [descargandoMinas, setDescargandoMinas] = useState(false);

  const descargarReporteFacturacion = async () => {
    setDescargando(true);
    try {
      // Ventas del periodo + saldos de anticipo por cliente (global, a hoy)
      const [data, saldosAnticipo] = await Promise.all([
        traerTodo<any>((desde, hasta) =>
          supabase
            .from('ventas')
            .select('fecha, recibo, silice, nombre_cliente, nit_cliente, placa, cantidad_m3, valor_total, tipo_transaccion, banco, descuenta_anticipo')
            .gte('fecha', filtros.fechaInicio)
            .lte('fecha', filtros.fechaFin)
            .order('fecha', { ascending: true })
            .order('id', { ascending: true })
            .range(desde, hasta)
        ),
        fetchAnticiposPorNIT(),
      ]);

      // Excluir Donación y banco='Crédito' (no facturado)
      const facturadas = (data || []).filter(v => {
        if ((v as any).tipo_transaccion === 'Donación') return false;
        if ((v as any).banco === 'Crédito') return false;
        return true;
      });

      const formaPago = (v: any): string => {
        if (v.descuenta_anticipo) return 'Anticipo descontado';
        if (v.tipo_transaccion === 'Transferencia') return v.banco || 'Transferencia';
        return 'Efectivo';
      };

      const filas = facturadas.map(v => ({
        'Fecha': v.fecha,
        'N° Recibo': v.recibo,
        'Tipo de Arena': v.silice,
        'Cliente': (v as any).nombre_cliente || '—',
        'NIT': (v as any).nit_cliente || '—',
        'Cantidad m³': v.cantidad_m3,
        'Valor Total ($)': v.valor_total,
        'Forma de Pago': formaPago(v),
      }));

      const ws = XLSX.utils.json_to_sheet(filas);
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 28 },
        { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
      ];

      // Hoja 2: estado de anticipos por cliente (saldo actual, sin filtro de fecha)
      const filasAnticipos = saldosAnticipo.map(c => ({
        'Cliente': c.nombre,
        'NIT': c.nit,
        'Correo': c.correo || '—',
        'Anticipo Total ($)': c.totalAnticipo,
        'Consumido ($)': c.consumo,
        'Saldo Actual ($)': c.saldo,
      }));
      const wsAnticipos = XLSX.utils.json_to_sheet(filasAnticipos);
      wsAnticipos['!cols'] = [
        { wch: 28 }, { wch: 14 }, { wch: 28 },
        { wch: 18 }, { wch: 16 }, { wch: 16 },
      ];

      // Hoja 3: mismas ventas del periodo, agrupadas por cliente, tipo de arena
      // y forma de pago. Se agrupa por nombre de cliente (no por NIT) porque hay
      // ventas del mismo cliente sin NIT registrado, que si no partirían el
      // total en dos filas.
      type Grupo = { cliente: string; nits: Set<string>; silice: string; pago: string; ventas: number; m3: number; valor: number };
      const grupos = new Map<string, Grupo>();
      facturadas.forEach(v => {
        const cliente = (v as any).nombre_cliente || '—';
        const pago = formaPago(v);
        const clave = `${cliente}|${v.silice}|${pago}`;
        const g = grupos.get(clave) || { cliente, nits: new Set<string>(), silice: v.silice, pago, ventas: 0, m3: 0, valor: 0 };
        if ((v as any).nit_cliente) g.nits.add((v as any).nit_cliente);
        g.ventas += 1;
        g.m3 += Number(v.cantidad_m3);
        g.valor += Number(v.valor_total);
        grupos.set(clave, g);
      });

      const filasPorCliente = Array.from(grupos.values())
        // Cliente alfabético; dentro de cada cliente, por tipo de arena y forma de pago
        .sort((a, b) =>
          a.cliente.localeCompare(b.cliente, 'es') ||
          a.silice.localeCompare(b.silice, 'es') ||
          a.pago.localeCompare(b.pago, 'es'))
        .map(g => ({
          'Cliente': g.cliente,
          'NIT': Array.from(g.nits).join(' / ') || '—',
          'Tipo de Arena': g.silice,
          'Forma de Pago': g.pago,
          'N° Ventas': g.ventas,
          'Cantidad m³': Math.round(g.m3 * 100) / 100,
          'Valor Total ($)': Math.round(g.valor),
        }));

      const wsPorCliente = XLSX.utils.json_to_sheet(filasPorCliente);
      wsPorCliente['!cols'] = [
        { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
        { wch: 10 }, { wch: 14 }, { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Facturación');
      XLSX.utils.book_append_sheet(wb, wsAnticipos, 'Anticipos por Cliente');
      XLSX.utils.book_append_sheet(wb, wsPorCliente, 'Resumen por Cliente');
      XLSX.writeFile(wb, `reporte_facturacion_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx`);
    } catch (e) {
      console.error(e);
    } finally {
      setDescargando(false);
    }
  };

  const descargarReporteMinas = async () => {
    setDescargandoMinas(true);
    try {
      // Solo movimientos que salieron del punto de excavación: son los que
      // representan material extraído de la mina.
      const movimientos = await traerTodo<any>((desde, hasta) =>
        supabase
          .from('movimientos')
          .select('fecha, mina, silice, placa, origen, destino, cantidad_movimientos')
          .eq('origen', 'Punto de excavación')
          .gte('fecha', filtros.fechaInicio)
          .lte('fecha', filtros.fechaFin)
          .order('fecha', { ascending: true })
          .order('id', { ascending: true })
          .range(desde, hasta)
      );

      if (movimientos.length === 0) {
        toast.warning('No hay movimientos desde punto de excavación en el rango seleccionado');
        return;
      }

      type Resumen = {
        mina: string;
        movimientos: number;
        registros: number;
        m3Extraidos: number;
        m3Producidos: number;
        porSilice: Map<string, { movimientos: number; m3Extraidos: number; m3Producidos: number }>;
      };
      const minas = new Map<string, Resumen>();

      movimientos.forEach(m => {
        const mina = m.mina || '(sin mina)';
        const viajes = Number(m.cantidad_movimientos) || 0;
        // Lo que salió de la mina es el volumen transportado (capacidad × viajes);
        // los m³ producidos aplican además el factor de producción del flujo.
        const m3Extraidos = getCapacidadVolqueta(m.placa) * viajes;
        const m3Producidos =
          calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino).m3Producidos * viajes;

        const r = minas.get(mina) || {
          mina, movimientos: 0, registros: 0, m3Extraidos: 0, m3Producidos: 0,
          porSilice: new Map(),
        };
        r.movimientos += viajes;
        r.registros += 1;
        r.m3Extraidos += m3Extraidos;
        r.m3Producidos += m3Producidos;

        const s = r.porSilice.get(m.silice) || { movimientos: 0, m3Extraidos: 0, m3Producidos: 0 };
        s.movimientos += viajes;
        s.m3Extraidos += m3Extraidos;
        s.m3Producidos += m3Producidos;
        r.porSilice.set(m.silice, s);

        minas.set(mina, r);
      });

      const ordenadas = Array.from(minas.values()).sort((a, b) => b.movimientos - a.movimientos);
      const r1 = (n: number) => Math.round(n * 100) / 100;

      // Hoja 1: total por mina
      const filasResumen = ordenadas.map(r => ({
        'Mina': r.mina,
        'Registros': r.registros,
        'Movimientos': r.movimientos,
        'm³ Extraídos': r1(r.m3Extraidos),
        'm³ Producidos': r1(r.m3Producidos),
      }));
      filasResumen.push({
        'Mina': 'TOTAL',
        'Registros': ordenadas.reduce((s, r) => s + r.registros, 0),
        'Movimientos': ordenadas.reduce((s, r) => s + r.movimientos, 0),
        'm³ Extraídos': r1(ordenadas.reduce((s, r) => s + r.m3Extraidos, 0)),
        'm³ Producidos': r1(ordenadas.reduce((s, r) => s + r.m3Producidos, 0)),
      });
      const wsResumen = XLSX.utils.json_to_sheet(filasResumen);
      wsResumen['!cols'] = [{ wch: 26 }, { wch: 11 }, { wch: 13 }, { wch: 14 }, { wch: 15 }];

      // Hoja 2: mina desglosada por tipo de arena
      const filasSilice = ordenadas.flatMap(r =>
        Array.from(r.porSilice.entries())
          .sort((a, b) => a[0].localeCompare(b[0], 'es'))
          .map(([silice, s]) => ({
            'Mina': r.mina,
            'Tipo de Arena': silice,
            'Movimientos': s.movimientos,
            'm³ Extraídos': r1(s.m3Extraidos),
            'm³ Producidos': r1(s.m3Producidos),
          }))
      );
      const wsSilice = XLSX.utils.json_to_sheet(filasSilice);
      wsSilice['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 13 }, { wch: 14 }, { wch: 15 }];

      // Hoja 3: detalle de los movimientos incluidos
      const filasDetalle = movimientos.map(m => {
        const viajes = Number(m.cantidad_movimientos) || 0;
        return {
          'Fecha': m.fecha,
          'Mina': m.mina || '(sin mina)',
          'Tipo de Arena': m.silice,
          'Placa': m.placa,
          'Capacidad (m³)': getCapacidadVolqueta(m.placa),
          'Destino': m.destino,
          'Movimientos': viajes,
          'm³ Extraídos': r1(getCapacidadVolqueta(m.placa) * viajes),
          'm³ Producidos': r1(
            calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino).m3Producidos * viajes
          ),
        };
      });
      const wsDetalle = XLSX.utils.json_to_sheet(filasDetalle);
      wsDetalle['!cols'] = [
        { wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 10 },
        { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 14 }, { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por Mina');
      XLSX.utils.book_append_sheet(wb, wsSilice, 'Mina y Tipo de Arena');
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Movimientos');
      XLSX.writeFile(wb, `reporte_minas_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx`);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo generar el reporte de minas');
    } finally {
      setDescargandoMinas(false);
    }
  };

  const porcentajeVendido = stats && stats.m3Producidos > 0
    ? Math.min((stats.m3Vendidos / stats.m3Producidos) * 100, 100) : 0;
  const diferencia = stats ? stats.m3Producidos - stats.m3Vendidos : 0;

  const statCards = [
    { title: 'Ventas del Período', value: stats ? `$${stats.ventasMes.toLocaleString('es-CO')}` : '$0', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-500/10' },
    { title: 'm³ Vendidos', value: stats ? `${stats.m3Vendidos.toLocaleString('es-CO')} m³` : '0 m³', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { title: 'm³ Producidos', value: stats ? `${stats.m3Producidos.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '0 m³', icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { title: 'm³ Granzón', value: stats ? `${stats.m3Granzon.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '0 m³', icon: Layers, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
    { title: 'Total Viajes', value: stats?.totalViajes.toString() || '0', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar estadísticas: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de operaciones</p>
      </div>

      {/* ── Panel de Filtros ─────────────────────────────────────────────────── */}
      <Card className="shadow-card border-primary/10 no-print">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Filtros</CardTitle>
            {filtrosActivos && <Badge variant="secondary" className="text-xs">Activos</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Desde</p>
              <FechaPicker label="Fecha inicio" value={filtros.fechaInicio} onChange={setF('fechaInicio')} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Hasta</p>
              <FechaPicker label="Fecha fin" value={filtros.fechaFin} onChange={setF('fechaFin')} />
            </div>

            <Separator orientation="vertical" className="h-10 hidden sm:block" />

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Tipo Sílice</p>
              <Select value={filtros.tipoSilice} onValueChange={setF('tipoSilice')}>
                <SelectTrigger className="h-9 min-w-[160px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="Silice A - Peña">Sílice A — Peña</SelectItem>
                  <SelectItem value="Silice B - Pozo">Sílice B — Pozo</SelectItem>
                  <SelectItem value="Silice C - Arena Fina">Sílice C — Arena Fina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Tipo Transacción</p>
              <Select value={filtros.tipoTransaccion} onValueChange={setF('tipoTransaccion')}>
                <SelectTrigger className="h-9 min-w-[150px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="Venta">Venta</SelectItem>
                  <SelectItem value="Donación">Donación</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Fuente</p>
              <Select value={filtros.fuente} onValueChange={setF('fuente')}>
                <SelectTrigger className="h-9 min-w-[140px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="Zaranda">Zaranda</SelectItem>
                  <SelectItem value="Trituradora">Trituradora</SelectItem>
                  <SelectItem value="Clasificadora">Clasificadora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtrosActivos && (
              <Button variant="ghost" size="sm" onClick={resetFiltros} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer
              </Button>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={descargarReporteFacturacion}
                disabled={descargando}
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
              >
                {descargando
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileDown className="h-3.5 w-3.5" />}
                Reporte para Facturación
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={descargarReporteMinas}
                disabled={descargandoMinas}
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              >
                {descargandoMinas
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Mountain className="h-3.5 w-3.5" />}
                Reporte de Movimientos de Minas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Secciones ────────────────────────────────────────────────────────── */}
      <Tabs value={seccion} onValueChange={setSeccion} className="space-y-6">
        <TabsList className="no-print flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="resumen" className="gap-1.5 text-sm">
            <LayoutDashboard className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="comercial" className="gap-1.5 text-sm">
            <Users className="h-4 w-4" />
            Comercial
          </TabsTrigger>
          <TabsTrigger value="produccion" className="gap-1.5 text-sm">
            <Package className="h-4 w-4" />
            Producción
          </TabsTrigger>
          <TabsTrigger value="informe" className="gap-1.5 text-sm">
            <ClipboardList className="h-4 w-4" />
            Informe de Gestión
          </TabsTrigger>
        </TabsList>

        {/* ── Resumen ──────────────────────────────────────────────────────── */}
        <TabsContent value="resumen" className="space-y-6 focus-visible:outline-none">

      {/* ── Resumen por sección ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Ventas */}
        <Card className="shadow-card border-green-200/60 bg-gradient-to-br from-green-50/40 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
              <ShoppingCart className="h-4 w-4" />
              Resumen de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumenLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : resumen ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <ResumenChip label="Registros" value={resumen.ventas.totalRegistros.toString()} color="bg-green-50 border-green-200" />
                  <ResumenChip label="Valor total" value={`$${resumen.ventas.totalValor.toLocaleString('es-CO')}`} color="bg-emerald-50 border-emerald-200" />
                  <ResumenChip label="m³ facturados" value={`${resumen.ventas.totalM3Vendidos.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³`} color="bg-blue-50 border-blue-200" />
                  <ResumenChip label="m³ a clientes" value={`${resumen.ventas.totalM3Entregados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³`} color="bg-sky-50 border-sky-200" />
                </div>
                <p className="text-[10px] text-muted-foreground">+1 m³ de yapa por venta · {resumen.ventas.totalRegistros} venta(s) · el acopio va aparte</p>
                {resumen.ventas.porTipo.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por tipo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.ventas.porTipo.map(t => (
                        <Badge key={t.tipo} variant="outline" className={cn('text-xs',
                          t.tipo === 'Donación' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          t.tipo === 'Transferencia' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-green-50 text-green-700 border-green-200')}>
                          {t.tipo}: {t.registros} · ${t.valor.toLocaleString('es-CO')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {resumen.ventas.porSilice.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por sílice</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.ventas.porSilice.map(s => (
                        <Badge key={s.silice} variant="outline" className={cn('text-xs',
                          s.silice.includes('A') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200')}>
                          {s.silice.replace('Silice ', '')}: fact. {s.m3Vendidos.toLocaleString('es-CO', { maximumFractionDigits: 1 })} · entregado {s.m3Entregados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => navigate('/ventas')} className="text-xs text-primary hover:underline flex items-center gap-1 pt-0.5">
                  Ver detalle <ArrowUpRight className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Acopio */}
        <Card className="shadow-card border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Warehouse className="h-4 w-4" />
              Resumen de Acopio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumenLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : resumen ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <ResumenChip label="Registros" value={resumen.acopio.totalRegistros.toString()} color="bg-amber-50 border-amber-200" />
                  <ResumenChip label="Viajes" value={resumen.acopio.totalViajes.toString()} color="bg-orange-50 border-orange-200" />
                  <ResumenChip label="m³ brutos" value={resumen.acopio.totalM3.toLocaleString('es-CO', { maximumFractionDigits: 1 })} color="bg-yellow-50 border-yellow-200" />
                  <ResumenChip label="Valor acopio" value={`$${resumen.acopio.totalValor.toLocaleString('es-CO')}`} color="bg-green-50 border-green-200" />
                </div>
                {resumen.acopio.porSilice.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por sílice</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.acopio.porSilice.map(s => (
                        <Badge key={s.silice} variant="outline" className={cn('text-xs',
                          s.silice.includes('A') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200')}>
                          {s.silice.replace('Silice ', '')}: {s.m3.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³ · ${s.valor.toLocaleString('es-CO')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {resumen.acopio.porFuente.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por fuente</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.acopio.porFuente.map(f => (
                        <Badge key={f.fuente} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          {f.fuente}: {f.viajes} viajes
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Peña $75.000/m³ · Pozo $85.000/m³ · Arena Fina $180.000/m³</p>
                <button onClick={() => navigate('/acopio')} className="text-xs text-primary hover:underline flex items-center gap-1 pt-0.5">
                  Ver detalle <ArrowUpRight className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Total Combinado */}
        <Card className="shadow-card border-teal-200/60 bg-gradient-to-br from-teal-50/60 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-teal-700">
              <BadgeDollarSign className="h-4 w-4" />
              Total Combinado
            </CardTitle>
            <CardDescription className="text-xs">Ventas + Acopio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumenLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : resumen ? (
              <>
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center">
                  <p className="text-xs text-teal-600 mb-1">Ingreso total del período</p>
                  <p className="text-3xl font-bold text-teal-800">${resumen.totalCombinado.toLocaleString('es-CO')}</p>
                  <p className="mt-2 border-t border-teal-200 pt-2 text-xs text-teal-600">
                    Producto final entregado{' '}
                    <span className="font-semibold text-teal-800">
                      {resumen.productoFinalEntregado.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³
                    </span>
                  </p>
                  <p className="text-[10px] text-teal-600/80">
                    {resumen.ventas.totalM3Entregados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³ a clientes
                    {' + '}
                    {resumen.acopio.totalM3.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³ al acopio
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-green-700"><ShoppingCart className="h-3 w-3" /> Ventas</span>
                    <span className="font-semibold">${resumen.ventas.totalValor.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: resumen.totalCombinado > 0 ? `${(resumen.ventas.totalValor / resumen.totalCombinado) * 100}%` : '0%' }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-amber-700"><Warehouse className="h-3 w-3" /> Acopio</span>
                    <span className="font-semibold">${resumen.acopio.totalValor.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: resumen.totalCombinado > 0 ? `${(resumen.acopio.totalValor / resumen.totalCombinado) * 100}%` : '0%' }} />
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Movimientos */}
        <Card className="shadow-card border-purple-200/60 bg-gradient-to-br from-purple-50/40 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-700">
              <Activity className="h-4 w-4" />
              Resumen de Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumenLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : resumen ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <ResumenChip label="Registros" value={resumen.movimientos.totalRegistros.toString()} color="bg-purple-50 border-purple-200" />
                  <ResumenChip label="Movimientos" value={resumen.movimientos.totalMovimientos.toString()} color="bg-violet-50 border-violet-200" />
                  <ResumenChip label="m³ prod." value={resumen.movimientos.totalM3Producidos.toLocaleString('es-CO', { maximumFractionDigits: 1 })} color="bg-indigo-50 border-indigo-200" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  m³ de arena procesada aplicando los factores de producción (PF) por tipo de movimiento.
                </p>
                <button onClick={() => navigate('/movimientos')} className="text-xs text-primary hover:underline flex items-center gap-1 pt-0.5">
                  Ver detalle <ArrowUpRight className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        {/* ── Comercial ────────────────────────────────────────────────────── */}
        <TabsContent value="comercial" className="space-y-6 focus-visible:outline-none">

      {/* ── Ventas por Fuente ───────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            m³ Vendidos por Fuente
          </CardTitle>
          <CardDescription>Desglose de ventas según el origen del material (Zaranda, Trituradora, Clasificadora)</CardDescription>
        </CardHeader>
        <CardContent>
          {resumenLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : resumen && resumen.porFuente.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay ventas en el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Totales de referencia para las barras */}
              {(() => {
                const totalM3 = resumen?.porFuente.reduce((s, f) => s + f.m3Facturados, 0) || 1;
                const colores: Record<string, { bar: string; badge: string; text: string }> = {
                  'Zaranda':      { bar: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200',      text: 'text-amber-700' },
                  'Trituradora':  { bar: 'bg-slate-500',  badge: 'bg-slate-50 text-slate-700 border-slate-200',      text: 'text-slate-700' },
                  'Clasificadora':{ bar: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700 border-teal-200',         text: 'text-teal-700' },
                };
                return resumen?.porFuente.map(f => {
                  const pct = Math.round((f.m3Facturados / totalM3) * 100);
                  const col = colores[f.fuente] || { bar: 'bg-gray-400', badge: 'bg-gray-50 text-gray-700 border-gray-200', text: 'text-gray-700' };
                  return (
                    <div key={f.fuente} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className={`${col.badge} text-xs shrink-0`}>{f.fuente}</Badge>
                          <span className="text-xs text-muted-foreground">{f.registros} venta(s)</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-sm tabular-nums">
                          <div className="text-right">
                            <span className="text-muted-foreground text-xs">Facturado </span>
                            <span className="font-medium">{f.m3Facturados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground text-xs">Entregado </span>
                            <span className="font-medium text-sky-700">{f.m3Entregados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³</span>
                          </div>
                          <div className="text-right min-w-[90px]">
                            <span className="font-semibold text-green-700">${f.valorTotal.toLocaleString('es-CO')}</span>
                          </div>
                          <span className={`text-xs font-semibold w-9 text-right ${col.text}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`${col.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Resumen de Clientes ──────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Resumen de Clientes
              </CardTitle>
              <CardDescription>
                {resumen
                  ? verTodosClientes || resumen.clientes.length <= TOP_CLIENTES
                    ? `${resumen.clientes.length} cliente(s) con compras en el período`
                    : `Top ${TOP_CLIENTES} por valor, de ${resumen.clientes.length} cliente(s) en el período`
                  : 'Cargando…'}
              </CardDescription>
            </div>
            <button onClick={() => navigate('/ventas')} className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver ventas <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {resumenLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : resumen && resumen.clientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay clientes en el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">Cliente</th>
                    <th className="text-left pb-2 pr-4 font-medium">Placa</th>
                    <th className="text-center pb-2 pr-4 font-medium">Compras</th>
                    <th className="text-right pb-2 pr-4 font-medium">m³ facturados</th>
                    <th className="text-right pb-2 pr-4 font-medium">m³ entregados</th>
                    <th className="text-right pb-2 pr-4 font-medium">Valor total</th>
                    <th className="text-left pb-2 pr-4 font-medium">Sílice(s)</th>
                    <th className="text-left pb-2 font-medium">Última compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(verTodosClientes ? resumen?.clientes : resumen?.clientes.slice(0, TOP_CLIENTES))?.map((c) => (
                    <tr key={c.placa} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground leading-tight">
                              {c.tieneNombre ? c.nombre : <span className="text-muted-foreground italic">Sin nombre</span>}
                            </p>
                            {c.tiposTransaccion.map(t => (
                              <Badge key={t} variant="outline" className={cn('text-[10px] px-1 py-0 mr-0.5',
                                t === 'Donación' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                t === 'Transferencia' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-green-50 text-green-700 border-green-200')}>
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground tracking-widest">{c.placa}</td>
                      <td className="py-3 pr-4 text-center">
                        <Badge variant="secondary" className="text-xs">{c.totalCompras}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {c.m3Facturados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-sky-700 font-medium">
                        {c.m3Entregados.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m³
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums font-semibold text-green-700">
                        ${c.valorTotal.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {c.silices.map(s => (
                            <Badge key={s} variant="outline" className={cn('text-[10px] px-1.5 py-0',
                              s.includes('A') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200')}>
                              {s.replace('Silice ', '')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{c.ultimaCompra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {resumen && resumen.clientes.length > TOP_CLIENTES && (
                <div className="pt-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVerTodosClientes(v => !v)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {verTodosClientes
                      ? `Ver solo el top ${TOP_CLIENTES}`
                      : `Ver los ${resumen.clientes.length} clientes`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Saldos de Anticipo ──────────────────────────────────────────────── */}
      {resumen && resumen.anticiposPorNIT.length > 0 && (
        <Card className="shadow-card border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Wallet className="h-4 w-4" />
              Saldos de Anticipo
            </CardTitle>
            <CardDescription className="text-xs">Los pagos contra anticipo no se suman al total de ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">Cliente</th>
                    <th className="text-left pb-2 pr-4 font-medium">NIT</th>
                    <th className="text-right pb-2 pr-4 font-medium">Anticipo total</th>
                    <th className="text-right pb-2 pr-4 font-medium">Consumido</th>
                    <th className="text-right pb-2 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {resumen.anticiposPorNIT.map(a => (
                    <tr key={a.nit} className="hover:bg-muted/30">
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{a.nombre}</span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{a.nit}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-amber-700 font-semibold">${a.totalAnticipo.toLocaleString('es-CO')}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">${a.consumo.toLocaleString('es-CO')}</td>
                      <td className={cn("py-2 text-right tabular-nums font-bold", a.saldo >= 0 ? "text-green-700" : "text-red-600")}>
                        {a.saldo < 0 && '-'}${Math.abs(a.saldo).toLocaleString('es-CO')}
                        {a.saldo < 0 && <span className="text-[10px] font-normal ml-1">(excedido)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

        </TabsContent>

        {/* ── Producción ───────────────────────────────────────────────────── */}
        <TabsContent value="produccion" className="space-y-6 focus-visible:outline-none">

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="shadow-card hover:shadow-elevated transition-shadow duration-300" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Producción vs Ventas ─────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            Producción vs Ventas
          </CardTitle>
          <CardDescription>Comparación de m³ de arena producidos vs vendidos</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-20 w-full" /></div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendido del total producido</span>
                  <span className="font-semibold">{porcentajeVendido.toFixed(1)}%</span>
                </div>
                <Progress value={porcentajeVendido} className="h-3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Producido</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-800">
                    {stats?.m3Producidos.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                  </p>
                  <p className="text-xs text-amber-600 mt-1">{stats?.totalViajes} viajes registrados</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Granzón</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-800">
                    {stats?.m3Granzon.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Residuo grueso de zaranda (9.9%)</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Vendido</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">{stats?.m3Vendidos.toLocaleString('es-CO')} m³</p>
                  <p className="text-xs text-blue-600 mt-1">En el período</p>
                </div>
                <div className={`p-4 rounded-xl ${diferencia >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`h-5 w-5 ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-sm font-medium ${diferencia >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {diferencia >= 0 ? 'Disponible' : 'Déficit'}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${diferencia >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {Math.abs(diferencia).toLocaleString('es-CO')} m³
                  </p>
                  <p className={`text-xs ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
                    {diferencia >= 0 ? 'En inventario' : 'Vendido más de lo producido'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Gráficas principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProduccionDiariaLineChart
          tipoSilice={filtros.tipoSilice}
          fechaInicio={filtros.fechaInicio}
          fechaFin={filtros.fechaFin}
        />
        <MovimientosExcavacionChart
          tipoSilice={filtros.tipoSilice}
          fechaInicio={filtros.fechaInicio}
          fechaFin={filtros.fechaFin}
        />
      </div>

      <VolquetasBalanceChart
        tipoSilice={filtros.tipoSilice}
        fechaInicio={filtros.fechaInicio}
        fechaFin={filtros.fechaFin}
      />

        </TabsContent>

        {/* ── Informe de Gestión ───────────────────────────────────────────── */}
        <TabsContent value="informe" className="focus-visible:outline-none">
          <InformeGerencial filtros={filtros} />
        </TabsContent>

      </Tabs>

    </div>
  );
};

export default Dashboard;
