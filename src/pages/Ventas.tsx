import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Venta {
  id: number;
  fecha: string;
  cliente: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  estado: 'pendiente' | 'completado' | 'cancelado';
}

const ventasIniciales: Venta[] = [
  { id: 1, fecha: '2024-01-15', cliente: 'Constructora ABC', producto: 'Arena Fina', cantidad: 50, precioUnitario: 25, total: 1250, estado: 'completado' },
  { id: 2, fecha: '2024-01-14', cliente: 'Obras del Norte', producto: 'Arena Gruesa', cantidad: 80, precioUnitario: 22, total: 1760, estado: 'completado' },
  { id: 3, fecha: '2024-01-14', cliente: 'Pavimentos SA', producto: 'Arena Fina', cantidad: 120, precioUnitario: 25, total: 3000, estado: 'pendiente' },
  { id: 4, fecha: '2024-01-13', cliente: 'Cliente Particular', producto: 'Arena Gruesa', cantidad: 10, precioUnitario: 28, total: 280, estado: 'completado' },
];

const Ventas = () => {
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    cliente: '',
    producto: '',
    cantidad: '',
    precioUnitario: '',
    notas: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.producto || !formData.cantidad || !formData.precioUnitario) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const cantidad = parseFloat(formData.cantidad);
    const precioUnitario = parseFloat(formData.precioUnitario);

    const nuevaVenta: Venta = {
      id: ventas.length + 1,
      fecha: new Date().toISOString().split('T')[0],
      cliente: formData.cliente,
      producto: formData.producto,
      cantidad,
      precioUnitario,
      total: cantidad * precioUnitario,
      estado: 'pendiente',
    };

    setVentas([nuevaVenta, ...ventas]);
    setFormData({ cliente: '', producto: '', cantidad: '', precioUnitario: '', notas: '' });
    setShowForm(false);
    toast.success('Venta registrada exitosamente');
  };

  const filteredVentas = ventas.filter(venta =>
    venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.producto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado: Venta['estado']) => {
    const variants = {
      completado: 'bg-green-100 text-green-700 border-green-200',
      pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
      cancelado: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels = {
      completado: 'Completado',
      pendiente: 'Pendiente',
      cancelado: 'Cancelado',
    };
    return <Badge variant="outline" className={variants[estado]}>{labels[estado]}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ventas</h1>
          <p className="text-muted-foreground mt-1">Gestiona y registra las ventas de arena</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Nueva Venta</CardTitle>
            <CardDescription>Complete los datos de la venta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  placeholder="Nombre del cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="producto">Producto *</Label>
                <Select
                  value={formData.producto}
                  onValueChange={(value) => setFormData({ ...formData, producto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arena Fina">Arena Fina</SelectItem>
                    <SelectItem value="Arena Gruesa">Arena Gruesa</SelectItem>
                    <SelectItem value="Arena Media">Arena Media</SelectItem>
                    <SelectItem value="Grava">Grava</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad (m³) *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  placeholder="0"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="precio">Precio Unitario ($) *</Label>
                <Input
                  id="precio"
                  type="number"
                  placeholder="0.00"
                  value={formData.precioUnitario}
                  onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notas">Notas adicionales</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="md:col-span-2 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Venta</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Historial de Ventas
              </CardTitle>
              <CardDescription>{filteredVentas.length} registros encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((venta) => (
                  <TableRow key={venta.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{venta.fecha}</TableCell>
                    <TableCell>{venta.cliente}</TableCell>
                    <TableCell>{venta.producto}</TableCell>
                    <TableCell className="text-right">{venta.cantidad} m³</TableCell>
                    <TableCell className="text-right">${venta.precioUnitario}</TableCell>
                    <TableCell className="text-right font-semibold">${venta.total.toLocaleString()}</TableCell>
                    <TableCell>{getEstadoBadge(venta.estado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ventas;
