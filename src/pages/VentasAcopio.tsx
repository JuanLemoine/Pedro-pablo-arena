import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Search, Trash2, Save, CalendarIcon, Loader2, Edit, X, Tag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReciboInput } from '@/components/ReciboInput';
import { MoneyInput } from '@/components/MoneyInput';
import { formatearPlaca, validarPlaca } from '@/hooks/usePlacaCliente';
import {
  useVentasEnAcopio,
  useCreateVentaAcopio,
  useUpdateVentaAcopio,
  useDeleteVentaAcopio,
} from '@/hooks/useVentasAcopio';

type TipoTransaccion = 'Venta' | 'Transferencia';

interface VentaAcopioForm {
  fecha: Date;
  silice: string;
  recibo: string;
  placa: string;
  nombreCliente: string;
  cantidadM3: string;
  valorTotal: string;
  tipoTransaccion: TipoTransaccion;
  banco: string;
}

const getEmptyForm = (): VentaAcopioForm => ({
  fecha: new Date(),
  silice: '',
  recibo: '',
  placa: '',
  nombreCliente: '',
  cantidadM3: '',
  valorTotal: '',
  tipoTransaccion: 'Venta',
  banco: '',
});

const FUENTE_ACOPIO = 'Acopio';

const VentasAcopio = () => {
  const { data: ventas = [], isLoading, error } = useVentasEnAcopio();
  const createVenta = useCreateVentaAcopio();
  const updateVenta = useUpdateVentaAcopio();
  const deleteVenta = useDeleteVentaAcopio();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VentaAcopioForm>(getEmptyForm());
  const [reciboDuplicado, setReciboDuplicado] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autocompletePlacaFocus, setAutocompletePlacaFocus] = useState(false);

  const registrarEstadoRecibo = useCallback((_index: number, duplicado: boolean) => {
    setReciboDuplicado(duplicado);
  }, []);

  const validar = (): boolean => {
    if (!form.silice || !form.recibo || !form.placa || !form.cantidadM3 || !form.valorTotal) {
      toast.error('Complete todos los campos requeridos');
      return false;
    }
    if (!validarPlaca(form.placa)) {
      toast.error('Placa incompleta. Debe ser 3 letras y 3 números, ej. SWR157.');
      return false;
    }
    if (reciboDuplicado) {
      toast.error('El N° de recibo ya está registrado. Corrija antes de guardar.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;

    const payload = {
      fecha: format(form.fecha, 'yyyy-MM-dd'),
      silice: form.silice,
      recibo: form.recibo,
      placa: form.placa.toUpperCase(),
      nombre_cliente: form.nombreCliente || null,
      cantidad_m3: parseFloat(form.cantidadM3),
      valor_total: parseFloat(form.valorTotal),
      tipo_transaccion: form.tipoTransaccion,
      concepto: null,
      banco: form.tipoTransaccion === 'Transferencia' ? (form.banco || null) : null,
    };

    if (editingId) {
      updateVenta.mutate(
        { id: editingId, venta: payload },
        {
          onSuccess: () => {
            setForm(getEmptyForm());
            setShowForm(false);
            setEditingId(null);
          },
        }
      );
    } else {
      createVenta.mutate(payload, {
        onSuccess: () => {
          setForm(getEmptyForm());
          setShowForm(false);
        },
      });
    }
  };

  const handleEdit = (v: typeof ventas[0]) => {
    setEditingId(v.id);
    setForm({
      fecha: new Date(v.fecha + 'T00:00:00'),
      silice: v.silice,
      recibo: v.recibo,
      placa: v.placa,
      nombreCliente: (v as any).nombre_cliente || '',
      cantidadM3: v.cantidad_m3.toString(),
      valorTotal: v.valor_total.toString(),
      tipoTransaccion: ((v as any).tipo_transaccion || 'Venta') as TipoTransaccion,
      banco: (v as any).banco || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setForm(getEmptyForm());
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Eliminar esta venta?')) return;
    deleteVenta.mutate(id);
  };

  const filtered = ventas.filter(v =>
    !searchTerm ||
    v.recibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((v as any).nombre_cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalM3 = filtered.reduce((s, v) => s + Number(v.cantidad_m3), 0);
  const totalValor = filtered.reduce((s, v) => s + Number(v.valor_total), 0);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        Error al cargar ventas de acopio: {(error as Error).message}
      </div>
    );
  }

  const isSaving = createVenta.isPending || updateVenta.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold font-display">Ventas en acopio</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Registro de ventas realizadas desde el punto de acopio.
        </p>
      </div>

      {/* Totales rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Registros</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">m³ totales</p>
          <p className="text-2xl font-bold">{totalM3.toLocaleString('es-CO')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-xl font-bold">
            {totalValor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
          </p>
        </Card>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{editingId ? 'Editar venta' : 'Nueva venta en acopio'}</CardTitle>
            <CardDescription>Fuente: {FUENTE_ACOPIO} (automático)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal', !form.fecha && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.fecha ? format(form.fecha, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.fecha}
                        onSelect={d => { if (d) { setForm(f => ({ ...f, fecha: d })); setCalendarOpen(false); } }}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sílice */}
                <div className="space-y-1.5">
                  <Label>Tipo de arena *</Label>
                  <Select value={form.silice} onValueChange={v => setForm(f => ({ ...f, silice: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Silice A - Peña">Sílice A - Peña</SelectItem>
                      <SelectItem value="Silice B - Pozo">Sílice B - Pozo</SelectItem>
                      <SelectItem value="Silice C - Arena Fina">Sílice C - Arena Fina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* N° Recibo */}
                <div className="space-y-1.5">
                  <ReciboInput
                    index={0}
                    value={form.recibo}
                    onChange={v => setForm(f => ({ ...f, recibo: v }))}
                    ignorarId={editingId}
                    onEstadoChange={registrarEstadoRecibo}
                  />
                </div>

                {/* Placa */}
                <div className="space-y-1.5">
                  <Label>Placa *</Label>
                  <Input
                    placeholder="SWR157"
                    value={form.placa}
                    onFocus={() => setAutocompletePlacaFocus(true)}
                    onBlur={() => setAutocompletePlacaFocus(false)}
                    onChange={e => setForm(f => ({ ...f, placa: formatearPlaca(e.target.value) }))}
                    className={cn(
                      !autocompletePlacaFocus && form.placa && !validarPlaca(form.placa) && 'border-destructive'
                    )}
                  />
                </div>

                {/* Nombre cliente */}
                <div className="space-y-1.5">
                  <Label>Nombre cliente</Label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={form.nombreCliente}
                    onChange={e => setForm(f => ({ ...f, nombreCliente: e.target.value }))}
                  />
                </div>

                {/* Tipo transacción */}
                <div className="space-y-1.5">
                  <Label>Tipo de transacción</Label>
                  <Select
                    value={form.tipoTransaccion}
                    onValueChange={v => setForm(f => ({ ...f, tipoTransaccion: v as TipoTransaccion }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Venta">Venta</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Banco (solo Transferencia) */}
                {form.tipoTransaccion === 'Transferencia' && (
                  <div className="space-y-1.5">
                    <Label>Banco</Label>
                    <Input
                      placeholder="Nombre del banco"
                      value={form.banco}
                      onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                    />
                  </div>
                )}

                {/* Cantidad m³ */}
                <div className="space-y-1.5">
                  <Label>Cantidad m³ *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.cantidadM3}
                    onChange={e => setForm(f => ({ ...f, cantidadM3: e.target.value }))}
                  />
                </div>

                {/* Valor total */}
                <div className="space-y-1.5">
                  <Label>Valor total *</Label>
                  <MoneyInput
                    value={form.valorTotal}
                    onChange={v => setForm(f => ({ ...f, valorTotal: v }))}
                    placeholder="$0"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {editingId ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Historial de ventas</CardTitle>
              <CardDescription>Todas las ventas registradas desde el acopio</CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva venta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar recibo, placa, cliente…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {searchTerm ? 'No hay ventas que coincidan con la búsqueda.' : 'No hay ventas registradas en el acopio todavía.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead>N° Recibo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">m³</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(v.fecha), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          v.silice.includes('A')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : v.silice.includes('B')
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }>
                          {v.silice.replace('Silice A - ', '').replace('Silice B - ', '').replace('Silice C - ', '')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{v.recibo}</TableCell>
                      <TableCell className="font-mono text-sm">{v.placa}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-28 truncate">
                        {(v as any).nombre_cliente || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{Number(v.cantidad_m3).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {Number(v.valor_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          (v as any).tipo_transaccion === 'Transferencia'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : ''
                        }>
                          {(v as any).tipo_transaccion || 'Venta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(v)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            disabled={deleteVenta.isPending}
                            onClick={() => handleDelete(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VentasAcopio;
