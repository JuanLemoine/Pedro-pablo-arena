import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, FileText, Trash2, Save, Warehouse, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Venta {
  id: number;
  fecha: string;
  silice: 'A' | 'B';
  recibo: string;
  placa: string;
  cantidadM3: number;
  valorTotal: number;
  fuente: string;
  concepto?: string;
}

interface VentaForm {
  fecha: Date;
  silice: 'A' | 'B' | '';
  recibo: string;
  placa: string;
  cantidadM3: string;
  valorTotal: string;
  fuente: string;
  concepto: string;
}

const ventasIniciales: Venta[] = [
  { id: 1, fecha: '2024-01-15', silice: 'A', recibo: '001', placa: 'ABC-123', cantidadM3: 12, valorTotal: 360000, fuente: 'Zaranda' },
  { id: 2, fecha: '2024-01-14', silice: 'B', recibo: '002', placa: 'XYZ-789', cantidadM3: 8, valorTotal: 240000, fuente: 'Zaranda' },
  { id: 3, fecha: '2024-01-14', silice: 'A', recibo: '003', placa: 'DEF-456', cantidadM3: 15, valorTotal: 450000, fuente: 'Otro' },
  { id: 4, fecha: '2024-01-13', silice: 'B', recibo: '004', placa: 'GHI-321', cantidadM3: 10, valorTotal: 300000, fuente: 'Zaranda' },
];

const getEmptyForm = (): VentaForm => ({
  fecha: new Date(),
  silice: '',
  recibo: '',
  placa: '',
  cantidadM3: '',
  valorTotal: '',
  fuente: '',
  concepto: '',
});

const Ventas = () => {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ventasEnCurso, setVentasEnCurso] = useState<VentaForm[]>([getEmptyForm()]);
  const [openCalendars, setOpenCalendars] = useState<boolean[]>([false]);

  const agregarFilaVenta = () => {
    setVentasEnCurso([...ventasEnCurso, getEmptyForm()]);
    setOpenCalendars([...openCalendars, false]);
  };

  const eliminarFilaVenta = (index: number) => {
    if (ventasEnCurso.length > 1) {
      setVentasEnCurso(ventasEnCurso.filter((_, i) => i !== index));
      setOpenCalendars(openCalendars.filter((_, i) => i !== index));
    }
  };

  const actualizarVenta = (index: number, campo: keyof VentaForm, valor: string | Date) => {
    const nuevasVentas = [...ventasEnCurso];
    nuevasVentas[index] = { ...nuevasVentas[index], [campo]: valor };
    setVentasEnCurso(nuevasVentas);
  };

  const setCalendarOpen = (index: number, open: boolean) => {
    const newOpenCalendars = [...openCalendars];
    newOpenCalendars[index] = open;
    setOpenCalendars(newOpenCalendars);
  };

  const validarVenta = (venta: VentaForm): boolean => {
    return !!(venta.silice && venta.recibo && venta.placa && venta.cantidadM3 && venta.valorTotal && venta.fuente);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const ventasValidas = ventasEnCurso.filter(validarVenta);
    
    if (ventasValidas.length === 0) {
      toast.error('Por favor complete todos los campos requeridos en al menos una venta');
      return;
    }

    const ventasInvalidas = ventasEnCurso.length - ventasValidas.length;
    if (ventasInvalidas > 0) {
      toast.warning(`${ventasInvalidas} venta(s) no fueron registradas por datos incompletos`);
    }

    const nuevasVentas: Venta[] = ventasValidas.map((venta, index) => ({
      id: ventas.length + index + 1,
      fecha: format(venta.fecha, 'yyyy-MM-dd'),
      silice: venta.silice as 'A' | 'B',
      recibo: venta.recibo,
      placa: venta.placa.toUpperCase(),
      cantidadM3: parseFloat(venta.cantidadM3),
      valorTotal: parseFloat(venta.valorTotal),
      fuente: venta.fuente,
      concepto: venta.concepto || undefined,
    }));

    setVentas([...nuevasVentas, ...ventas]);
    setVentasEnCurso([getEmptyForm()]);
    setOpenCalendars([false]);
    setShowForm(false);
    toast.success(`${ventasValidas.length} venta(s) registrada(s) exitosamente`);
  };

  const filteredVentas = ventas.filter(venta =>
    venta.recibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.fuente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSiliceBadge = (silice: 'A' | 'B') => {
    const variants = {
      A: 'bg-blue-100 text-blue-700 border-blue-200',
      B: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return <Badge variant="outline" className={variants[silice]}>Sílice {silice}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ventas</h1>
          <p className="text-muted-foreground mt-1">Registra las ventas de sílice</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/acopio')} className="gap-2">
            <Warehouse className="h-4 w-4" />
            Acopio
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Ventas</CardTitle>
            <CardDescription>Puede agregar múltiples ventas a la vez</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Encabezados de columnas */}
              <div className="hidden lg:grid lg:grid-cols-9 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div>Fecha *</div>
                <div>Sílice *</div>
                <div>N° Recibo *</div>
                <div>Placa Volqueta *</div>
                <div>Cantidad (m³) *</div>
                <div>Valor Total ($) *</div>
                <div>Fuente *</div>
                <div>Concepto</div>
                <div></div>
              </div>

              {/* Filas de ventas */}
              {ventasEnCurso.map((venta, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Fecha *</Label>
                    <Popover open={openCalendars[index]} onOpenChange={(open) => setCalendarOpen(index, open)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !venta.fecha && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(venta.fecha, "dd/MM/yy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={venta.fecha}
                          onSelect={(date) => {
                            if (date) {
                              actualizarVenta(index, 'fecha', date);
                              setCalendarOpen(index, false);
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Sílice *</Label>
                    <Select
                      value={venta.silice}
                      onValueChange={(value) => actualizarVenta(index, 'silice', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Silice A - Peña">Silice A - Peña</SelectItem>
                        <SelectItem value="Silice B - Pozo">Silice B - Pozo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">N° Recibo *</Label>
                    <Input
                      placeholder="001"
                      value={venta.recibo}
                      onChange={(e) => actualizarVenta(index, 'recibo', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Placa Volqueta *</Label>
                    <Input
                      placeholder="ABC-123"
                      value={venta.placa}
                      onChange={(e) => actualizarVenta(index, 'placa', e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Cantidad (m³) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={venta.cantidadM3}
                      onChange={(e) => actualizarVenta(index, 'cantidadM3', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Valor Total ($) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={venta.valorTotal}
                      onChange={(e) => actualizarVenta(index, 'valorTotal', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Fuente *</Label>
                    <Select
                      value={venta.fuente}
                      onValueChange={(value) => actualizarVenta(index, 'fuente', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Fuente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Zaranda">Zaranda</SelectItem>
                        <SelectItem value="Trituradora">Trituradora</SelectItem>
                        <SelectItem value="Clasificadora">Clasificadora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Concepto</Label>
                    <Input
                      placeholder="Opcional"
                      value={venta.concepto}
                      onChange={(e) => actualizarVenta(index, 'concepto', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarFilaVenta(index)}
                      disabled={ventasEnCurso.length === 1}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={agregarFilaVenta} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar otra venta
                </Button>
                <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setVentasEnCurso([getEmptyForm()]);
                    setOpenCalendars([false]);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar {ventasEnCurso.length > 1 ? `(${ventasEnCurso.length})` : 'Venta'}
                  </Button>
                </div>
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
                placeholder="Buscar por recibo, placa..."
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
                  <TableHead>Sílice</TableHead>
                  <TableHead>N° Recibo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead className="text-right">Cantidad (m³)</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Concepto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((venta) => (
                  <TableRow key={venta.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{venta.fecha}</TableCell>
                    <TableCell>{getSiliceBadge(venta.silice)}</TableCell>
                    <TableCell>{venta.recibo}</TableCell>
                    <TableCell className="font-mono">{venta.placa}</TableCell>
                    <TableCell className="text-right">{venta.cantidadM3} m³</TableCell>
                    <TableCell className="text-right font-semibold">${venta.valorTotal.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={venta.fuente === 'Zaranda' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                        {venta.fuente}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{venta.concepto || '-'}</TableCell>
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
