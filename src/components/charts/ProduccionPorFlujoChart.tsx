import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';
import { useProduccionPorFlujo } from '@/hooks/useProduccionPorFlujo';

const COLORES_FLUJO = [
  'hsl(32, 80%, 50%)',   // Amber
  'hsl(210, 80%, 50%)',  // Blue
  'hsl(150, 70%, 45%)',  // Green
  'hsl(280, 70%, 55%)',  // Purple
  'hsl(350, 75%, 55%)',  // Red
  'hsl(180, 70%, 45%)',  // Teal
  'hsl(45, 90%, 50%)',   // Yellow
  'hsl(320, 70%, 55%)',  // Pink
];

const ProduccionPorFlujoChart = () => {
  const [filtroSilice, setFiltroSilice] = useState<string>('todos');
  
  const { data, isLoading, error } = useProduccionPorFlujo({
    silice: filtroSilice === 'todos' ? undefined : filtroSilice,
  });

  // Preparar datos para la gráfica
  const chartData = data?.produccionPorFlujo.map((flujo, index) => ({
    name: `${flujo.origen.replace('Punto de excavación', 'Excavación')} → ${flujo.destino}`,
    fullName: `${flujo.origen} → ${flujo.destino}`,
    silice: flujo.silice.replace('Silice ', ''),
    siliceResultante: flujo.siliceResultante.replace('Silice ', ''),
    m3: Math.round(flujo.m3Producidos * 100) / 100,
    viajes: flujo.viajes,
    color: COLORES_FLUJO[index % COLORES_FLUJO.length],
  })) || [];

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 flex items-center gap-1">
            {data.fullName}
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-gray-600">
              Sílice: <span className="font-medium">{data.silice}</span>
              {data.silice !== data.siliceResultante && (
                <span className="text-green-600 ml-1">→ {data.siliceResultante}</span>
              )}
            </p>
            <p className="text-blue-600">
              Producción: <span className="font-bold">{data.m3.toLocaleString()} m³</span>
            </p>
            <p className="text-purple-600">
              Viajes: <span className="font-bold">{data.viajes}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Producción por Flujo
            </CardTitle>
            <CardDescription>
              m³ de arena producidos por cada combinación de origen → destino
            </CardDescription>
          </div>
          
          <Select 
            value={filtroSilice} 
            onValueChange={setFiltroSilice}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por sílice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="Silice A - Peña">Sílice A - Peña</SelectItem>
              <SelectItem value="Silice B - Pozo">Sílice B - Pozo</SelectItem>
            </SelectContent>
          </Select>
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
        ) : chartData.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 88%)" />
                <XAxis
                  type="number"
                  stroke="hsl(30, 15%, 45%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value} m³`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(30, 15%, 45%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={() => 'm³ Producidos'}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Bar
                  dataKey="m3"
                  name="m³ Producidos"
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay datos de producción para mostrar</p>
              <p className="text-sm mt-1">Registra movimientos internos para ver la gráfica</p>
            </div>
          </div>
        )}

        {/* Leyenda de flujos */}
        {!isLoading && chartData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Detalle por flujo:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {chartData.map((flujo, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: flujo.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">{flujo.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{flujo.m3.toLocaleString()} m³</span>
                      <span className="text-muted-foreground">({flujo.viajes} viajes)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduccionPorFlujoChart;
