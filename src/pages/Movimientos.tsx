import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, ArrowLeftRight, Mountain, Truck, CalendarIcon, Loader2, Edit, Trash2, Filter, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMovimientos, useCreateMovimiento, useUpdateMovimiento, useDeleteMovimiento } from '@/hooks/useMovimientos';
import { usePlacas } from '@/hooks/useVolquetas';
import {
  calcularM3PorMovimiento,
  DESTINO_ALMACEN_GRANZON,
  DESTINO_ALMACEN_TIERRA,
} from '@/lib/volquetas';
import { validarPlaca } from '@/lib/placas';
import { cn } from '@/lib/utils';

const MINAS = [
  'MINA ROZO',
  'MINA MARLEN TINJACA',
  'MINA SOTO',
  'MINA TINJACA',
  'MINA GLADIS',
];

const SILICES = ['Silice A - Peña', 'Silice B - Pozo', 'Silice C - Arena Fina'];

// Función para obtener los orígenes disponibles según el tipo de sílice
// Trituradora y Clasificadora son orígenes de retorno: el material vuelve a la
// zaranda. Aplican a los tres sílices.
const getOrigenesDisponibles = (_silice: string): string[] => {
  return ['Punto de excavación', 'Zaranda', 'Trituradora', 'Clasificadora'];
};

// Función para obtener los destinos disponibles según el tipo de sílice y origen
// El granzón lo generan las tres máquinas (zaranda, trituradora y clasificadora)
// y se lleva a su patio; la tierra sale del frente de excavación.
const getDestinosDisponibles = (silice: string, origen: string): string[] => {
  // Retorno a zaranda o salida del granzón que produce la máquina
  if (origen === 'Trituradora' || origen === 'Clasificadora') {
    return ['Zaranda', DESTINO_ALMACEN_GRANZON];
  }

  if (silice === 'Silice A - Peña') {
    // Silice A - Peña: desde punto de excavación va a Zaranda o al patio de tierra
    if (origen === 'Punto de excavación') {
      return ['Zaranda', DESTINO_ALMACEN_TIERRA];
    }
    // Silice A - Peña: desde Zaranda va a Trituradora, Clasificadora o Repaso
    if (origen === 'Zaranda') {
      return ['Trituradora', 'Clasificadora', 'Repaso', 'Revolver', DESTINO_ALMACEN_GRANZON];
    }
  } else if (silice === 'Silice B - Pozo' || silice === 'Silice C - Arena Fina') {
    // Desde punto de excavación va a Zaranda, Trituradora o al patio de tierra
    if (origen === 'Punto de excavación') {
      return ['Zaranda', 'Trituradora', DESTINO_ALMACEN_TIERRA];
    }
    // Desde Zaranda va a Trituradora, Clasificadora o Repaso
    if (origen === 'Zaranda') {
      return ['Trituradora', 'Clasificadora', 'Repaso', DESTINO_ALMACEN_GRANZON];
    }
  }
  return [];
};

const Movimientos = () => {
  const { data: movimientos = [], isLoading, error } = useMovimientos();
  const { data: placas = [] } = usePlacas();
  const createMovimiento = useCreateMovimiento();
  const updateMovimiento = useUpdateMovimiento();
  const deleteMovimiento = useDeleteMovimiento();

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openPlaca, setOpenPlaca] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [placaSearch, setPlacaSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingMultiple, setIsAddingMultiple] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date(),
    mina: '',
    silice: '',
    placa: '',
    origen: '',
    destino: '',
    cantidad_movimientos: '',
    notas: '',
  });

  // Filtros avanzados
  const [filterMina, setFilterMina] = useState('');
  const [filterSilice, setFilterSilice] = useState('');
  const [filterOrigen, setFilterOrigen] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState<Date | null>(null);
  const [filterFechaFin, setFilterFechaFin] = useState<Date | null>(null);
  const [openFilterCalendars, setOpenFilterCalendars] = useState({ inicio: false, fin: false });

  const filteredPlacas = placas.filter(placa =>
    placa.toLowerCase().includes(placaSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mina || !formData.silice || !formData.placa || !formData.origen || !formData.destino || !formData.cantidad_movimientos) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (!validarPlaca(formData.placa)) {
      toast.error(`Placa "${formData.placa}" inválida: debe ser 3 letras y 3 números, ej. SWR157.`);
      return;
    }

    const movimientoData = {
      fecha: format(formData.fecha, 'yyyy-MM-dd'),
      mina: formData.mina,
      silice: formData.silice,
      placa: formData.placa,
      origen: formData.origen,
      destino: formData.destino,
      cantidad_movimientos: parseInt(formData.cantidad_movimientos),
      notas: formData.notas || null,
    };

    if (editingId) {
      // Modo edición: guardar y cerrar
      updateMovimiento.mutate(
        { id: editingId, movimiento: movimientoData },
        {
          onSuccess: () => {
            setFormData({ fecha: new Date(), mina: '', silice: '', placa: '', origen: '', destino: '', cantidad_movimientos: '', notas: '' });
            setPlacaSearch('');
            setShowForm(false);
            setEditingId(null);
            setIsAddingMultiple(false);
          }
        }
      );
    } else if (isAddingMultiple) {
      // Modo agregar múltiple: guardar y limpiar solo placa y cantidad
      createMovimiento.mutate(movimientoData, {
        onSuccess: () => {
          // Mantener todos los campos excepto placa, cantidad_movimientos y notas
          setFormData(prev => ({
            ...prev,
            placa: '',
            cantidad_movimientos: '',
            notas: '',
          }));
          setPlacaSearch('');
          toast.success('Movimiento registrado. Puedes agregar otro.');
        }
      });
    } else {
      // Modo normal: guardar y cerrar
      createMovimiento.mutate(movimientoData, {
        onSuccess: () => {
          setFormData({ fecha: new Date(), mina: '', silice: '', placa: '', origen: '', destino: '', cantidad_movimientos: '', notas: '' });
          setPlacaSearch('');
          setShowForm(false);
          setIsAddingMultiple(false);
        }
      });
    }
  };

  const handleEdit = (mov: typeof movimientos[0]) => {
    setEditingId(mov.id);
    setFormData({
      // 'T00:00:00' fuerza hora local: sin él, new Date('2026-07-15') se parsea
      // como medianoche UTC y al guardar con format() la fecha retrocede un día.
      fecha: new Date(mov.fecha + 'T00:00:00'),
      mina: mov.mina,
      silice: mov.silice,
      placa: mov.placa,
      origen: mov.origen,
      destino: mov.destino,
      cantidad_movimientos: mov.cantidad_movimientos.toString(),
      notas: mov.notas || '',
    });
    setShowForm(true);
    // Scroll automático hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAddingMultiple(false);
    setFormData({ fecha: new Date(), mina: '', silice: '', placa: '', origen: '', destino: '', cantidad_movimientos: '', notas: '' });
    setPlacaSearch('');
    setShowForm(false);
  };

  const aplicarFiltros = (data: typeof movimientos) => {
    return data.filter(mov => {
      // Filtro de búsqueda rápida
      const searchMatch =
        mov.mina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.silice.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.destino.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtros avanzados
      const minaMatch = !filterMina || mov.mina === filterMina;
      const siliceMatch = !filterSilice || mov.silice === filterSilice;
      const origenMatch = !filterOrigen || mov.origen === filterOrigen;
      const destinoMatch = !filterDestino || mov.destino === filterDestino;
      const placaMatch = !filterPlaca || mov.placa.toLowerCase().includes(filterPlaca.toLowerCase());

      const fecha = new Date(mov.fecha + 'T00:00:00');
      const fechaMatch =
        (!filterFechaInicio || fecha >= filterFechaInicio) &&
        (!filterFechaFin || fecha <= filterFechaFin);

      return searchMatch && minaMatch && siliceMatch && origenMatch && destinoMatch && placaMatch && fechaMatch;
    });
  };

  const filteredMovimientos = aplicarFiltros(movimientos);

  const exportarExcel = () => {
    const datos = filteredMovimientos.map(m => {
      const resultado = calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino);
      return {
        'Fecha': m.fecha,
        'Mina': m.mina,
        'Sílice': m.silice,
        'Placa': m.placa,
        'Origen': m.origen,
        'Destino': m.destino,
        'Cantidad Movimientos': m.cantidad_movimientos,
        'm³ Producidos': resultado ? (resultado.m3Producidos * m.cantidad_movimientos).toFixed(2) : '',
        'Notas': m.notas || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `movimientos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getMinaBadge = (mina: string) => {
    const colors: Record<string, string> = {
      'MINA ROZO': 'bg-amber-100 text-amber-700 border-amber-200',
      'MINA MARLEN TINJACA': 'bg-purple-100 text-purple-700 border-purple-200',
      'MINA SOTO': 'bg-blue-100 text-blue-700 border-blue-200',
      'MINA TINJACA': 'bg-green-100 text-green-700 border-green-200',
      'MINA GLADIS': 'bg-pink-100 text-pink-700 border-pink-200',
    };
    return (
      <Badge variant="outline" className={`${colors[mina] || 'bg-gray-100 text-gray-700'} gap-1`}>
        <Mountain className="h-3 w-3" />
        {mina}
      </Badge>
    );
  };

  const getSiliceBadge = (silice: string) => {
    const isA = silice.includes('A');
    return (
      <Badge variant="outline" className={isA ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-cyan-100 text-cyan-700 border-cyan-200'}>
        {silice}
      </Badge>
    );
  };

  const getOrigenBadge = (origen: string) => {
    const colors: Record<string, string> = {
      'Punto de excavación': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Zaranda': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Trituradora': 'bg-slate-100 text-slate-700 border-slate-200',
      'Clasificadora': 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return (
      <Badge variant="outline" className={colors[origen] || 'bg-gray-100 text-gray-700'}>
        {origen}
      </Badge>
    );
  };

  const getDestinoBadge = (destino: string) => {
    const colors: Record<string, string> = {
      'Trituradora': 'bg-slate-100 text-slate-700 border-slate-200',
      'Clasificadora': 'bg-teal-100 text-teal-700 border-teal-200',
      'Zaranda': 'bg-violet-100 text-violet-700 border-violet-200',
      'Repaso': 'bg-orange-100 text-orange-700 border-orange-200',
      'Revolver': 'bg-pink-100 text-pink-700 border-pink-200',
      [DESTINO_ALMACEN_TIERRA]: 'bg-amber-100 text-amber-800 border-amber-200',
      [DESTINO_ALMACEN_GRANZON]: 'bg-stone-200 text-stone-700 border-stone-300',
    };
    return (
      <Badge variant="outline" className={colors[destino] || 'bg-gray-100 text-gray-700'}>
        {destino}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar movimientos: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Movimientos Internos</h1>
          <p className="text-muted-foreground mt-1">Registra movimientos de material entre áreas</p>
        </div>
        <Button onClick={() => {
          setShowForm(!showForm);
          if (showForm) {
            setIsAddingMultiple(false);
            setEditingId(null);
            setFormData({ fecha: new Date(), mina: '', silice: '', placa: '', origen: '', destino: '', cantidad_movimientos: '', notas: '' });
            setPlacaSearch('');
          }
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mina */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Mina</Label>
              <Select value={filterMina} onValueChange={setFilterMina}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {MINAS.map((mina) => (
                    <SelectItem key={mina} value={mina}>{mina}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sílice */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Sílice</Label>
              <Select value={filterSilice} onValueChange={setFilterSilice}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {SILICES.map((silice) => (
                    <SelectItem key={silice} value={silice}>{silice}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origen */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Origen</Label>
              <Select value={filterOrigen} onValueChange={setFilterOrigen}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Punto de excavación">Punto de excavación</SelectItem>
                  <SelectItem value="Zaranda">Zaranda</SelectItem>
                  <SelectItem value="Trituradora">Trituradora</SelectItem>
                  <SelectItem value="Clasificadora">Clasificadora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Destino</Label>
              <Select value={filterDestino} onValueChange={setFilterDestino}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trituradora">Trituradora</SelectItem>
                  <SelectItem value="Clasificadora">Clasificadora</SelectItem>
                  <SelectItem value="Zaranda">Zaranda</SelectItem>
                  <SelectItem value="Repaso">Repaso</SelectItem>
                  <SelectItem value="Revolver">Revolver</SelectItem>
                  <SelectItem value={DESTINO_ALMACEN_TIERRA}>{DESTINO_ALMACEN_TIERRA}</SelectItem>
                  <SelectItem value={DESTINO_ALMACEN_GRANZON}>{DESTINO_ALMACEN_GRANZON}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Placa */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Placa</Label>
              <Input
                placeholder="Buscar placa..."
                value={filterPlaca}
                onChange={(e) => setFilterPlaca(e.target.value)}
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
                  setFilterMina('');
                  setFilterSilice('');
                  setFilterOrigen('');
                  setFilterDestino('');
                  setFilterPlaca('');
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Mountain className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700">Minas Activas</p>
              <p className="text-2xl font-bold text-amber-800">{new Set(filteredMovimientos.map(m => m.mina)).size}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Volquetas</p>
              <p className="text-2xl font-bold text-blue-800">{new Set(filteredMovimientos.map(m => m.placa)).size}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">Movimientos</p>
              <p className="text-2xl font-bold text-green-800">{filteredMovimientos.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-purple-50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">m³ Producidos</p>
              <p className="text-2xl font-bold text-purple-800">
                {filteredMovimientos.reduce((sum, m) => {
                  const resultado = calcularM3PorMovimiento(m.placa, m.silice, m.origen, m.destino);
                  return sum + (resultado.m3Producidos * m.cantidad_movimientos);
                }, 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{editingId ? 'Editar Movimiento' : 'Registrar Movimiento'}</CardTitle>
                <CardDescription>{editingId ? 'Actualiza los datos del movimiento' : 'Complete los datos del movimiento interno'}</CardDescription>
              </div>
              {!editingId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddingMultiple(!isAddingMultiple)}
                  className="gap-2 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {isAddingMultiple ? 'Cancelar modo múltiple' : 'Agregar otro movimiento'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.fecha, "PPP", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, fecha: date });
                          setOpenCalendar(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mina">Mina *</Label>
                <Select
                  value={formData.mina}
                  onValueChange={(value) => setFormData({ ...formData, mina: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione mina" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINAS.map((mina) => (
                      <SelectItem key={mina} value={mina}>{mina}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="silice">Sílice *</Label>
                <Select
                  value={formData.silice}
                  onValueChange={(value) => {
                    // Al cambiar sílice, verificar si el origen actual es válido
                    const nuevosOrigenes = getOrigenesDisponibles(value);
                    const origenValido = nuevosOrigenes.includes(formData.origen);
                    // Si el origen no es válido, limpiar origen y destino
                    // Si el origen es válido, verificar si el destino sigue siendo válido
                    if (!origenValido) {
                      setFormData({ ...formData, silice: value, origen: '', destino: '' });
                    } else {
                      const nuevosDestinos = getDestinosDisponibles(value, formData.origen);
                      const destinoValido = nuevosDestinos.includes(formData.destino);
                      setFormData({ 
                        ...formData, 
                        silice: value, 
                        destino: destinoValido ? formData.destino : '' 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sílice" />
                  </SelectTrigger>
                  <SelectContent>
                    {SILICES.map((silice) => (
                      <SelectItem key={silice} value={silice}>{silice}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="placa">Placa *</Label>
                <Popover open={openPlaca} onOpenChange={setOpenPlaca}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPlaca}
                      className={cn(
                        "w-full justify-between font-normal",
                        formData.placa && !validarPlaca(formData.placa) && "border-red-400 text-red-600"
                      )}
                    >
                      {formData.placa || "Seleccione placa..."}
                      <Truck className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover border shadow-lg" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar placa..." 
                        value={placaSearch}
                        onValueChange={setPlacaSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró la placa.</CommandEmpty>
                        <CommandGroup>
                          {filteredPlacas.map((placa) => (
                            <CommandItem
                              key={placa}
                              value={placa}
                              onSelect={() => {
                                setFormData({ ...formData, placa });
                                setOpenPlaca(false);
                                setPlacaSearch('');
                              }}
                              className="cursor-pointer"
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              {placa}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.placa && !validarPlaca(formData.placa) && (
                  <p className="text-xs text-red-600">Placa inválida: use 3 letras y 3 números</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="origen">Origen *</Label>
                <Select
                  value={formData.origen}
                  onValueChange={(value) => {
                    // Al cambiar origen, verificar si el destino actual es válido
                    const nuevosDestinos = getDestinosDisponibles(formData.silice, value);
                    const destinoValido = nuevosDestinos.includes(formData.destino);
                    setFormData({
                      ...formData,
                      origen: value,
                      // Si el origen solo admite un destino (Trituradora y
                      // Clasificadora solo van a Zaranda), se elige solo.
                      destino: destinoValido
                        ? formData.destino
                        : nuevosDestinos.length === 1 ? nuevosDestinos[0] : '',
                    });
                  }}
                  disabled={!formData.silice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.silice ? "Seleccione origen" : "Primero seleccione sílice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getOrigenesDisponibles(formData.silice).map((origen) => (
                      <SelectItem key={origen} value={origen}>{origen}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destino">Destino *</Label>
                <Select
                  value={formData.destino}
                  onValueChange={(value) => setFormData({ ...formData, destino: value })}
                  disabled={!formData.silice || !formData.origen}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.silice ? "Primero seleccione sílice" : 
                      !formData.origen ? "Primero seleccione origen" : 
                      "Seleccione destino"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {getDestinosDisponibles(formData.silice, formData.origen).map((destino) => (
                      <SelectItem key={destino} value={destino}>{destino}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cantidad_movimientos">Cantidad de Movimientos *</Label>
                <Input
                  id="cantidad_movimientos"
                  type="number"
                  min="1"
                  placeholder="Ej: 3"
                  value={formData.cantidad_movimientos}
                  onChange={(e) => setFormData({ ...formData, cantidad_movimientos: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas adicionales</Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones..."
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3">
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMovimiento.isPending || updateMovimiento.isPending}>
                    {(createMovimiento.isPending || updateMovimiento.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : editingId ? (
                      'Actualizar Movimiento'
                    ) : isAddingMultiple ? (
                      'Guardar y agregar otro'
                    ) : (
                      'Guardar Movimiento'
                    )}
                  </Button>
                </div>

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
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar movimientos..."
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
                    <TableHead>Mina</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-center">Cantidad Movimientos</TableHead>
                    <TableHead className="text-right">m³ Producidos</TableHead>
                    <TableHead>Arena Producida</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovimientos.map((mov) => {
                      const resultado = calcularM3PorMovimiento(mov.placa, mov.silice, mov.origen, mov.destino);
                      const siliceCambio = resultado.siliceResultante !== mov.silice;
                      return (
                        <TableRow key={mov.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{mov.fecha}</TableCell>
                          <TableCell>{getMinaBadge(mov.mina)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getSiliceBadge(mov.silice)}
                              {siliceCambio && (
                                <span className="text-xs text-green-600 font-medium">
                                  → {resultado.siliceResultante.replace('Silice ', '')}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 gap-1">
                              <Truck className="h-3 w-3" />
                              {mov.placa}
                            </Badge>
                          </TableCell>
                          <TableCell>{getOrigenBadge(mov.origen)}</TableCell>
                          <TableCell>{getDestinoBadge(mov.destino)}</TableCell>
                          <TableCell className="text-center font-semibold text-blue-600">
                            {mov.cantidad_movimientos}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {(resultado.m3Producidos * mov.cantidad_movimientos).toFixed(2)} m³
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={
                                  resultado.tipoPF === 'Peña'
                                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                                    : resultado.tipoPF === 'Pozo'
                                    ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
                                    : 'bg-stone-100 text-stone-700 border-stone-200'
                                }
                              >
                                {resultado.tipoPF}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                PF: {(resultado.porcentajePF * 100).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(mov)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMovimiento.mutate(mov.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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

export default Movimientos;
