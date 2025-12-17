import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface Movimiento {
  id: number;
  fecha: string;
  tipo: 'entrada' | 'salida' | 'transferencia';
  producto: string;
  cantidad: number;
  origen: string;
  destino: string;
  responsable: string;
  notas: string;
}

const movimientosIniciales: Movimiento[] = [
  { id: 1, fecha: '2024-01-15', tipo: 'entrada', producto: 'Arena Fina', cantidad: 200, origen: 'Cantera Norte', destino: 'Depósito Principal', responsable: 'Juan Pérez', notas: 'Carga completa' },
  { id: 2, fecha: '2024-01-14', tipo: 'salida', producto: 'Arena Gruesa', cantidad: 80, origen: 'Depósito Principal', destino: 'Constructora ABC', responsable: 'Carlos López', notas: 'Entrega programada' },
  { id: 3, fecha: '2024-01-14', tipo: 'transferencia', producto: 'Arena Fina', cantidad: 50, origen: 'Depósito Principal', destino: 'Depósito Secundario', responsable: 'María García', notas: 'Reabastecimiento' },
  { id: 4, fecha: '2024-01-13', tipo: 'entrada', producto: 'Grava', cantidad: 150, origen: 'Cantera Sur', destino: 'Depósito Principal', responsable: 'Juan Pérez', notas: '' },
];

const Movimientos = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tipo: '',
    producto: '',
    cantidad: '',
    origen: '',
    destino: '',
    responsable: '',
    notas: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo || !formData.producto || !formData.cantidad || !formData.origen || !formData.destino || !formData.responsable) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const nuevoMovimiento: Movimiento = {
      id: movimientos.length + 1,
      fecha: new Date().toISOString().split('T')[0],
      tipo: formData.tipo as Movimiento['tipo'],
      producto: formData.producto,
      cantidad: parseFloat(formData.cantidad),
      origen: formData.origen,
      destino: formData.destino,
      responsable: formData.responsable,
      notas: formData.notas,
    };

    setMovimientos([nuevoMovimiento, ...movimientos]);
    setFormData({ tipo: '', producto: '', cantidad: '', origen: '', destino: '', responsable: '', notas: '' });
    setShowForm(false);
    toast.success('Movimiento registrado exitosamente');
  };

  const filteredMovimientos = movimientos.filter(mov =>
    mov.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.responsable.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoBadge = (tipo: Movimiento['tipo']) => {
    const config = {
      entrada: { icon: ArrowDown, class: 'bg-green-100 text-green-700 border-green-200', label: 'Entrada' },
      salida: { icon: ArrowUp, class: 'bg-red-100 text-red-700 border-red-200', label: 'Salida' },
      transferencia: { icon: ArrowLeftRight, class: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Transferencia' },
    };
    const { icon: Icon, class: className, label } = config[tipo];
    return (
      <Badge variant="outline" className={`${className} gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Movimientos Internos</h1>
          <p className="text-muted-foreground mt-1">Registra entradas, salidas y transferencias de material</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowDown className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">Entradas Hoy</p>
              <p className="text-2xl font-bold text-green-800">350 m³</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ArrowUp className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700">Salidas Hoy</p>
              <p className="text-2xl font-bold text-red-800">180 m³</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Transferencias</p>
              <p className="text-2xl font-bold text-blue-800">50 m³</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Movimiento</CardTitle>
            <CardDescription>Complete los datos del movimiento interno</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Movimiento *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="origen">Origen *</Label>
                <Select
                  value={formData.origen}
                  onValueChange={(value) => setFormData({ ...formData, origen: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cantera Norte">Cantera Norte</SelectItem>
                    <SelectItem value="Cantera Sur">Cantera Sur</SelectItem>
                    <SelectItem value="Depósito Principal">Depósito Principal</SelectItem>
                    <SelectItem value="Depósito Secundario">Depósito Secundario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destino">Destino *</Label>
                <Select
                  value={formData.destino}
                  onValueChange={(value) => setFormData({ ...formData, destino: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Depósito Principal">Depósito Principal</SelectItem>
                    <SelectItem value="Depósito Secundario">Depósito Secundario</SelectItem>
                    <SelectItem value="Cliente">Cliente</SelectItem>
                    <SelectItem value="Obra">Obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable *</Label>
                <Input
                  id="responsable"
                  placeholder="Nombre del responsable"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="notas">Notas adicionales</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Movimiento</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Historial de Movimientos
              </CardTitle>
              <CardDescription>{filteredMovimientos.length} registros encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos..."
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimientos.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{mov.fecha}</TableCell>
                    <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                    <TableCell>{mov.producto}</TableCell>
                    <TableCell className="text-right">{mov.cantidad} m³</TableCell>
                    <TableCell>{mov.origen}</TableCell>
                    <TableCell>{mov.destino}</TableCell>
                    <TableCell>{mov.responsable}</TableCell>
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

export default Movimientos;
