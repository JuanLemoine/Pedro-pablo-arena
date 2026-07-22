import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CalendarIcon, Save, Loader2, Trash2, Edit, Search, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useAnticipos, useCreateAnticipo, useUpdateAnticipo, useDeleteAnticipo,
  useAnticiposPorNIT, useClientesAnticipo,
} from '@/hooks/useAnticipos';

interface AnticipoForm {
  nit: string;
  nombre: string;
  correo: string;
  banco: string;
  fecha: Date;
  valor: string;
}

const getEmptyForm = (): AnticipoForm => ({
  nit: '',
  nombre: '',
  correo: '',
  banco: '',
  fecha: new Date(),
  valor: '',
});

const Anticipos = () => {
  const { data: anticipos = [], isLoading } = useAnticipos();
  const { data: anticiposPorNIT = [] } = useAnticiposPorNIT();
  const { data: clientesConocidos = [] } = useClientesAnticipo();
  const createAnticipo = useCreateAnticipo();
  const updateAnticipo = useUpdateAnticipo();
  const deleteAnticipo = useDeleteAnticipo();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnticipoForm>(getEmptyForm());
  const [openCalendar, setOpenCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [nitAutocompleteOpen, setNitAutocompleteOpen] = useState(false);

  // Sugerencias de NIT mientras el usuario escribe
  const nitSugerencias = useMemo(() => {
    if (!form.nit || form.nit.length < 2) return [];
    return clientesConocidos.filter(c =>
      c.nit.includes(form.nit) ||
      (c.nombre || '').toLowerCase().includes(form.nit.toLowerCase())
    ).slice(0, 6);
  }, [form.nit, clientesConocidos]);

  const actualizarForm = (campo: keyof AnticipoForm, valor: string | Date) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const seleccionarClienteConocido = (cliente: { nit: string; nombre: string; correo: string | null }) => {
    setForm(prev => ({
      ...prev,
      nit: cliente.nit,
      nombre: cliente.nombre,
      correo: cliente.correo || '',
    }));
    setNitAutocompleteOpen(false);
  };

  const validarForm = () => {
    if (!form.nit.trim()) { toast.error('El NIT es requerido'); return false; }
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return false; }
    if (!form.valor || parseFloat(form.valor) <= 0) { toast.error('El valor debe ser mayor a 0'); return false; }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarForm()) return;

    const payload = {
      nit: form.nit.trim(),
      nombre: form.nombre.trim(),
      correo: form.correo.trim() || null,
      banco: form.banco || null,
      fecha: format(form.fecha, 'yyyy-MM-dd'),
      valor: parseFloat(form.valor),
    };

    if (editingId) {
      updateAnticipo.mutate({ id: editingId, anticipo: payload }, {
        onSuccess: () => { resetForm(); },
      });
    } else {
      createAnticipo.mutate(payload, {
        onSuccess: () => { resetForm(); },
      });
    }
  };

  const handleEdit = (a: typeof anticipos[0]) => {
    setEditingId(a.id);
    setForm({
      nit: a.nit,
      nombre: a.nombre || '',
      correo: a.correo || '',
      banco: a.banco || '',
      fecha: new Date(a.fecha + 'T00:00:00'),
      valor: a.valor.toString(),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm(getEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const filteredAnticipos = anticipos.filter(a =>
    a.nit.includes(searchTerm) ||
    (a.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.correo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Anticipos</h1>
          <p className="text-muted-foreground mt-1">Registra los pagos anticipados de clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Anticipo
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Editar Anticipo' : 'Registrar Anticipo'}</CardTitle>
            <CardDescription>
              {editingId ? 'Actualiza los datos del anticipo' : 'Ingresa el NIT para identificar al cliente'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* NIT con autocomplete */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">NIT *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ej: 900123456"
                      value={form.nit}
                      onChange={e => {
                        actualizarForm('nit', e.target.value);
                        setNitAutocompleteOpen(true);
                      }}
                      onFocus={() => setNitAutocompleteOpen(true)}
                      onBlur={() => setTimeout(() => setNitAutocompleteOpen(false), 150)}
                      autoComplete="off"
                    />
                    {nitAutocompleteOpen && nitSugerencias.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {nitSugerencias.map(c => (
                          <button
                            key={c.nit}
                            type="button"
                            onMouseDown={() => seleccionarClienteConocido(c)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex flex-col border-b border-border/50 last:border-0"
                          >
                            <span className="font-medium">{c.nombre || '—'}</span>
                            <span className="text-xs text-muted-foreground">NIT: {c.nit}{c.correo ? ` · ${c.correo}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {clientesConocidos.find(c => c.nit === form.nit) && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <User className="h-3 w-3" /> Cliente registrado
                    </p>
                  )}
                </div>

                {/* Nombre */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nombre del cliente *</Label>
                  <Input
                    placeholder="Nombre completo o empresa"
                    value={form.nombre}
                    onChange={e => actualizarForm('nombre', e.target.value)}
                  />
                </div>

                {/* Correo */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Correo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.correo}
                    onChange={e => actualizarForm('correo', e.target.value)}
                  />
                </div>

                {/* Banco */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Banco <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Select value={form.banco} onValueChange={v => actualizarForm('banco', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                      <SelectItem value="Davivienda">Davivienda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fecha *</Label>
                  <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(form.fecha, "dd/MM/yyyy", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.fecha}
                        onSelect={date => { if (date) { actualizarForm('fecha', date); setOpenCalendar(false); } }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Valor */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor del anticipo ($) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.valor}
                    onChange={e => actualizarForm('valor', e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" className="gap-2" disabled={createAnticipo.isPending || updateAnticipo.isPending}>
                  {(createAnticipo.isPending || updateAnticipo.isPending)
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />}
                  {editingId ? 'Actualizar Anticipo' : 'Guardar Anticipo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Saldos por NIT */}
      {anticiposPorNIT.length > 0 && (
        <Card className="shadow-card border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Wallet className="h-4 w-4" />
              Saldos de Anticipo por Cliente
            </CardTitle>
            <CardDescription className="text-xs">Las ventas registradas contra un NIT con anticipo descuentan del saldo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-4 font-medium">Cliente</th>
                    <th className="text-left pb-2 pr-4 font-medium">NIT</th>
                    <th className="text-left pb-2 pr-4 font-medium">Correo</th>
                    <th className="text-right pb-2 pr-4 font-medium">Anticipo total</th>
                    <th className="text-right pb-2 pr-4 font-medium">Consumido</th>
                    <th className="text-right pb-2 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {anticiposPorNIT.map(a => (
                    <tr key={a.nit} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{a.nombre}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{a.nit}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{a.correo || '—'}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-amber-700 font-semibold">
                        ${a.totalAnticipo.toLocaleString('es-CO')}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        ${a.consumo.toLocaleString('es-CO')}
                      </td>
                      <td className={cn("py-2.5 text-right tabular-nums font-bold", a.saldo >= 0 ? "text-green-700" : "text-red-600")}>
                        {a.saldo < 0 && '-'}${Math.abs(a.saldo).toLocaleString('es-CO')}
                        {a.saldo < 0 && <span className="text-[10px] font-normal ml-1">(excedido)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Historial de Anticipos
              </CardTitle>
              <CardDescription>{filteredAnticipos.length} registro(s)</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por NIT o nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnticipos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay anticipos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAnticipos.map(a => (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{a.fecha}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{a.nit}</TableCell>
                        <TableCell>
                          {a.nombre
                            ? <span className="flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" />{a.nombre}</span>
                            : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell>
                          {a.banco
                            ? <Badge variant="outline" className="text-xs">{a.banco}</Badge>
                            : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                            ${Number(a.valor).toLocaleString('es-CO')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleEdit(a)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => deleteAnticipo.mutate(a.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Anticipos;
