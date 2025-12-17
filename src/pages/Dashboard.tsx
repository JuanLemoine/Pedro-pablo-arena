import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Package,
  ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const salesData = [
  { mes: 'Ene', ventas: 4500, movimientos: 320 },
  { mes: 'Feb', ventas: 5200, movimientos: 280 },
  { mes: 'Mar', ventas: 4800, movimientos: 350 },
  { mes: 'Abr', ventas: 6100, movimientos: 410 },
  { mes: 'May', ventas: 5800, movimientos: 380 },
  { mes: 'Jun', ventas: 7200, movimientos: 450 },
];

const recentSales = [
  { id: 1, cliente: 'Constructora ABC', monto: 2500, fecha: 'Hoy' },
  { id: 2, cliente: 'Obras del Norte', monto: 1800, fecha: 'Ayer' },
  { id: 3, cliente: 'Pavimentos SA', monto: 3200, fecha: 'Hace 2 días' },
  { id: 4, cliente: 'Cliente particular', monto: 450, fecha: 'Hace 3 días' },
];

const stats = [
  {
    title: 'Ventas del Mes',
    value: '$72,450',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    title: 'Movimientos',
    value: '156',
    change: '+8.2%',
    trend: 'up',
    icon: Truck,
  },
  {
    title: 'Stock Arena Fina',
    value: '2,450 m³',
    change: '-5.3%',
    trend: 'down',
    icon: Package,
  },
  {
    title: 'Stock Arena Gruesa',
    value: '1,890 m³',
    change: '+2.1%',
    trend: 'up',
    icon: Package,
  },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de operaciones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="shadow-card hover:shadow-elevated transition-shadow duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ventas Mensuales</CardTitle>
            <CardDescription>Evolución de ventas en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(32, 80%, 50%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(32, 80%, 50%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 88%)" />
                  <XAxis dataKey="mes" stroke="hsl(30, 15%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(30, 15%, 45%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(40, 25%, 99%)', 
                      border: '1px solid hsl(35, 20%, 88%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="hsl(32, 80%, 50%)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVentas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Movements Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Movimientos Internos</CardTitle>
            <CardDescription>Cantidad de movimientos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 88%)" />
                  <XAxis dataKey="mes" stroke="hsl(30, 15%, 45%)" fontSize={12} />
                  <YAxis stroke="hsl(30, 15%, 45%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(40, 25%, 99%)', 
                      border: '1px solid hsl(35, 20%, 88%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="movimientos" 
                    fill="hsl(25, 60%, 45%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Ventas Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas</CardDescription>
          </div>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div 
                key={sale.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {sale.cliente.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{sale.cliente}</p>
                    <p className="text-sm text-muted-foreground">{sale.fecha}</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">${sale.monto.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
