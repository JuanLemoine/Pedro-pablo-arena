import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Truck, Trash2, Save, Check, ChevronsUpDown, ArrowLeft, CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAcopios, useCreateAcopios } from '@/hooks/useAcopios';
import { usePlacas } from '@/hooks/useVolquetas';
import { getCapacidadVolqueta, calcularM3Producidos } from '@/lib/volquetas';

interface AcopioForm {
  fecha: Date;
  fuente: string;
  silice: string;
  placa: string;
  cantidadViajes: string;
}

const getEmptyForm = (): AcopioForm => ({
  fecha: new Date(),
  fuente: '',
  silice: '',
  placa: '',
  cantidadViajes: '',
});

const Acopio = () => {
  const navigate = useNavigate();
  const { data: acopios = [], isLoading, error } = useAcopios();
  const { data: placas = [] } = usePlacas();
  const createAcopios = useCreateAcopios();
  
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [acopiosEnCurso, setAcopiosEnCurso] = useState<AcopioForm[]>([getEmptyForm()]);
  const [openPopovers, setOpenPopovers] = useState<boolean[]>([false]);
  const [openCalendars, setOpenCalendars] = useState<boolean[]>([false]);

  const agregarFilaAcopio = () => {
    setAcopiosEnCurso([...acopiosEnCurso, getEmptyForm()]);
    setOpenPopovers([...openPopovers, false]);
    setOpenCalendars([...openCalendars, false]);
  };

  const eliminarFilaAcopio = (index: number) => {
    if (acopiosEnCurso.length > 1) {
      setAcopiosEnCurso(acopiosEnCurso.filter((_, i) => i !== index));
      setOpenPopovers(openPopovers.filter((_, i) => i !== index));
      setOpenCalendars(openCalendars.filter((_, i) => i !== index));
    }
  };

  const actualizarAcopio = (index: number, campo: keyof AcopioForm, valor: string | Date) => {
    const nuevosAcopios = [...acopiosEnCurso];
    nuevosAcopios[index] = { ...nuevosAcopios[index], [campo]: valor };
    setAcopiosEnCurso(nuevosAcopios);
  };

  const setPopoverOpen = (index: number, open: boolean) => {
    const newOpenPopovers = [...openPopovers];
    newOpenPopovers[index] = open;
    setOpenPopovers(newOpenPopovers);
  };

  const setCalendarOpen = (index: number, open: boolean) => {
    const newOpenCalendars = [...openCalendars];
    newOpenCalendars[index] = open;
    setOpenCalendars(newOpenCalendars);
  };

  const validarAcopio = (acopio: AcopioForm): boolean => {
    return !!(acopio.fuente && acopio.silice && acopio.placa && acopio.cantidadViajes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const acopiosValidos = acopiosEnCurso.filter(validarAcopio);
    
    if (acopiosValidos.length === 0) {
      toast.error('Por favor complete todos los campos requeridos en al menos un registro');
      return;
    }

    const acopiosInvalidos = acopiosEnCurso.length - acopiosValidos.length;
    if (acopiosInvalidos > 0) {
      toast.warning(`${acopiosInvalidos} registro(s) no serán guardados por datos incompletos`);
    }

    const nuevosAcopios = acopiosValidos.map((acopio) => ({
      fecha: format(acopio.fecha, 'yyyy-MM-dd'),
      fuente: acopio.fuente,
      silice: acopio.silice,
      placa: acopio.placa,
      cantidad_viajes: parseInt(acopio.cantidadViajes),
    }));

    createAcopios.mutate(nuevosAcopios, {
      onSuccess: () => {
        setAcopiosEnCurso([getEmptyForm()]);
        setOpenPopovers([false]);
        setOpenCalendars([false]);
        setShowForm(false);
      }
    });
  };

  const filteredAcopios = acopios.filter(acopio =>
    acopio.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acopio.fuente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acopio.silice.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFuenteBadgeClass = (fuente: string) => {
    switch (fuente) {
      case 'Zaranda':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Trituradora':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Clasificadora':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar acopios: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ventas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Acopio</h1>
            <p className="text-muted-foreground mt-1">Registra los viajes de las volquetas de la empresa</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-card animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Acopio</CardTitle>
            <CardDescription>Registre los viajes realizados por las volquetas de la empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Encabezados de columnas */}
              <div className="hidden lg:grid lg:grid-cols-6 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div>Fecha *</div>
                <div>Fuente *</div>
                <div>Sílice *</div>
                <div>Placa Volqueta *</div>
                <div>Cantidad de Viajes *</div>
                <div></div>
              </div>

              {/* Filas de acopios */}
              {acopiosEnCurso.map((acopio, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Fecha *</Label>
                    <Popover open={openCalendars[index]} onOpenChange={(open) => setCalendarOpen(index, open)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !acopio.fecha && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(acopio.fecha, "dd/MM/yy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={acopio.fecha}
                          onSelect={(date) => {
                            if (date) {
                              actualizarAcopio(index, 'fecha', date);
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
                    <Label className="lg:hidden text-xs">Fuente *</Label>
                    <Select
                      value={acopio.fuente}
                      onValueChange={(value) => actualizarAcopio(index, 'fuente', value)}
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
                    <Label className="lg:hidden text-xs">Sílice *</Label>
                    <Select
                      value={acopio.silice}
                      onValueChange={(value) => actualizarAcopio(index, 'silice', value)}
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
                    <Label className="lg:hidden text-xs">Placa Volqueta *</Label>
                    <Popover open={openPopovers[index]} onOpenChange={(open) => setPopoverOpen(index, open)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPopovers[index]}
                          className="w-full justify-between font-normal"
                        >
                          {acopio.placa || "Seleccionar placa..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar placa..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la placa.</CommandEmpty>
                            <CommandGroup>
                              {placas.map((placa) => (
                                <CommandItem
                                  key={placa}
                                  value={placa}
                                  onSelect={(currentValue) => {
                                    actualizarAcopio(index, 'placa', currentValue.toUpperCase());
                                    setPopoverOpen(index, false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      acopio.placa === placa ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {placa}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="lg:hidden text-xs">Cantidad de Viajes *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="1"
                      value={acopio.cantidadViajes}
                      onChange={(e) => actualizarAcopio(index, 'cantidadViajes', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarFilaAcopio(index)}
                      disabled={acopiosEnCurso.length === 1}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={agregarFilaAcopio} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar otro registro
                </Button>
                <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setAcopiosEnCurso([getEmptyForm()]);
                    setOpenPopovers([false]);
                    setOpenCalendars([false]);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2" disabled={createAcopios.isPending}>
                    {createAcopios.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar {acopiosEnCurso.length > 1 ? `(${acopiosEnCurso.length})` : 'Registro'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Resumen de producción */}
      {!isLoading && acopios.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">Total Viajes</p>
              <p className="text-2xl font-bold text-amber-800">
                {acopios.reduce((sum, a) => sum + a.cantidad_viajes, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">m³ Producidos</p>
              <p className="text-2xl font-bold text-blue-800">
                {calcularM3Producidos(acopios).toLocaleString()} m³
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-700">Registros</p>
              <p className="text-2xl font-bold text-green-800">{acopios.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Historial de Acopio
              </CardTitle>
              <CardDescription>{filteredAcopios.length} registros encontrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, fuente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
                    <TableHead>Fuente</TableHead>
                    <TableHead>Sílice</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-right">Viajes</TableHead>
                    <TableHead className="text-right">Capacidad</TableHead>
                    <TableHead className="text-right">m³ Producidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcopios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay registros de acopio
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAcopios.map((acopio) => {
                      const capacidad = getCapacidadVolqueta(acopio.placa);
                      const m3Producidos = capacidad * acopio.cantidad_viajes;
                      return (
                        <TableRow key={acopio.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{acopio.fecha}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getFuenteBadgeClass(acopio.fuente)}>
                              {acopio.fuente}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={acopio.silice.includes('A') ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}>
                              {acopio.silice}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{acopio.placa}</TableCell>
                          <TableCell className="text-right font-semibold">{acopio.cantidad_viajes}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{capacidad} m³</TableCell>
                          <TableCell className="text-right font-bold text-primary">{m3Producidos.toLocaleString()} m³</TableCell>
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

export default Acopio;
