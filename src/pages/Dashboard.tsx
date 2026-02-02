import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Package,
  ArrowUpRight,
  BarChart3,
  ArrowDownUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import ProduccionVentasChart from '@/components/charts/ProduccionVentasChart';
import ProduccionPorFlujoChart from '@/components/charts/ProduccionPorFlujoChart';
import ProduccionPorFlujo from '@/components/charts/ProduccionPorFlujo';
import ProyeccionProduccion from '@/components/charts/ProyeccionProduccion';

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useDashboardStats();

  // Calcular porcentaje de vendido vs producido
  const porcentajeVendido = stats && stats.m3Producidos > 0 
    ? Math.min((stats.m3Vendidos / stats.m3Producidos) * 100, 100) 
    : 0;

  const diferencia = stats ? stats.m3Producidos - stats.m3Vendidos : 0;

  const statCards = [
    {
      title: 'Ventas del Mes',
      value: stats ? `$${stats.ventasMes.toLocaleString()}` : '$0',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'm³ Vendidos',
      value: stats ? `${stats.m3Vendidos.toLocaleString()} m³` : '0 m³',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'm³ Producidos',
      value: stats ? `${stats.m3Producidos.toLocaleString()} m³` : '0 m³',
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Total Viajes',
      value: stats?.totalViajes.toString() || '0',
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de operaciones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="shadow-card hover:shadow-elevated transition-shadow duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
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

      {/* Producción vs Ventas Card */}
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
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendido del total producido</span>
                  <span className="font-semibold">{porcentajeVendido.toFixed(1)}%</span>
                </div>
                <Progress value={porcentajeVendido} className="h-3" />
              </div>

              {/* Estadísticas detalladas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">Producido</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-800">
                    {stats?.m3Producidos.toLocaleString()} m³
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {stats?.totalViajes} viajes registrados
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Vendido</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {stats?.m3Vendidos.toLocaleString()} m³
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Este mes
                  </p>
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

      {/* Gráfica de Producción vs Ventas */}
      <ProduccionVentasChart />

      {/* Gráfica de Producción por Flujo (Origen → Destino) */}
      <ProduccionPorFlujoChart />

      {/* Proyección de Producción (Modelo de Optimización) */}
      <ProyeccionProduccion />

      {/* Producción por Flujo (Origen → Destino) */}
      <ProduccionPorFlujo />

      {/* Recent Sales */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Ventas Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas</CardDescription>
          </div>
          <button 
            onClick={() => navigate('/ventas')}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats?.ventasRecientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay ventas registradas aún</p>
              <button 
                onClick={() => navigate('/ventas')}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Registrar primera venta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.ventasRecientes.map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          onClick={() => navigate('/ventas')}
        >
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

        <Card 
          className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
          onClick={() => navigate('/acopio')}
        >
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

        <Card 
          className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          onClick={() => navigate('/movimientos')}
        >
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
