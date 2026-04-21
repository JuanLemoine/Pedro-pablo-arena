import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardResumen } from '@/hooks/useDashboardResumen';
import ProduccionVentasChart from '@/components/charts/ProduccionVentasChart';
import ProgresoMensualChart from '@/components/charts/ProgresoMensualChart';
import ProduccionPorFlujoChart from '@/components/charts/ProduccionPorFlujoChart';
import ProduccionPorFlujo from '@/components/charts/ProduccionPorFlujo';
import ProyeccionProduccion from '@/components/charts/ProyeccionProduccion';
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

const Dashboard = () => {
  const navigate = useNavigate();

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [filtros, setFiltros] = useState<Filtros>({
    fechaInicio: DEFAULT_INICIO,
    fechaFin: DEFAULT_FIN,
    tipoSilice: 'todos',
    tipoTransaccion: 'todos',
  });

  const resetFiltros = useCallback(() => {
    setFiltros({ fechaInicio: DEFAULT_INICIO, fechaFin: DEFAULT_FIN, tipoSilice: 'todos', tipoTransaccion: 'todos' });
  }, []);

  const setF = (key: keyof Filtros) => (val: string) => setFiltros(prev => ({ ...prev, [key]: val }));

  const filtrosActivos =
    filtros.fechaInicio !== DEFAULT_INICIO ||
    filtros.fechaFin !== DEFAULT_FIN ||
    filtros.tipoSilice !== 'todos' ||
    filtros.tipoTransaccion !== 'todos';

  // ── Datos ───────────────────────────────────────────────────────────────────
  const { data: stats, isLoading, error } = useDashboardStats({
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    tipoSilice: filtros.tipoSilice,
  });

  const { data: resumen, isLoading: resumenLoading } = useDashboardResumen(filtros);

  const porcentajeVendido = stats && stats.m3Producidos > 0
    ? Math.min((stats.m3Vendidos / stats.m3Producidos) * 100, 100) : 0;
  const diferencia = stats ? stats.m3Producidos - stats.m3Vendidos : 0;

  const statCards = [
    { title: 'Ventas del Período', value: stats ? `$${stats.ventasMes.toLocaleString()}` : '$0', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-500/10' },
    { title: 'm³ Vendidos', value: stats ? `${stats.m3Vendidos.toLocaleString()} m³` : '0 m³', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { title: 'm³ Producidos', value: stats ? `${stats.m3Producidos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '0 m³', icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { title: 'm³ Granzón', value: stats ? `${stats.m3Granzon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³` : '0 m³', icon: Layers, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
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
      <Card className="shadow-card border-primary/10">
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

            {filtrosActivos && (
              <Button variant="ghost" size="sm" onClick={resetFiltros} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <ResumenChip label="Valor total" value={`$${resumen.ventas.totalValor.toLocaleString()}`} color="bg-emerald-50 border-emerald-200" />
                  <ResumenChip label="m³ facturados" value={`${resumen.ventas.totalM3Vendidos.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³`} color="bg-blue-50 border-blue-200" />
                  <ResumenChip label="m³ entregados" value={`${resumen.ventas.totalM3Entregados.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³`} color="bg-sky-50 border-sky-200" />
                </div>
                <p className="text-[10px] text-muted-foreground">+1 m³ de yapa por venta · {resumen.ventas.totalRegistros} venta(s)</p>
                {resumen.ventas.porTipo.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por tipo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.ventas.porTipo.map(t => (
                        <Badge key={t.tipo} variant="outline" className={cn('text-xs',
                          t.tipo === 'Donación' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          t.tipo === 'Transferencia' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-green-50 text-green-700 border-green-200')}>
                          {t.tipo}: {t.registros} · ${t.valor.toLocaleString()}
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
                          {s.silice.replace('Silice ', '')}: fact. {s.m3Vendidos.toLocaleString(undefined, { maximumFractionDigits: 1 })} · entregado {s.m3Entregados.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
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
                  <ResumenChip label="m³ brutos" value={resumen.acopio.totalM3.toLocaleString(undefined, { maximumFractionDigits: 1 })} color="bg-yellow-50 border-yellow-200" />
                  <ResumenChip label="Valor acopio" value={`$${resumen.acopio.totalValor.toLocaleString()}`} color="bg-green-50 border-green-200" />
                </div>
                {resumen.acopio.porSilice.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Por sílice</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumen.acopio.porSilice.map(s => (
                        <Badge key={s.silice} variant="outline" className={cn('text-xs',
                          s.silice.includes('A') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200')}>
                          {s.silice.replace('Silice ', '')}: {s.m3.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³ · ${s.valor.toLocaleString()}
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
                <p className="text-[10px] text-muted-foreground">Peña $75.000/m³ · Pozo $85.000/m³</p>
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
                  <p className="text-3xl font-bold text-teal-800">${resumen.totalCombinado.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-green-700"><ShoppingCart className="h-3 w-3" /> Ventas</span>
                    <span className="font-semibold">${resumen.ventas.totalValor.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: resumen.totalCombinado > 0 ? `${(resumen.ventas.totalValor / resumen.totalCombinado) * 100}%` : '0%' }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-amber-700"><Warehouse className="h-3 w-3" /> Acopio</span>
                    <span className="font-semibold">${resumen.acopio.totalValor.toLocaleString()}</span>
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
                  <ResumenChip label="m³ prod." value={resumen.movimientos.totalM3Producidos.toLocaleString(undefined, { maximumFractionDigits: 1 })} color="bg-indigo-50 border-indigo-200" />
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
                    {stats?.m3Producidos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                  </p>
                  <p className="text-xs text-amber-600 mt-1">{stats?.totalViajes} viajes registrados</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Granzón</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-800">
                    {stats?.m3Granzon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Residuo grueso de zaranda (9.9%)</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Vendido</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">{stats?.m3Vendidos.toLocaleString()} m³</p>
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
                    {Math.abs(diferencia).toLocaleString()} m³
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
        <ProduccionVentasChart tipoSilice={filtros.tipoSilice} fechaInicio={filtros.fechaInicio} fechaFin={filtros.fechaFin} />
        <ProgresoMensualChart />
      </div>

      <ProduccionPorFlujoChart />
      <ProyeccionProduccion />
      <ProduccionPorFlujo />

      {/* ── Ventas Recientes ─────────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Ventas Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas</CardDescription>
          </div>
          <button onClick={() => navigate('/ventas')} className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : stats?.ventasRecientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay ventas registradas aún</p>
              <button onClick={() => navigate('/ventas')} className="mt-2 text-primary hover:underline text-sm">
                Registrar primera venta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.ventasRecientes.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{sale.placa}</p>
                      <p className="text-sm text-muted-foreground">{sale.silice} • {sale.cantidad_m3} m³</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${Number(sale.valor_total).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{sale.fecha}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Acciones Rápidas ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" onClick={() => navigate('/ventas')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Nueva Venta</p>
                <p className="text-sm text-blue-700">Registrar venta de sílice</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200" onClick={() => navigate('/acopio')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Nuevo Acopio</p>
                <p className="text-sm text-amber-700">Registrar viajes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-green-50 to-green-100 border-green-200" onClick={() => navigate('/movimientos')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Nuevo Movimiento</p>
                <p className="text-sm text-green-700">Movimiento interno</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
