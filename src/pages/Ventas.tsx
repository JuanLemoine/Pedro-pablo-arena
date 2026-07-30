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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, FileText, Trash2, Save, Warehouse, CalendarIcon, Loader2, User, AlertCircle, Edit, Filter, X, Download, CreditCard, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useVentas, useCreateVentas, useUpdateVenta, useDeleteVenta } from '@/hooks/useVentas';
import { usePlacasClientes, useClientesInfo, formatearPlaca, validarPlaca } from '@/hooks/usePlacaCliente';

type TipoTransaccion = 'Venta' | 'Donación' | 'Transferencia';

interface VentaForm {
  fecha: Date;
  silice: string;
  recibo: string;
  placa: string;
  nombreCliente: string;
  nitCliente: string;
  banco: string;
  cantidadM3: string;
  valorTotal: string;
  fuente: string;
  tipoTransaccion: TipoTransaccion;
  concepto: string;
  descontarAnticipo: boolean;
}

const getEmptyForm = (): VentaForm => ({
  fecha: new Date(),
  silice: '',
  recibo: '',
  placa: '',
  nombreCliente: '',
  nitCliente: '',
  banco: '',
  cantidadM3: '',
  valorTotal: '',
  fuente: '',
  tipoTransaccion: 'Venta',
  concepto: '',
  descontarAnticipo: false,
});

const Ventas = () => {
  const navigate = useNavigate();
  const { data: ventas = [], isLoading, error } = useVentas();
  const createVentas = useCreateVentas();
  const updateVenta = useUpdateVenta();
  const deleteVenta = useDeleteVenta();
  const { data: placasClientes = new Map() } = usePlacasClientes();
  const { data: clientesInfo = [] } = useClientesInfo();

  const [showForm, setShowForm] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState<number | null>(null);
  const [autocompleteplacaIndex, setAutocompletePlacaIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ventasEnCurso, setVentasEnCurso] = useState<VentaForm[]>([getEmptyForm()]);
  const [openCalendars, setOpenCalendars] = useState<boolean[]>([false]);
  const [openClientePopovers, setOpenClientePopovers] = useState<boolean[]>([false]);

  // Filtros avanzados
  const [filterSilice, setFilterSilice] = useState('');
  const [filterTipoTransaccion, setFilterTipoTransaccion] = useState('');
  const [filterPlacaCliente, setFilterPlacaCliente] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState<Date | null>(null);
  const [filterFechaFin, setFilterFechaFin] = useState<Date | null>(null);
  const [openFilterCalendars, setOpenFilterCalendars] = useState({ inicio: false, fin: false });

  const agregarFilaVenta = () => {
    setVentasEnCurso([...ventasEnCurso, getEmptyForm()]);
    setOpenCalendars([...openCalendars, false]);
    setOpenClientePopovers([...openClientePopovers, false]);
  };

  const eliminarFilaVenta = (index: number) => {
    if (ventasEnCurso.length > 1) {
      setVentasEnCurso(ventasEnCurso.filter((_, i) => i !== index));
      setOpenCalendars(openCalendars.filter((_, i) => i !== index));
      setOpenClientePopovers(openClientePopovers.filter((_, i) => i !== index));
    }
  };

  const actualizarVenta = (index: number, campo: keyof VentaForm, valor: string | Date) => {
    const nuevasVentas = [...ventasEnCurso];
    nuevasVentas[index] = { ...nuevasVentas[index], [campo]: valor };
    setVentasEnCurso(nuevasVentas);
  };

  const actualizarVentaMultiple = (index: number, campos: Partial<VentaForm>) => {
    const nuevasVentas = [...ventasEnCurso];
    nuevasVentas[index] = { ...nuevasVentas[index], ...campos };
    setVentasEnCurso(nuevasVentas);
  };

  const actualizarPlaca = (index: number, valor: string) => {
    const placa = formatearPlaca(valor);
    const nuevasVentas = [...ventasEnCurso];
    nuevasVentas[index] = { ...nuevasVentas[index], placa };
    // No auto-completar más - el usuario selecciona del combobox de clientes
    setVentasEnCurso(nuevasVentas);
  };

  const setCalendarOpen = (index: number, open: boolean) => {
    const newOpenCalendars = [...openCalendars];
    newOpenCalendars[index] = open;
    setOpenCalendars(newOpenCalendars);
  };

  const setClientePopoverOpen = (index: number, open: boolean) => {
    const newOpen = [...openClientePopovers];
    newOpen[index] = open;
    setOpenClientePopovers(newOpen);
  };

  const validarVenta = (venta: VentaForm): boolean => {
    return !!(
      venta.silice &&
      venta.recibo &&
      venta.placa &&
      validarPlaca(venta.placa) &&
      venta.cantidadM3 &&
      venta.valorTotal &&
      venta.fuente
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ventasValidas = ventasEnCurso.filter(validarVenta);

    if (ventasValidas.length === 0) {
      toast.error('Por favor complete todos los campos requeridos en al menos una venta');
      return;
    }

    const ventasInvalidas = ventasEnCurso.length - ventasValidas.length;
    if (ventasInvalidas > 0) {
      toast.warning(`${ventasInvalidas} venta(s) no serán registradas por datos incompletos`);
    }

    const nuevasVentas = ventasValidas.map((venta) => ({
      fecha: format(venta.fecha, 'yyyy-MM-dd'),
      silice: venta.silice,
      recibo: venta.recibo,
      placa: venta.placa.toUpperCase(),
      cantidad_m3: parseFloat(venta.cantidadM3),
      valor_total: parseFloat(venta.valorTotal),
      fuente: venta.fuente,
      tipo_transaccion: venta.tipoTransaccion,
      nombre_cliente: venta.nombreCliente || null,
      nit_cliente: venta.nitCliente || null,
      banco: venta.tipoTransaccion === 'Transferencia' ? (venta.banco || null) : null,
      concepto: venta.tipoTransaccion === 'Donación' ? (venta.concepto || null) : null,
      descuenta_anticipo: venta.tipoTransaccion === 'Transferencia' ? venta.descontarAnticipo : false,
    }));

    if (editingId) {
      updateVenta.mutate(
        { id: editingId, venta: nuevasVentas[0] },
        {
          onSuccess: () => {
            setVentasEnCurso([getEmptyForm()]);
            setOpenCalendars([false]);
            setOpenClientePopovers([false]);
            setShowForm(false);
            setEditingId(null);
          }
        }
      );
    } else {
      createVentas.mutate(nuevasVentas, {
        onSuccess: () => {
          setVentasEnCurso([getEmptyForm()]);
          setOpenCalendars([false]);
          setOpenClientePopovers([false]);

          setShowForm(false);
        }
      });
    }
  };

  const handleEdit = (venta: typeof ventas[0]) => {
    setEditingId(venta.id);
    const ventaForm: VentaForm = {
      // 'T00:00:00' fuerza hora local: sin él, new Date('2026-07-15') se parsea
      // como medianoche UTC y al guardar con format() la fecha retrocede un día.
      fecha: new Date(venta.fecha + 'T00:00:00'),
      silice: venta.silice,
      recibo: venta.recibo,
      placa: venta.placa,
      nombreCliente: (venta as any).nombre_cliente || '',
      nitCliente: (venta as any).nit_cliente || '',
      banco: (venta as any).banco || '',
      cantidadM3: venta.cantidad_m3.toString(),
      valorTotal: venta.valor_total.toString(),
      fuente: venta.fuente,
      tipoTransaccion: (venta as any).tipo_transaccion || 'Venta',
      concepto: venta.concepto || '',
      descontarAnticipo: (venta as any).descuenta_anticipo || false,
    };
    setVentasEnCurso([ventaForm]);
    setOpenCalendars([false]);
    setOpenClientePopovers([false]);
    setShowForm(true);
    // Scroll automático hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setVentasEnCurso([getEmptyForm()]);
    setOpenCalendars([false]);
    setOpenClientePopovers([false]);
    setShowForm(false);
  };

  const aplicarFiltros = (data: typeof ventas) => {
    return data.filter(venta => {
      // Filtro de búsqueda rápida
      const searchMatch =
        venta.recibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venta.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venta.fuente.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtros avanzados
      const siliceMatch = !filterSilice || venta.silice === filterSilice;
      const tipoMatch = !filterTipoTransaccion || (venta as any).tipo_transaccion === filterTipoTransaccion;
      const placaClienteMatch = !filterPlacaCliente ||
        venta.placa.toLowerCase().includes(filterPlacaCliente.toLowerCase()) ||
        ((venta as any).nombre_cliente || '').toLowerCase().includes(filterPlacaCliente.toLowerCase());

      const fecha = new Date(venta.fecha + 'T00:00:00');
      const fechaMatch =
        (!filterFechaInicio || fecha >= filterFechaInicio) &&
        (!filterFechaFin || fecha <= filterFechaFin);

      return searchMatch && siliceMatch && tipoMatch && placaClienteMatch && fechaMatch;
    });
  };

  const filteredVentas = aplicarFiltros(ventas);

  const exportarExcel = () => {
    const datos = filteredVentas.map(v => ({
      'Fecha': v.fecha,
      'Sílice': v.silice,
      'N° Recibo': v.recibo,
      'Placa': v.placa,
      'Cliente': (v as any).nombre_cliente || '',
      'NIT': (v as any).nit_cliente || '',
      'Banco': (v as any).banco || '',
      'Cantidad m³': v.cantidad_m3,
      'Valor Total': v.valor_total,
      'Fuente': v.fuente,
      'Tipo': (v as any).tipo_transaccion || 'Venta',
      'Concepto': v.concepto || '',
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getSiliceBadge = (silice: string) => {
    const isA = silice.includes('A');
    return (
      <Badge variant="outline" className={isA ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}>
        {silice}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar ventas: {error.message}</p>
      </div>
    );
  }

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

      {/* Filtros Avanzados */}
      {!showForm && (
        <Card className="shadow-card bg-slate-50 border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Filtros Avanzados</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Sílice */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Sílice</Label>
                <Select value={filterSilice} onValueChange={setFilterSilice}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Silice A - Peña">Silice A - Peña</SelectItem>
                    <SelectItem value="Silice B - Pozo">Silice B - Pozo</SelectItem>
                    <SelectItem value="Silice C - Arena Fina">Silice C - Arena Fina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Transacción */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Transacción</Label>
                <Select value={filterTipoTransaccion} onValueChange={setFilterTipoTransaccion}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Venta">Venta</SelectItem>
                    <SelectItem value="Donación">Donación</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Placa/Cliente */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Placa/Cliente</Label>
                  <Input
                    placeholder="Buscar placa o cliente..."
                    value={filterPlacaCliente}
                    onChange={(e) => setFilterPlacaCliente(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Fecha Inicio */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Fecha Inicio</Label>
                  <Popover open={openFilterCalendars.inicio} onOpenChange={(open) => setOpenFilterCalendars({ ...openFilterCalendars, inicio: open })}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterFechaInicio ? format(filterFechaInicio, "dd/MM/yyyy") : "Desde"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterFechaInicio || undefined}
                        onSelect={(date) => {
                          setFilterFechaInicio(date || null);
                          setOpenFilterCalendars({ ...openFilterCalendars, inicio: false });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Fecha Fin */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Fecha Fin</Label>
                  <Popover open={openFilterCalendars.fin} onOpenChange={(open) => setOpenFilterCalendars({ ...openFilterCalendars, fin: open })}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterFechaFin ? format(filterFechaFin, "dd/MM/yyyy") : "Hasta"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterFechaFin || undefined}
                        onSelect={(date) => {
                          setFilterFechaFin(date || null);
                          setOpenFilterCalendars({ ...openFilterCalendars, fin: false });
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Botón Limpiar Filtros */}
                <div className="space-y-2 flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterSilice('');
                      setFilterTipoTransaccion('');
                      setFilterPlacaCliente('');
                      setFilterFechaInicio(null);
                      setFilterFechaFin(null);
                    }}
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{editingId ? 'Editar Venta' : 'Registrar Ventas'}</CardTitle>
                <CardDescription>{editingId ? 'Actualiza los datos de la venta' : 'Puede agregar múltiples ventas a la vez'}</CardDescription>
              </div>
              {!editingId && (
                <Button type="button" variant="secondary" onClick={agregarFilaVenta} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  Agregar otra venta
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Encabezados de columnas */}

              {/* Filas de ventas */}
              {ventasEnCurso.map((venta, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-13 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha *</Label>
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
                    <Label className="text-xs">Sílice *</Label>
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
                        <SelectItem value="Silice C - Arena Fina">Silice C - Arena Fina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">N° Recibo *</Label>
                    <Input
                      placeholder="001"
                      value={venta.recibo}
                      onChange={(e) => actualizarVenta(index, 'recibo', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Placa Volqueta *</Label>
                    <div className="relative">
                      <Input
                        placeholder="BMW345"
                        value={venta.placa}
                        onChange={(e) => {
                          actualizarPlaca(index, e.target.value);
                          setAutocompletePlacaIndex(index);
                        }}
                        onFocus={() => setAutocompletePlacaIndex(index)}
                        onBlur={() => setTimeout(() => setAutocompletePlacaIndex(null), 150)}
                        maxLength={6}
                        autoComplete="off"
                        className={cn(
                          'uppercase font-mono tracking-widest pr-8',
                          venta.placa.length === 6 && !validarPlaca(venta.placa) && 'border-red-400 focus-visible:ring-red-400'
                        )}
                      />
                      {venta.placa.length === 6 && !validarPlaca(venta.placa) && (
                        <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                      {/* Dropdown autocompletado de placas */}
                      {autocompleteplacaIndex === index && venta.placa.length > 0 && (() => {
                        const matches = Array.from(placasClientes.keys()).filter(p =>
                          p.includes(venta.placa.toUpperCase()) && p !== venta.placa.toUpperCase()
                        );
                        return matches.length > 0 ? (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {matches.map((placa) => (
                              <button
                                key={placa}
                                type="button"
                                onMouseDown={() => {
                                  actualizarPlaca(index, placa);
                                  setAutocompletePlacaIndex(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted font-mono tracking-widest"
                              >
                                {placa}
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {venta.placa.length === 6 && !validarPlaca(venta.placa) && (
                      <p className="text-xs text-red-500">3 letras + 3 números (ej. BMW345)</p>
                    )}
                  </div>

                  {/* Nombre Cliente con autocompletado */}
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre Cliente</Label>
                    <div className="relative">
                      <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="Nombre del cliente"
                        value={venta.nombreCliente}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          const match = clientesInfo.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
                          actualizarVentaMultiple(index, {
                            nombreCliente: nombre,
                            ...(match?.nit ? { nitCliente: match.nit } : {}),
                          });
                          setAutocompleteIndex(index);
                        }}
                        onFocus={() => setAutocompleteIndex(index)}
                        onBlur={() => setTimeout(() => setAutocompleteIndex(null), 150)}
                        className="pl-8"
                        autoComplete="off"
                      />
                      {/* Dropdown autocompletado */}
                      {autocompleteIndex === index && venta.nombreCliente.length > 0 && (() => {
                        const matches = clientesInfo.filter(c =>
                          c.nombre.toLowerCase().includes(venta.nombreCliente.toLowerCase()) &&
                          c.nombre.toLowerCase() !== venta.nombreCliente.toLowerCase()
                        );
                        return matches.length > 0 ? (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {matches.map((c) => (
                              <button
                                key={c.nombre}
                                type="button"
                                onMouseDown={() => {
                                  actualizarVentaMultiple(index, { nombreCliente: c.nombre, nitCliente: c.nit });
                                  setAutocompleteIndex(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex flex-col"
                              >
                                <span className="font-medium">{c.nombre}</span>
                                {c.nit && <span className="text-xs text-muted-foreground">NIT: {c.nit}</span>}
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    {/* Chips de sugerencias por placa */}
                    {validarPlaca(venta.placa) && placasClientes.has(venta.placa) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {placasClientes.get(venta.placa)!.map((cliente) => (
                          <button
                            key={cliente}
                            type="button"
                            onClick={() => {
                              const info = clientesInfo.find(c => c.nombre === cliente);
                              actualizarVentaMultiple(index, { nombreCliente: cliente, nitCliente: info?.nit || '' });
                            }}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full border transition-colors",
                              venta.nombreCliente === cliente
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary"
                            )}
                          >
                            {cliente}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NIT Cliente */}
                  <div className="space-y-1">
                    <Label className="text-xs">NIT Cliente</Label>
                    <Input
                      placeholder="NIT del cliente"
                      value={venta.nitCliente}
                      onChange={(e) => actualizarVenta(index, 'nitCliente', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad (m³) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={venta.cantidadM3}
                      onChange={(e) => actualizarVenta(index, 'cantidadM3', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Total ($) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={venta.valorTotal}
                      onChange={(e) => actualizarVenta(index, 'valorTotal', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Fuente *</Label>
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
                    <Label className="text-xs">Tipo Transacción *</Label>
                    <Select
                      value={venta.tipoTransaccion}
                      onValueChange={(value) => {
                        const tipo = value as TipoTransaccion;
                        actualizarVentaMultiple(index, {
                          tipoTransaccion: tipo,
                          ...(tipo !== 'Transferencia' ? { banco: '', descontarAnticipo: false } : {}),
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Venta">Venta</SelectItem>
                        <SelectItem value="Donación">Donación</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Banco — solo para Transferencia */}
                  {venta.tipoTransaccion === 'Transferencia' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Banco</Label>
                      <Select value={venta.banco} onValueChange={(v) => actualizarVenta(index, 'banco', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Banco" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                          <SelectItem value="Davivienda">Davivienda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Concepto <span className="text-muted-foreground text-[10px]">(solo donación)</span></Label>
                    {venta.tipoTransaccion === 'Donación' ? (
                      <Input
                        placeholder="Descripción de la donación"
                        value={venta.concepto}
                        onChange={(e) => actualizarVenta(index, 'concepto', e.target.value)}
                      />
                    ) : (
                      <div className="h-10 flex items-center px-3 rounded-md border border-dashed border-muted-foreground/20 text-xs text-muted-foreground/50 select-none">
                        N/A
                      </div>
                    )}
                  </div>

                  {/* Descontar de anticipo — solo para Transferencia */}
                  {venta.tipoTransaccion === 'Transferencia' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Anticipo</Label>
                      <div
                        onClick={() => actualizarVentaMultiple(index, { descontarAnticipo: !venta.descontarAnticipo })}
                        className={cn(
                          "h-10 w-full flex items-center gap-2 px-3 rounded-md border text-xs font-medium transition-colors cursor-pointer select-none",
                          venta.descontarAnticipo
                            ? "border-amber-400 bg-amber-50 text-amber-800"
                            : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-amber-300 hover:bg-amber-50/50"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center",
                          venta.descontarAnticipo ? "bg-primary border-primary" : "border-muted-foreground/40"
                        )}>
                          {venta.descontarAnticipo && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <CreditCard className="h-3.5 w-3.5" />
                        Descontar de anticipo
                      </div>
                    </div>
                  )}
                  
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
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t">
                <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2" disabled={createVentas.isPending || updateVenta.isPending}>
                    {(createVentas.isPending || updateVenta.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editingId ? 'Actualizar Venta' : `Guardar ${ventasEnCurso.length > 1 ? `(${ventasEnCurso.length})` : 'Venta'}`}
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
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por recibo, placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={exportarExcel} className="gap-2 shrink-0">
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead>N° Recibo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Cantidad (m³)</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVentas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                        No hay ventas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVentas.map((venta) => (
                      <TableRow key={venta.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{venta.fecha}</TableCell>
                        <TableCell>{getSiliceBadge(venta.silice)}</TableCell>
                        <TableCell>{venta.recibo}</TableCell>
                        <TableCell className="font-mono tracking-widest">{venta.placa}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(venta as any).nombre_cliente
                            ? <span className="flex items-center gap-1"><User className="h-3 w-3" />{(venta as any).nombre_cliente}</span>
                            : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {(venta as any).nit_cliente || <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(venta as any).banco ? (
                              <Badge variant="outline" className={
                                (venta as any).banco === 'Bancolombia' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                (venta as any).banco === 'Davivienda' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                              }>
                                {(venta as any).banco}
                              </Badge>
                            ) : <span className="text-muted-foreground/40">—</span>}
                            {(venta as any).descuenta_anticipo && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5">
                                ↓ anticipo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{venta.cantidad_m3} m³</TableCell>
                        <TableCell className="text-right font-semibold">${Number(venta.valor_total).toLocaleString('es-CO')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={venta.fuente === 'Zaranda' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200'}>
                            {venta.fuente}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const t = (venta as any).tipo_transaccion || 'Venta';
                            const cls =
                              t === 'Donación'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : t === 'Transferencia'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-green-50 text-green-700 border-green-200';
                            return <Badge variant="outline" className={cls}>{t}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{venta.concepto || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(venta)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteVenta.mutate(venta.id)}
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

export default Ventas;
