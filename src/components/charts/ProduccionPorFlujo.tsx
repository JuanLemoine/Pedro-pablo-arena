import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  CalendarIcon, 
  Download, 
  Filter, 
  Truck, 
  Package,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProduccionPorFlujo, FiltrosProduccion } from '@/hooks/useProduccionPorFlujo';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const SILICES = ['Silice A - Peña', 'Silice B - Pozo'];
const ORIGENES = ['Punto de excavación', 'Zaranda'];
const DESTINOS = ['Zaranda', 'Trituradora', 'Clasificadora'];

const ProduccionPorFlujo = () => {
  const [filtros, setFiltros] = useState<FiltrosProduccion>({});
  const [openFechaInicio, setOpenFechaInicio] = useState(false);
  const [openFechaFin, setOpenFechaFin] = useState(false);

  const { data, isLoading, error } = useProduccionPorFlujo(filtros);

  const limpiarFiltros = () => {
    setFiltros({});
  };

  const tieneFiltos = filtros.silice || filtros.origen || filtros.destino || filtros.fechaInicio || filtros.fechaFin;

  // Función para exportar producción a Excel
  const exportarProduccionExcel = () => {
    if (!data) return;

    // Hoja 1: Resumen por flujo
    const resumenData = data.produccionPorFlujo.map(flujo => ({
      'Sílice Original': flujo.silice,
      'Sílice Resultante': flujo.siliceResultante,
      'Origen': flujo.origen,
      'Destino': flujo.destino,
      'Viajes': flujo.viajes,
      'm³ Producidos': Math.round(flujo.m3Producidos * 100) / 100,
    }));

    // Agregar fila de totales
    resumenData.push({
      'Sílice Original': 'TOTAL',
      'Sílice Resultante': '',
      'Origen': '',
      'Destino': '',
      'Viajes': data.totales.viajes,
      'm³ Producidos': Math.round(data.totales.m3Producidos * 100) / 100,
    });

    // Hoja 2: Detalle de movimientos
    const detalleData = data.movimientosDetallados.map(mov => ({
      'Fecha': mov.fecha,
      'Mina': mov.mina,
      'Sílice Original': mov.silice,
      'Sílice Resultante': mov.siliceResultante,
      'Placa': mov.placa,
      'Origen': mov.origen,
      'Destino': mov.destino,
      'm³ Producidos': Math.round(mov.m3Producidos * 100) / 100,
    }));

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen por Flujo');
    
    const ws2 = XLSX.utils.json_to_sheet(detalleData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Movimientos');

    const fecha = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `produccion_arena_${fecha}.xlsx`);
  };

  // Función para exportar ventas a Excel
  const exportarVentasExcel = () => {
    if (!data) return;

    const ventasData = data.ventasDetalladas.map(venta => ({
      'Fecha': venta.fecha,
      'Placa': venta.placa,
      'Sílice': venta.silice,
      'm³ Registrados': venta.cantidad_m3,
      'm³ con Yapa (+1)': venta.cantidad_m3_con_yapa,
      'Valor Total': venta.valor_total,
    }));

    // Agregar fila de totales
    ventasData.push({
      'Fecha': 'TOTAL',
      'Placa': '',
      'Sílice': '',
      'm³ Registrados': data.ventasDetalladas.reduce((sum, v) => sum + v.cantidad_m3, 0),
      'm³ con Yapa (+1)': data.totales.m3Vendidos,
      'Valor Total': data.totales.valorVentas,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    const fecha = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `ventas_arena_${fecha}.xlsx`);
  };

  const getSiliceBadge = (silice: string, esResultante: boolean = false) => {
    const isA = silice.includes('A');
    return (
      <Badge 
        variant="outline" 
        className={cn(
          isA ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-cyan-100 text-cyan-700 border-cyan-200',
          esResultante && 'ring-2 ring-offset-1 ring-green-400'
        )}
      >
        {silice.replace('Silice ', '')}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    const isZaranda = origen === 'Zaranda';
    return (
      <Badge variant="outline" className={isZaranda ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
        {origen}
      </Badge>
    );
  };

  const getDestinoBadge = (destino: string) => {
    const colors: Record<string, string> = {
      'Trituradora': 'bg-slate-100 text-slate-700 border-slate-200',
      'Clasificadora': 'bg-teal-100 text-teal-700 border-teal-200',
      'Zaranda': 'bg-violet-100 text-violet-700 border-violet-200',
    };
    return (
      <Badge variant="outline" className={colors[destino] || 'bg-gray-100 text-gray-700'}>
        {destino}
      </Badge>
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Producción por Flujo (Origen → Destino)
              </CardTitle>
              <CardDescription>
                Resumen de m³ producidos y viajes por cada combinación de origen y destino
              </CardDescription>
            </div>

            {/* Botones de exportación */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportarProduccionExcel}
                disabled={!data || data.movimientosDetallados.length === 0}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Producción
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarVentasExcel}
                disabled={!data || data.ventasDetalladas.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Ventas
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Filtro de sílice */}
            <Select 
              value={filtros.silice || 'todos'} 
              onValueChange={(v) => setFiltros({ ...filtros, silice: v === 'todos' ? undefined : v })}
            >
              <SelectTrigger className="w-[150px] text-xs h-9">
                <SelectValue placeholder="Sílice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {SILICES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de origen */}
            <Select 
              value={filtros.origen || 'todos'} 
              onValueChange={(v) => setFiltros({ ...filtros, origen: v === 'todos' ? undefined : v })}
            >
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ORIGENES.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de destino */}
            <Select 
              value={filtros.destino || 'todos'} 
              onValueChange={(v) => setFiltros({ ...filtros, destino: v === 'todos' ? undefined : v })}
            >
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {DESTINOS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fecha inicio */}
            <Popover open={openFechaInicio} onOpenChange={setOpenFechaInicio}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs justify-start h-9",
                    !filtros.fechaInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {filtros.fechaInicio ? format(new Date(filtros.fechaInicio), 'dd/MM/yy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined}
                  onSelect={(date) => {
                    setFiltros({ ...filtros, fechaInicio: date ? format(date, 'yyyy-MM-dd') : undefined });
                    setOpenFechaInicio(false);
                  }}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            {/* Fecha fin */}
            <Popover open={openFechaFin} onOpenChange={setOpenFechaFin}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs justify-start h-9",
                    !filtros.fechaFin && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {filtros.fechaFin ? format(new Date(filtros.fechaFin), 'dd/MM/yy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filtros.fechaFin ? new Date(filtros.fechaFin) : undefined}
                  onSelect={(date) => {
                    setFiltros({ ...filtros, fechaFin: date ? format(date, 'yyyy-MM-dd') : undefined });
                    setOpenFechaFin(false);
                  }}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            {/* Botón limpiar */}
            {tieneFiltos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="text-xs text-muted-foreground h-9"
              >
                Limpiar
              </Button>
            )}
          </div>

          {/* Totales */}
          {!isLoading && data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-600">Total Viajes</p>
                <p className="text-xl font-bold text-amber-800 flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  {data.totales.viajes}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600">m³ Producidos</p>
                <p className="text-xl font-bold text-blue-800">
                  {data.totales.m3Producidos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs text-green-600">m³ Vendidos</p>
                <p className="text-xl font-bold text-green-800">
                  {data.totales.m3Vendidos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-600">Valor Ventas</p>
                <p className="text-xl font-bold text-purple-800">
                  ${data.totales.valorVentas.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-8 text-destructive">
            Error al cargar datos: {error.message}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.produccionPorFlujo.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sílice</TableHead>
                  <TableHead>Flujo</TableHead>
                  <TableHead>Sílice Resultante</TableHead>
                  <TableHead className="text-center">Viajes</TableHead>
                  <TableHead className="text-right">m³ Producidos</TableHead>
                  <TableHead className="text-right">% del Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.produccionPorFlujo.map((flujo, index) => {
                  const porcentaje = data.totales.m3Producidos > 0 
                    ? (flujo.m3Producidos / data.totales.m3Producidos) * 100 
                    : 0;
                  const cambioSilice = flujo.silice !== flujo.siliceResultante;
                  
                  return (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell>{getSiliceBadge(flujo.silice)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getOrigenBadge(flujo.origen)}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getDestinoBadge(flujo.destino)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getSiliceBadge(flujo.siliceResultante, cambioSilice)}
                          {cambioSilice && (
                            <span className="text-xs text-green-600 font-medium">(convertido)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-bold">
                          {flujo.viajes}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {flujo.m3Producidos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(porcentaje, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {porcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos de producción para mostrar</p>
            <p className="text-sm mt-1">Registra movimientos internos para ver el resumen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduccionPorFlujo;
