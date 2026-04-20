import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useProduccionVentas } from '@/hooks/useProduccionVentas';

const ProduccionVentasChart = () => {
  const { data, isLoading, error } = useProduccionVentas({
    agrupacion: 'diario',
    tipoSilice: 'todos',
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Producción vs Ventas — últimos 14 días
            </CardTitle>
            <CardDescription>
              m³ de arena producidos y vendidos por día
            </CardDescription>
          </div>
          {/* Totales rápidos */}
          {!isLoading && data && (
            <div className="flex gap-4 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Producido</p>
                <p className="font-bold text-amber-600">
                  {data.totalProducido.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="font-bold text-blue-600">
                  {data.totalVendido.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                </p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="h-[280px] flex items-center justify-center text-destructive text-sm">
            Error al cargar datos
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data && data.datos.length > 0 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.datos}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,90%)" vertical={false} />
                <XAxis
                  dataKey="fechaLabel"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(30,15%,50%)"
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(30,15%,50%)"
                  tickFormatter={v => `${v}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid hsl(35,20%,88%)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³`,
                    name === 'producido' ? 'Producido' : 'Vendido',
                  ]}
                  labelFormatter={label => `Día: ${label}`}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={v => (v === 'producido' ? 'Producido' : 'Vendido')}
                />
                <Bar dataKey="producido" fill="hsl(32,80%,50%)" radius={[4, 4, 0, 0]} name="producido" />
                <Bar dataKey="vendido" fill="hsl(210,75%,52%)" radius={[4, 4, 0, 0]} name="vendido" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <BarChart3 className="h-10 w-10 opacity-40" />
            <p className="text-sm">No hay datos en los últimos 14 días</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduccionVentasChart;
