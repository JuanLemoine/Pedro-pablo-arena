import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Truck, Trash2, Save, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PLACAS_EMPRESA = [
  'SAB643', 'OAJ577', 'ELJ809', 'CQN427', 'ACJ359',
  'FBH108', 'SBC690', 'SWQ244', 'WCS071', 'AAD005',
  'XGJ399', 'SKH366', 'SVM306', 'SNZ091', 'XKJ180',
  'ATA644', 'IYB806', 'XKJ802', 'SNE194', 'SPM693',
  'MBG720', 'XFJ040', 'SBE944', 'AQJ946'
];

interface Acopio {
  id: number;
  fecha: string;
  fuente: string;
  silice: string;
  placa: string;
  cantidadViajes: number;
}

interface AcopioForm {
  fuente: string;
  silice: string;
  placa: string;
  cantidadViajes: string;
}

const acopiosIniciales: Acopio[] = [
  { id: 1, fecha: '2024-01-15', fuente: 'Zaranda', silice: 'Silice A - Peña', placa: 'SAB643', cantidadViajes: 5 },
  { id: 2, fecha: '2024-01-14', fuente: 'Trituradora', silice: 'Silice B - Pozo', placa: 'OAJ577', cantidadViajes: 3 },
  { id: 3, fecha: '2024-01-14', fuente: 'Clasificadora', silice: 'Silice A - Peña', placa: 'ELJ809', cantidadViajes: 7 },
];

const emptyForm: AcopioForm = {
  fuente: '',
  silice: '',
  placa: '',
  cantidadViajes: '',
};

const Acopio = () => {
  const navigate = useNavigate();
  const [acopios, setAcopios] = useState<Acopio[]>(acopiosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [acopiosEnCurso, setAcopiosEnCurso] = useState<AcopioForm[]>([{ ...emptyForm }]);
  const [openPopovers, setOpenPopovers] = useState<boolean[]>([false]);

  const agregarFilaAcopio = () => {
    setAcopiosEnCurso([...acopiosEnCurso, { ...emptyForm }]);
    setOpenPopovers([...openPopovers, false]);
  };

  const eliminarFilaAcopio = (index: number) => {
    if (acopiosEnCurso.length > 1) {
      setAcopiosEnCurso(acopiosEnCurso.filter((_, i) => i !== index));
      setOpenPopovers(openPopovers.filter((_, i) => i !== index));
    }
  };

  const actualizarAcopio = (index: number, campo: keyof AcopioForm, valor: string) => {
    const nuevosAcopios = [...acopiosEnCurso];
    nuevosAcopios[index] = { ...nuevosAcopios[index], [campo]: valor };
    setAcopiosEnCurso(nuevosAcopios);
  };

  const setPopoverOpen = (index: number, open: boolean) => {
    const newOpenPopovers = [...openPopovers];
    newOpenPopovers[index] = open;
    setOpenPopovers(newOpenPopovers);
  };

  const validarAcopio = (acopio: AcopioForm): boolean => {
    return !!(acopio.fuente && acopio.silice && acopio.placa && acopio.cantidadViajes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const acopiosValidos = acopiosEnCurso.filter(validarAcopio);
    
    if (acopiosValidos.length === 0) {
      toast.error('Por favor complete todos los campos requeridos en al menos un registro');
      return;
    }

    const acopiosInvalidos = acopiosEnCurso.length - acopiosValidos.length;
    if (acopiosInvalidos > 0) {
      toast.warning(`${acopiosInvalidos} registro(s) no fueron guardados por datos incompletos`);
    }

    const nuevosAcopios: Acopio[] = acopiosValidos.map((acopio, index) => ({
      id: acopios.length + index + 1,
      fecha: new Date().toISOString().split('T')[0],
      fuente: acopio.fuente,
      silice: acopio.silice,
      placa: acopio.placa,
      cantidadViajes: parseInt(acopio.cantidadViajes),
    }));

    setAcopios([...nuevosAcopios, ...acopios]);
    setAcopiosEnCurso([{ ...emptyForm }]);
    setOpenPopovers([false]);
    setShowForm(false);
    toast.success(`${acopiosValidos.length} registro(s) de acopio guardado(s) exitosamente`);
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
              <div className="hidden lg:grid lg:grid-cols-5 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div>Fuente *</div>
                <div>Sílice *</div>
                <div>Placa Volqueta *</div>
                <div>Cantidad de Viajes *</div>
                <div></div>
              </div>

              {/* Filas de acopios */}
              {acopiosEnCurso.map((acopio, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg">
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
                              {PLACAS_EMPRESA.map((placa) => (
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
                    setAcopiosEnCurso([{ ...emptyForm }]);
                    setOpenPopovers([false]);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar {acopiosEnCurso.length > 1 ? `(${acopiosEnCurso.length})` : 'Registro'}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Sílice</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead className="text-right">Viajes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcopios.map((acopio) => (
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
                    <TableCell className="text-right font-semibold">{acopio.cantidadViajes}</TableCell>
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

export default Acopio;
