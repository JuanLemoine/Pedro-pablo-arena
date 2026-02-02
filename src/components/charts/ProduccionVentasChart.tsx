import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, BarChart3, Mountain } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProduccionVentas, TipoAgrupacion, TipoSilice } from '@/hooks/useProduccionVentas';
import { cn } from '@/lib/utils';

const ProduccionVentasChart = () => {
  const [agrupacion, setAgrupacion] = useState<TipoAgrupacion>('diario');
  const [tipoSilice, setTipoSilice] = useState<TipoSilice>('todos');
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined);
  const [fechaFin, setFechaFin] = useState<Date | undefined>(undefined);
  const [openInicio, setOpenInicio] = useState(false);
  const [openFin, setOpenFin] = useState(false);

  const { data, isLoading, error } = useProduccionVentas({
    agrupacion,
    tipoSilice,
    fechaInicio,
    fechaFin
  });

  const limpiarFiltros = () => {
    setFechaInicio(undefined);
    setFechaFin(undefined);
    setTipoSilice('todos');
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Producción vs Ventas
              </CardTitle>
              <CardDescription>
                Comparación de m³ producidos y vendidos en el tiempo
              </CardDescription>
            </div>

            {/* Controles de filtro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Selector de tipo de sílice */}
              <Select value={tipoSilice} onValueChange={(v) => setTipoSilice(v as TipoSilice)}>
                <SelectTrigger className="w-[160px] text-xs h-9">
                  <SelectValue placeholder="Tipo de sílice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="Silice A - Peña">Sílice A - Peña</SelectItem>
                  <SelectItem value="Silice B - Pozo">Sílice B - Pozo</SelectItem>
                </SelectContent>
              </Select>

              {/* Botones de agrupación */}
              <div className="flex rounded-lg border border-input p-1 bg-muted/30">
                <Button
                  variant={agrupacion === 'diario' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAgrupacion('diario')}
                  className="text-xs h-7"
                >
                  Diario
                </Button>
                <Button
                  variant={agrupacion === 'semanal' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAgrupacion('semanal')}
                  className="text-xs h-7"
                >
                  Semanal
                </Button>
                <Button
                  variant={agrupacion === 'mensual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAgrupacion('mensual')}
                  className="text-xs h-7"
                >
                  Mensual
                </Button>
              </div>

              {/* Selector de fecha inicio */}
              <Popover open={openInicio} onOpenChange={setOpenInicio}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs justify-start h-9",
                      !fechaInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {fechaInicio ? format(fechaInicio, 'dd/MM/yy') : 'Desde'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicio}
                    onSelect={(date) => {
                      setFechaInicio(date);
                      setOpenInicio(false);
                    }}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              {/* Selector de fecha fin */}
              <Popover open={openFin} onOpenChange={setOpenFin}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs justify-start h-9",
                      !fechaFin && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {fechaFin ? format(fechaFin, 'dd/MM/yy') : 'Hasta'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={(date) => {
                      setFechaFin(date);
                      setOpenFin(false);
                    }}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              {/* Botón limpiar */}
              {(fechaInicio || fechaFin || tipoSilice !== 'todos') && (
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
          </div>

          {/* Resumen por tipo de sílice */}
          {!isLoading && data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              {data.resumenPorTipo.map((item) => (
                <div
                  key={item.tipo}
                  className={cn(
                    "p-3 rounded-lg border",
                    item.tipo.includes('A') 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-purple-50 border-purple-200"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Mountain className={cn(
                      "h-4 w-4",
                      item.tipo.includes('A') ? "text-blue-600" : "text-purple-600"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      item.tipo.includes('A') ? "text-blue-700" : "text-purple-700"
                    )}>
                      {item.tipo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={cn(
                        "text-xs",
                        item.tipo.includes('A') ? "text-blue-600" : "text-purple-600"
                      )}>
                        Producido
                      </p>
                      <p className={cn(
                        "text-lg font-bold",
                        item.tipo.includes('A') ? "text-blue-800" : "text-purple-800"
                      )}>
                        {item.producido.toLocaleString()} m³
                      </p>
                    </div>
                    <div>
                      <p className={cn(
                        "text-xs",
                        item.tipo.includes('A') ? "text-blue-600" : "text-purple-600"
                      )}>
                        Vendido
                      </p>
                      <p className={cn(
                        "text-lg font-bold",
                        item.tipo.includes('A') ? "text-blue-800" : "text-purple-800"
                      )}>
                        {item.vendido.toLocaleString()} m³
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen de totales filtrados */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-sm text-muted-foreground">
                Producido{tipoSilice !== 'todos' ? ` (${tipoSilice})` : ''}: 
                <span className="font-semibold text-foreground ml-1">
                  {data?.totalProducido.toLocaleString() || 0} m³
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-sm text-muted-foreground">
                Vendido{tipoSilice !== 'todos' ? ` (${tipoSilice})` : ''}: 
                <span className="font-semibold text-foreground ml-1">
                  {data?.totalVendido.toLocaleString() || 0} m³
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="h-[350px] flex items-center justify-center text-destructive">
            Error al cargar datos: {error.message}
          </div>
        ) : isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : data && data.datos.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.datos}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 88%)" />
                <XAxis
                  dataKey="fechaLabel"
                  stroke="hsl(30, 15%, 45%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(30, 15%, 45%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  label={{
                    value: 'm³',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: 'hsl(30, 15%, 45%)', fontSize: 12 }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(40, 25%, 99%)',
                    border: '1px solid hsl(35, 20%, 88%)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} m³`,
                    name === 'producido' ? 'Producido' : 'Vendido'
                  ]}
                  labelFormatter={(label) => `Periodo: ${label}`}
                />
                <Legend
                  formatter={(value) => value === 'producido' ? 'Producido' : 'Vendido'}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar
                  dataKey="producido"
                  fill="hsl(32, 80%, 50%)"
                  name="producido"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="vendido"
                  fill="hsl(210, 80%, 50%)"
                  name="vendido"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay datos para mostrar en este periodo</p>
              <p className="text-sm mt-1">Registra movimientos y ventas para ver la gráfica</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduccionVentasChart;
